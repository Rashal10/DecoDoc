import express from "express";
import multer from "multer";
import { z } from "zod";
import { nanoid } from "nanoid";
import type { Analysis, Paper } from "@decodoc/shared";
import {
  analyzePaper as generatePaperAnalysis,
  buildRoadmap,
  comparePapers,
  embedText,
  answerPaperQuestion,
  findResearchGaps,
  generateELI5,
  buildCitationNetwork,
  generateFlashcards,
  extractMetadataFromText,
} from "./ai";
import { requireAuth } from "./auth";
import { config } from "./config";
import {
  addBookmark,
  getAnalysis,
  getPaper,
  getPaperEmbedding,
  getUserBookmarks,
  isBookmarked,
  listEmbeddedPapers,
  recordAnalysisUsage,
  removeBookmark,
  saveAnalysis,
  syncBookmarks,
  upsertPaper,
} from "./db";
import { resolveCitationNetwork } from "./citations";
import { fetchArxiv, fetchDoi, enrichSemanticScholar, paperFromText } from "./sources";
import { rankPapers, toRelated, toSearchResults } from "./similarity";
import { assertAnalyzePairing, lookupMatchesPaper, validateResolvedArxivPaper } from "./paperIdentity";
import { checkAnalysisQuota, getUsageStatus } from "./quota";

export const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: config.maxPdfBytes } });

const analyzeSchema = z.object({
  inputType: z.enum(["arxiv", "doi", "abstract", "pdf"]),
  value: z.string().min(10),
  title: z.string().optional(),
  model: z.string().optional(),
});

type AuthContext = {
  userId?: string;
  sessionId?: string;
};

function textForEmbedding(paper: Paper): string {
  const text = `${paper.title}\n${paper.abstract}`;
  return text.length > 8_000 ? text.slice(0, 8_000) : text;
}

async function resolvePaper(inputType: string, value: string, title?: string) {
  if (inputType === "arxiv") return enrichSemanticScholar(await fetchArxiv(value));
  if (inputType === "doi") return enrichSemanticScholar(await fetchDoi(value));
  if (inputType === "pdf") {
    const fallbackTitle = title || "Uploaded PDF";
    const meta = await extractMetadataFromText(value, fallbackTitle);
    return {
      id: `local:${nanoid(10)}`,
      title: meta.title,
      authors: meta.authors,
      abstract: value,
      year: meta.year,
      venue: meta.venue || "Uploaded PDF",
    };
  }
  return paperFromText(value, title);
}

async function attachCitations(paper: Paper, analysis: Analysis): Promise<Analysis> {
  return { ...analysis, citations: await resolveCitationNetwork(paper) };
}

async function runPaperAnalysis(
  inputType: string,
  value: string,
  auth: AuthContext,
  title?: string,
  modelName?: string
) {
  const paper = await resolvePaper(inputType, value, title);
  if (inputType === "arxiv") validateResolvedArxivPaper(paper);
  const embedding = await embedText(textForEmbedding(paper));

  await upsertPaper(paper, embedding);

  const cached = await getAnalysis(paper.id);
  let analysis: Analysis;
  let wasCacheHit = false;

  if (cached) {
    try {
      assertAnalyzePairing(paper, cached);
      analysis = cached;
      wasCacheHit = true;
    } catch (error) {
      console.warn("Discarding mismatched cached analysis:", error);
      analysis = await generatePaperAnalysis(paper, modelName);
    }
  } else {
    analysis = await generatePaperAnalysis(paper, modelName);
  }

  analysis = await attachCitations(paper, analysis);
  await saveAnalysis(analysis);

  if (!wasCacheHit) {
    await recordAnalysisUsage({
      userId: auth.userId ?? null,
      sessionId: auth.sessionId ?? null,
      paperId: paper.id,
      wasCacheHit: false,
    });
  }

  assertAnalyzePairing(paper, analysis);
  return { paper, analysis };
}

function authFromRequest(req: express.Request): AuthContext {
  return {
    userId: req.authUser?.id,
    sessionId: req.anonymousSession?.id,
  };
}

router.get("/health", (_req, res) => res.json({ ok: true, service: "DecoDoc API" }));

router.get("/me/usage", async (req, res, next) => {
  try {
    res.json(await getUsageStatus(req));
  } catch (error) {
    next(error);
  }
});

router.get("/search", async (req, res, next) => {
  try {
    const q = z.string().trim().min(2).parse(req.query.q ?? "");
    const papers = await listEmbeddedPapers();
    if (papers.length === 0) {
      return res.json({ results: [] });
    }
    const embedding = await embedText(q);
    res.json({ results: toSearchResults(rankPapers(embedding, papers, undefined, 12)) });
  } catch (error) {
    next(error);
  }
});

router.post("/analyze", checkAnalysisQuota, async (req, res, next) => {
  try {
    const body = analyzeSchema.parse(req.body);
    res.json(await runPaperAnalysis(body.inputType, body.value, authFromRequest(req), body.title, body.model));
  } catch (error) {
    next(error);
  }
});

router.post("/upload-pdf", checkAnalysisQuota, upload.single("pdf"), async (req, res, next) => {
  try {
    if (!req.file) throw new Error("PDF file is required.");
    const text = req.body.text as string | undefined;
    if (!text || text.length < 100) {
      throw new Error("Extracted PDF text is required. The client extracts with PDF.js before upload.");
    }
    res.json(
      await runPaperAnalysis(
        "pdf",
        text,
        authFromRequest(req),
        req.body.title ?? req.file.originalname.replace(/\.pdf$/i, ""),
        req.body.model as string | undefined
      )
    );
  } catch (error) {
    next(error);
  }
});

