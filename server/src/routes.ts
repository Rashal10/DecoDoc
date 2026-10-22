import type { Paper } from "@decodoc/shared";
import express from "express";
import multer from "multer";
import { z } from "zod";
import { embedText } from "./ai";
import { config } from "./config";
import { analyzeSchema, resolveRequestedModel } from "./analyzeInput";
import { canReadPaper } from "./paperAccess";
import {
  addBookmark,
  getAnalysisJob,
  getPaper,
  getPaperEmbedding,
  getUserBookmarks,
  isBookmarked,
  listPublicEmbeddedPapers,
  removeBookmark,
  searchPublicByVector,
  syncBookmarks,
} from "./db";
import { getPool, isDatabaseReady } from "./init-db";
import { HttpError } from "./httpError";
import { lookupMatchesPaper } from "./paperIdentity";
import { choosePdfText, extractPdfTextFromBytes, isPdfBuffer, MIN_PDF_TEXT_CHARS, PDF_NO_TEXT_MESSAGE } from "./pdfExtract";
import { getUsageStatus, checkAnalysisQuota } from "./quota";
import { analyzeAccountLimiter, analyzeNetworkLimiter, searchLimiter } from "./rateLimit";
import { executeAnalysis, loadPaperForReader, type AnalysisAuth } from "./runAnalysis";
import { rankPapers, toRelated, toSearchResults } from "./similarity";

export const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxPdfBytes },
});

function readerFrom(req: express.Request): AnalysisAuth {
  return {
    userId: req.authUser?.id,
    sessionId: req.anonymousSession?.id,
  };
}

async function readablePaper(req: express.Request, lookup: string) {
  const paper = await getPaper(lookup);
  if (!paper || !lookupMatchesPaper(lookup, paper) || !canReadPaper(paper, readerFrom(req))) {
    throw new HttpError(404, "NOT_FOUND", "Paper not found.");
  }
  return paper;
}

router.get("/health", async (_req, res) => {
  if (!isDatabaseReady()) {
    return res.json({ ok: true, service: "DecoDoc API", database: false });
  }
  try {
    await getPool().query("select 1 as ok");
    res.json({ ok: true, service: "DecoDoc API", database: true });
  } catch (error) {
    console.error("Health check database failed:", error);
    res.status(503).json({ ok: false, service: "DecoDoc API", database: false });
  }
});

router.get("/me/usage", async (req, res, next) => {
  try {
    res.json(await getUsageStatus(req));
  } catch (error) {
    next(error);
  }
});

async function nearestPublicPapers(
  embedding: number[],
  limit: number,
  excludeId?: string
): Promise<Array<Paper & { score: number }>> {
  const fromVector = await searchPublicByVector(embedding, limit, excludeId);
  if (fromVector) return fromVector;
  return rankPapers(embedding, await listPublicEmbeddedPapers(), excludeId, limit);
}

router.get("/search", searchLimiter, async (req, res, next) => {
  try {
    const q = z.string().trim().min(2).max(300).parse(req.query.q ?? "");
    const embedding = await embedText(q);
    res.json({ results: toSearchResults(await nearestPublicPapers(embedding, 12)) });
  } catch (error) {
    next(error);
  }
});

router.post("/analyze", analyzeAccountLimiter, analyzeNetworkLimiter, checkAnalysisQuota, async (req, res, next) => {
  try {
    const body = analyzeSchema.parse(req.body);
    const outcome = await executeAnalysis({
      inputType: body.inputType,
      value: body.value,
      title: body.title,
      modelName: resolveRequestedModel(body.model, config.llmModel),
      asyncMode: body.async === true,
      auth: readerFrom(req),
    });
    if (outcome.status === "pending") {
      return res.status(202).json({ jobId: outcome.jobId, status: "queued" });
    }
    res.json({ paper: outcome.paper, analysis: outcome.analysis });
  } catch (error) {
    next(error);
  }
});

