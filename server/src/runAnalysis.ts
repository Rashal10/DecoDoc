import { nanoid } from "nanoid";
import type { Analysis, Paper } from "@decodoc/shared";
import { analyzePaper as generatePaperAnalysis, embedText, extractMetadataFromText } from "./ai";
import { resolveCitationNetwork } from "./citations";
import { citationsAreFresh } from "./citationFreshness";
import {
  claimAnalysisJob,
  claimJobForResume,
  failStaleAnalysisJobs,
  findReusableReservation,
  getAnalysis,
  getAnalysisJob,
  getAnalysisRecord,
  getPaper,
  listResumableJobIds,
  markAnalysisJob,
  releaseAnalysisUsage,
  reserveAnalysisUsage,
  saveAnalysis,
  toPublicPaper,
  touchAnalysisJob,
  upsertPaper,
  type StoredPaper,
} from "./db";
import { HttpError } from "./httpError";
import { isDatabaseReady } from "./init-db";
import { inputTypeForStoredPaper, isJobTracked, jobResultsOpen, noteJobRunning, noteJobStopped } from "./jobState";
import { assertAnalyzePairing, validateResolvedArxivPaper } from "./paperIdentity";
import { ANONYMOUS_LIMIT, AUTH_DAILY_LIMIT } from "./quota";
import { enrichSemanticScholar, fetchArxiv, fetchArxivPdfExcerpt, fetchDoi, paperFromText } from "./sources";

export type AnalysisAuth = {
  userId?: string;
  sessionId?: string;
};

export type AnalysisOutcome =
  | { status: "ready"; paper: Paper; analysis: Analysis }
  | { status: "pending"; jobId: string };

function ownershipFor(inputType: string, auth: AnalysisAuth) {
  if (inputType === "arxiv" || inputType === "doi") {
    return { visibility: "public" as const, ownerUserId: null, ownerSessionId: null };
  }
  if (!auth.userId && !auth.sessionId) {
    throw new HttpError(401, "SESSION_REQUIRED", "Session required.");
  }
  if (auth.userId) {
    return { visibility: "private" as const, ownerUserId: auth.userId, ownerSessionId: null };
  }
  return { visibility: "private" as const, ownerUserId: null, ownerSessionId: auth.sessionId ?? null };
}

function textForEmbedding(paper: Paper): string {
  const text = `${paper.title}\n${paper.abstract}`;
  return text.length > 8_000 ? text.slice(0, 8_000) : text;
}

async function resolvePaper(inputType: string, value: string, title?: string): Promise<Paper> {
  if (inputType === "arxiv") return enrichSemanticScholar(await fetchArxiv(value));
  if (inputType === "doi") return enrichSemanticScholar(await fetchDoi(value));
  if (inputType === "pdf") {
    return {
      id: `local:${nanoid(10)}`,
      title: title || "Uploaded PDF",
      authors: ["Unknown"],
      abstract: value,
      venue: "Uploaded PDF",
    };
  }
  return paperFromText(value, title);
}

async function paperForModel(paper: Paper, inputType: string): Promise<Paper> {
  if (inputType !== "arxiv" || !paper.arxivId) return paper;
  try {
    const excerpt = await fetchArxivPdfExcerpt(paper.arxivId);
    if (!excerpt) return paper;
    return {
      ...paper,
      abstract: `${paper.abstract}\n\nPaper text excerpt:\n${excerpt}`.slice(0, 28_000),
    };
  } catch (error) {
    console.warn("arXiv PDF excerpt skipped:", error);
    return paper;
  }
}

async function withCitations(paper: Paper, analysis: Analysis): Promise<Analysis> {
  return { ...analysis, citations: await resolveCitationNetwork(paper) };
}

function quotaError(auth: AnalysisAuth, used: number): HttpError {
  if (auth.userId) {
    return new HttpError(
      429,
      "DAILY_LIMIT",
      `You have reached your daily limit of ${AUTH_DAILY_LIMIT} analyses. Try again tomorrow.`,
      { used, limit: AUTH_DAILY_LIMIT, remaining: 0 }
    );
  }
  return new HttpError(401, "LOGIN_REQUIRED", "You have used your 3 free analyses. Sign in to continue.", {
    used,
    limit: ANONYMOUS_LIMIT,
    remaining: 0,
  });
}

