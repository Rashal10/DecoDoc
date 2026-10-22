import { nanoid } from "nanoid";
import type { Analysis, Paper } from "@decodoc/shared";
import { analyzePaper as generatePaperAnalysis, embedText, extractMetadataFromText } from "./ai";
import { resolveCitationNetwork } from "./citations";
import { citationsAreFresh } from "./citationFreshness";
import {
  claimAnalysisJob,
  getAnalysis,
  getAnalysisJob,
  getAnalysisRecord,
  markAnalysisJob,
  releaseAnalysisUsage,
  reserveAnalysisUsage,
  saveAnalysis,
  toPublicPaper,
  upsertPaper,
  type StoredPaper,
} from "./db";
import { HttpError } from "./httpError";
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
  auth: AnalysisAuth
): Promise<Analysis> {
  const reservation = await reserveAnalysisUsage({
    userId: auth.userId ?? null,
    sessionId: auth.sessionId ?? null,
    paperId: paper.id,
    limit: auth.userId ? AUTH_DAILY_LIMIT : ANONYMOUS_LIMIT,
  });
  if (!reservation.ok) throw quotaError(auth, reservation.used);

  try {
    const source = inputType === "pdf" ? await enrichPdf(paper) : paper;
    const modelPaper = await paperForModel(toPublicPaper(source), inputType);
    let analysis = await generatePaperAnalysis(modelPaper, modelName);
    analysis = { ...analysis, paperId: source.id };
    analysis = await withCitations(toPublicPaper(source), analysis);
    assertAnalyzePairing(source, analysis);
    await saveAnalysis(analysis, { citationsFetchedAt: new Date() });
    return analysis;
  } catch (error) {
    await releaseAnalysisUsage(reservation.id);
    throw error;
  }
}

async function runGeneration(
  jobId: string,
  paper: StoredPaper,
  inputType: string,
  modelName: string | undefined,
  auth: AnalysisAuth
): Promise<Analysis> {
  await markAnalysisJob(jobId, "running");
  try {
    const analysis = await generateReserved(paper, inputType, modelName, auth);
    await markAnalysisJob(jobId, "done");
    return analysis;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Analysis failed.";
    await markAnalysisJob(jobId, "failed", message);
    throw error;
  }
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
    userId: ownership.ownerUserId,
    sessionId: ownership.ownerSessionId,
  });

  if (!job.shouldRun) {
    if (params.asyncMode) return { status: "pending", jobId: job.id };
    const analysis = await waitForJob(job.id, paper.id);
    return { status: "ready", paper: toPublicPaper(paper), analysis };
  }

  if (params.asyncMode) {
    void runGeneration(job.id, paper, params.inputType, params.modelName, params.auth).catch((error) => {
      console.error("Analysis job failed:", error);
    });
    return { status: "pending", jobId: job.id };
  }

  const analysis = await runGeneration(job.id, paper, params.inputType, params.modelName, params.auth);
  return { status: "ready", paper: toPublicPaper(paper), analysis };
}