router.post("/upload-pdf", analyzeAccountLimiter, analyzeNetworkLimiter, checkAnalysisQuota, upload.single("pdf"), async (req, res, next) => {
  try {
    if (!req.file) throw new HttpError(400, "PDF_REQUIRED", "PDF file is required.");
    const bytes = new Uint8Array(req.file.buffer);
    if (!isPdfBuffer(bytes)) throw new HttpError(400, "PDF_REQUIRED", "The upload is not a PDF.");

    let serverText = "";
    try {
      serverText = await extractPdfTextFromBytes(bytes);
    } catch (error) {
      console.warn("Server PDF extraction failed, using the browser text:", error);
    }
    const clientText = typeof req.body.text === "string" ? req.body.text : "";
    const text = choosePdfText(serverText, clientText);
    if (serverText.trim().length < MIN_PDF_TEXT_CHARS && clientText.trim().length >= MIN_PDF_TEXT_CHARS) {
      console.warn("Server PDF text was too short. Using the browser extraction.");
    }
    if (text.length < MIN_PDF_TEXT_CHARS) {
      throw new HttpError(400, "PDF_TEXT_REQUIRED", PDF_NO_TEXT_MESSAGE);
    }

    const title = typeof req.body.title === "string" && req.body.title.trim()
      ? req.body.title.trim().slice(0, 300)
      : req.file.originalname.replace(/\.pdf$/i, "");
    const wantsAsync = req.body.async === "true" || req.body.async === true;
    const model = typeof req.body.model === "string" ? req.body.model : undefined;

    const outcome = await executeAnalysis({
      inputType: "pdf",
      value: text,
      title,
      modelName: resolveRequestedModel(model, config.llmModel),
      asyncMode: wantsAsync,
      auth: readerFrom(req),
    });
    if (outcome.status === "pending") {
      return res.status(202).json({ jobId: outcome.jobId, status: "queued" });
    }
    res.json({ paper: outcome.paper, analysis: outcome.analysis });
  } catch (error) {
    next(error);
  }
});

router.get("/jobs/:id", async (req, res, next) => {
  try {
    const job = await getAnalysisJob(String(req.params.id));
    if (!job) throw new HttpError(404, "NOT_FOUND", "Analysis job not found.");
    const paper = await getPaper(job.paperId);
    if (!paper || !canReadPaper(paper, readerFrom(req))) {
      throw new HttpError(404, "NOT_FOUND", "Analysis job not found.");
    }
    if (job.status === "done") {
      const loaded = await loadPaperForReader(paper);
      return res.json({ jobId: job.id, status: job.status, paper: loaded.paper, analysis: loaded.analysis });
    }
    if (job.status === "failed") {
      return res.json({ jobId: job.id, status: job.status, message: job.error ?? "Analysis failed." });
    }
    res.json({ jobId: job.id, status: job.status });
  } catch (error) {
    next(error);
  }
});

router.get("/paper/:id", async (req, res, next) => {
  try {
    const paper = await readablePaper(req, String(req.params.id));
    res.json(await loadPaperForReader(paper));
  } catch (error) {
    next(error);
  }
});

router.get("/similar/:id", async (req, res, next) => {
  try {
    const paper = await readablePaper(req, String(req.params.id));
    if (paper.visibility === "private") return res.json({ related: [] });
    const stored = await getPaperEmbedding(paper.id);
    const embedding = stored ?? (await embedText(`${paper.title}\n${paper.abstract}`.slice(0, 8_000)));
    const related = toRelated(await nearestPublicPapers(embedding, 8, paper.id));
    res.json({ related });
  } catch (error) {
    next(error);
  }
});

router.get("/library/bookmarks", async (req, res, next) => {
  try {
    if (!req.authUser) throw new HttpError(401, "AUTH_REQUIRED", "Sign in required.");
    res.json({ bookmarks: await getUserBookmarks(req.authUser.id) });
  } catch (error) {
    next(error);
  }
});

router.put("/library/bookmarks/:paperId", async (req, res, next) => {
  try {
    if (!req.authUser) throw new HttpError(401, "AUTH_REQUIRED", "Sign in required.");
    const paper = await readablePaper(req, String(req.params.paperId));
    const bookmarked = await isBookmarked(req.authUser.id, paper.id);
    if (bookmarked) await removeBookmark(req.authUser.id, paper.id);
    else await addBookmark(req.authUser.id, paper.id);
    const bookmarks = await getUserBookmarks(req.authUser.id);
    res.json({ bookmarks, bookmarked: !bookmarked });
  } catch (error) {
    next(error);
  }
});

router.post("/library/bookmarks/sync", async (req, res, next) => {
  try {
    if (!req.authUser) throw new HttpError(401, "AUTH_REQUIRED", "Sign in required.");
    const { paperIds } = z.object({ paperIds: z.array(z.string().max(200)).max(200) }).parse(req.body);
    res.json({ bookmarks: await syncBookmarks(req.authUser.id, paperIds) });
  } catch (error) {
    next(error);
  }
});