async function enrichPdf(paper: StoredPaper): Promise<StoredPaper> {
  const meta = await extractMetadataFromText(paper.abstract, paper.title);
  return upsertPaper(
    {
      ...toPublicPaper(paper),
      title: meta.title || paper.title,
      authors: meta.authors?.length ? meta.authors : paper.authors,
      year: meta.year ?? paper.year,
      venue: meta.venue || paper.venue,
    },
    {
      visibility: paper.visibility,
      ownerUserId: paper.ownerUserId,
      ownerSessionId: paper.ownerSessionId,
    }
  );
}

async function generateReserved(
  paper: StoredPaper,
  inputType: string,
  modelName: string | undefined,
  auth: AnalysisAuth,
  options?: { resume?: boolean; reservedSince?: Date }
): Promise<Analysis> {
  let usageId: string | null = null;
  try {
    if (options?.resume && options.reservedSince) {
      usageId = await findReusableReservation({
        paperId: paper.id,
        userId: auth.userId ?? null,
        sessionId: auth.sessionId ?? null,
        since: options.reservedSince,
      });
    }
    if (!usageId) {
      const reservation = await reserveAnalysisUsage({
        userId: auth.userId ?? null,
        sessionId: auth.sessionId ?? null,
        paperId: paper.id,
        limit: auth.userId ? AUTH_DAILY_LIMIT : ANONYMOUS_LIMIT,
      });
      if (!reservation.ok) throw quotaError(auth, reservation.used);
      usageId = reservation.id;
    }

    const source = inputType === "pdf" ? await enrichPdf(paper) : paper;
    const modelPaper = await paperForModel(toPublicPaper(source), inputType);
    let analysis = await generatePaperAnalysis(modelPaper, modelName);
    analysis = { ...analysis, paperId: source.id };
    analysis = await withCitations(toPublicPaper(source), analysis);
    assertAnalyzePairing(source, analysis);
    await saveAnalysis(analysis, { citationsFetchedAt: new Date() });
    return analysis;
  } catch (error) {
    if (usageId && jobResultsOpen()) await releaseAnalysisUsage(usageId);
    throw error;
  }
}

async function runGeneration(
  jobId: string,
  paper: StoredPaper,
  inputType: string,
  modelName: string | undefined,
  auth: AnalysisAuth,
  resume = false
): Promise<Analysis> {
  noteJobRunning(jobId);
  const heartbeat = setInterval(() => {
    void touchAnalysisJob(jobId).catch((error) => {
      console.warn("Could not refresh analysis job heartbeat:", error);
    });
  }, 20_000);
  heartbeat.unref();
  try {
    if (!jobResultsOpen()) {
      throw new HttpError(503, "SHUTTING_DOWN", "The server is restarting. The analysis will continue shortly.");
    }
    await markAnalysisJob(jobId, "running");
    const job = await getAnalysisJob(jobId);
    const analysis = await generateReserved(paper, inputType, modelName, auth, {
      resume,
      reservedSince: job?.createdAt,
    });
    if (!jobResultsOpen()) {
      throw new HttpError(503, "SHUTTING_DOWN", "The server is restarting. The analysis will continue shortly.");
    }
    await markAnalysisJob(jobId, "done");
    return analysis;
  } catch (error) {
    if (jobResultsOpen()) {
      const message = error instanceof Error ? error.message : "Analysis failed.";
      await markAnalysisJob(jobId, "failed", message);
    }
    throw error;
  } finally {
    clearInterval(heartbeat);
    noteJobStopped(jobId);
  }
}

async function resumeClaimedJob(jobId: string): Promise<void> {
  if (isJobTracked(jobId) || !jobResultsOpen()) return;
  const claimed = await claimJobForResume(jobId);
  if (!claimed || !jobResultsOpen()) return;
  const paper = await getPaper(claimed.paperId);
  if (!paper) {
    await markAnalysisJob(jobId, "failed", "The paper for this analysis is missing.");
    return;
  }
  const existing = await getAnalysis(paper.id);
  if (existing) {
    await markAnalysisJob(jobId, "done");
    return;
  }
  if (!claimed.ownerUserId && !claimed.ownerSessionId) {
    await markAnalysisJob(jobId, "failed", "This analysis could not be resumed.");
    return;
  }
  await runGeneration(
    jobId,
    paper,
    inputTypeForStoredPaper(paper),
    undefined,
    { userId: claimed.ownerUserId ?? undefined, sessionId: claimed.ownerSessionId ?? undefined },
    true
  );
}

let resumeInFlight = false;
let resumeTimer: NodeJS.Timeout | undefined;