router.post("/compare", requireAuth, async (req, res, next) => {
  try {
    const ids = z.object({ paperIds: z.array(z.string()).min(2).max(5) }).parse(req.body).paperIds;
    const papers = (await Promise.all(ids.map((id) => getPaper(id)))).filter(Boolean);
    if (papers.length < 2) throw new Error("At least two saved papers are required.");
    res.json({ rows: await comparePapers(papers as Paper[]) });
  } catch (error) {
    next(error);
  }
});

router.post("/roadmap", requireAuth, async (req, res, next) => {
  try {
    const { paperId } = z.object({ paperId: z.string() }).parse(req.body);
    const paper = await getPaper(paperId);
    if (!paper) throw new Error("Paper not found.");
    res.json({ nodes: await buildRoadmap(paper) });
  } catch (error) {
    next(error);
  }
});

router.post("/embedding", requireAuth, async (req, res, next) => {
  try {
    const { text } = z.object({ text: z.string().min(3) }).parse(req.body);
    res.json({ embedding: await embedText(text) });
  } catch (error) {
    next(error);
  }
});

router.get("/paper/:id", async (req, res, next) => {
  try {
    const paper = await getPaper(req.params.id);
    if (!paper || !lookupMatchesPaper(req.params.id, paper)) {
      return res.status(404).json({ error: "Paper not found" });
    }

    let analysis = await getAnalysis(paper.id);
    if (analysis) {
      try {
        assertAnalyzePairing(paper, analysis);
        analysis = await attachCitations(paper, analysis);
        await saveAnalysis(analysis);
      } catch {
        return res.json({ paper, analysis: null });
      }
    }

    res.json({ paper, analysis });
  } catch (error) {
    next(error);
  }
});

router.get("/similar/:id", async (req, res, next) => {
  try {
    const paper = await getPaper(req.params.id);
    if (!paper) return res.status(404).json({ error: "Paper not found" });
    const stored = await getPaperEmbedding(paper.id);
    const embedding = stored ?? (await embedText(textForEmbedding(paper)));
    res.json({ related: toRelated(rankPapers(embedding, await listEmbeddedPapers(), paper.id, 8)) });
  } catch (error) {
    next(error);
  }
});

router.post("/qa", requireAuth, async (req, res, next) => {
  try {
    const { paperId, question } = z
      .object({
        paperId: z.string().min(1),
        question: z.string().min(3),
      })
      .parse(req.body);
    const paper = await getPaper(paperId);
    if (!paper) return res.status(404).json({ error: "Paper not found" });
    const answer = await answerPaperQuestion(paper, question);
    res.json({ answer });
  } catch (error) {
    next(error);
  }
});

router.post("/gaps", requireAuth, async (req, res, next) => {
  try {
    const { paperId } = z.object({ paperId: z.string().min(1) }).parse(req.body);
    const paper = await getPaper(paperId);
    if (!paper) return res.status(404).json({ error: "Paper not found" });
    res.json(await findResearchGaps(paper));
  } catch (error) {
    next(error);
  }
});

router.post("/eli5", requireAuth, async (req, res, next) => {
  try {
    const { paperId } = z.object({ paperId: z.string().min(1) }).parse(req.body);
    const paper = await getPaper(paperId);
    if (!paper) return res.status(404).json({ error: "Paper not found" });
    res.json(await generateELI5(paper));
  } catch (error) {
    next(error);
  }
});

router.post("/citations", requireAuth, async (req, res, next) => {
  try {
    const { paperId } = z.object({ paperId: z.string().min(1) }).parse(req.body);
    const paper = await getPaper(paperId);
    if (!paper) return res.status(404).json({ error: "Paper not found" });
    res.json(await buildCitationNetwork(paper));
  } catch (error) {
    next(error);
  }
});

router.post("/flashcards", requireAuth, async (req, res, next) => {
  try {
    const { paperId } = z.object({ paperId: z.string().min(1) }).parse(req.body);
    const paper = await getPaper(paperId);
    if (!paper) return res.status(404).json({ error: "Paper not found" });
    res.json({ flashcards: await generateFlashcards(paper) });
  } catch (error) {
    next(error);
  }
});

// --- Library (auth required) ---

router.get("/library/bookmarks", requireAuth, async (req, res, next) => {
  try {
    const bookmarks = await getUserBookmarks(req.authUser!.id);
    res.json({ bookmarks });
  } catch (error) {
    next(error);
  }
});

router.put("/library/bookmarks/:paperId", requireAuth, async (req, res, next) => {
  try {
    const paperId = String(req.params.paperId);
    const paper = await getPaper(paperId);
    if (!paper) return res.status(404).json({ error: "Paper not found" });
    const bookmarked = await isBookmarked(req.authUser!.id, paper.id);
    if (bookmarked) {
      await removeBookmark(req.authUser!.id, paper.id);
    } else {
      await addBookmark(req.authUser!.id, paper.id);
    }
    const bookmarks = await getUserBookmarks(req.authUser!.id);
    res.json({ bookmarks, bookmarked: !bookmarked });
  } catch (error) {
    next(error);
  }
});

router.post("/library/bookmarks/sync", requireAuth, async (req, res, next) => {
  try {
    const { paperIds } = z.object({ paperIds: z.array(z.string()) }).parse(req.body);
    const bookmarks = await syncBookmarks(req.authUser!.id, paperIds);
    res.json({ bookmarks });
  } catch (error) {
    next(error);
  }
});