export async function resumeInterruptedJobs(): Promise<void> {
  if (!jobResultsOpen() || resumeInFlight || !isDatabaseReady()) return;
  resumeInFlight = true;
  try {
    await failStaleAnalysisJobs();
    const ids = await listResumableJobIds();
    for (const id of ids) {
      if (!jobResultsOpen()) return;
      try {
        await resumeClaimedJob(id);
      } catch (error) {
        console.error("Could not resume analysis job:", error);
      }
    }
  } finally {
    resumeInFlight = false;
  }
}

export function startJobResumeLoop(): void {
  if (resumeTimer) return;
  void resumeInterruptedJobs().catch((error) => {
    console.error("Could not resume analysis jobs:", error);
  });
  resumeTimer = setInterval(() => {
    void resumeInterruptedJobs().catch((error) => {
      console.error("Could not resume analysis jobs:", error);
    });
  }, 60_000);
  resumeTimer.unref();
}

export function stopJobResumeLoop(): void {
  if (!resumeTimer) return;
  clearInterval(resumeTimer);
  resumeTimer = undefined;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForJob(jobId: string, paperId: string): Promise<Analysis> {
  const started = Date.now();
  while (Date.now() - started < 170_000) {
    const job = await getAnalysisJob(jobId);
    if (!job) throw new HttpError(404, "JOB_NOT_FOUND", "Analysis job not found.");
    if (job.status === "done") {
      const analysis = await getAnalysis(paperId);
      if (!analysis) throw new HttpError(500, "ANALYSIS_MISSING", "The analysis finished without a saved result.");
      return analysis;
    }
    if (job.status === "failed") {
      throw new HttpError(500, "ANALYSIS_FAILED", job.error || "Analysis failed.");
    }
    await sleep(1500);
  }
  throw new HttpError(504, "ANALYSIS_TIMEOUT", "Analysis is still running. Open the paper again in a minute.");
}

export async function loadPaperForReader(paper: StoredPaper): Promise<{ paper: Paper; analysis: Analysis | null }> {
  const record = await getAnalysisRecord(paper.id);
  if (!record) return { paper: toPublicPaper(paper), analysis: null };

  try {
    assertAnalyzePairing(paper, record.analysis);
  } catch {
    return { paper: toPublicPaper(paper), analysis: null };
  }

  if (citationsAreFresh(record.citationsFetchedAt)) {
    return { paper: toPublicPaper(paper), analysis: record.analysis };
  }

  try {
    const analysis = await withCitations(toPublicPaper(paper), record.analysis);
    await saveAnalysis(analysis, { citationsFetchedAt: new Date() });
    return { paper: toPublicPaper(paper), analysis };
  } catch (error) {
    console.warn("Citation refresh skipped:", error);
    return { paper: toPublicPaper(paper), analysis: record.analysis };
  }
}

export async function executeAnalysis(params: {
  inputType: string;
  value: string;
  title?: string;
  modelName?: string;
  asyncMode: boolean;
  auth: AnalysisAuth;
}): Promise<AnalysisOutcome> {
  const ownership = ownershipFor(params.inputType, params.auth);
  const resolved = await resolvePaper(params.inputType, params.value, params.title);
  if (params.inputType === "arxiv") validateResolvedArxivPaper(resolved);

  const embedding = ownership.visibility === "public" ? await embedText(textForEmbedding(resolved)) : undefined;
  const paper = await upsertPaper(resolved, { ...ownership, embedding });

  const cached = await getAnalysis(paper.id);
  if (cached) {
    try {
      assertAnalyzePairing(paper, cached);
      const loaded = await loadPaperForReader(paper);
      if (loaded.analysis) return { status: "ready", paper: loaded.paper, analysis: loaded.analysis };
    } catch (error) {
      console.warn("Discarding mismatched cached analysis:", error);
    }
  }

  const job = await claimAnalysisJob(paper.id, {
    userId: params.auth.userId ?? null,
    sessionId: params.auth.userId ? null : params.auth.sessionId ?? null,
  });

  if (!job.shouldRun) {
    if (params.asyncMode) return { status: "pending", jobId: job.id };
    const analysis = await waitForJob(job.id, paper.id);
    return { status: "ready", paper: toPublicPaper(paper), analysis };
  }

  noteJobRunning(job.id);
  if (params.asyncMode) {
    void runGeneration(job.id, paper, params.inputType, params.modelName, params.auth).catch((error) => {
      console.error("Analysis job failed:", error);
    });
    return { status: "pending", jobId: job.id };
  }

  const analysis = await runGeneration(job.id, paper, params.inputType, params.modelName, params.auth);
  return { status: "ready", paper: toPublicPaper(paper), analysis };
}
