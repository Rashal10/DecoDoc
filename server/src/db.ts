import { and, count, eq, gte, isNotNull, or, sql } from "drizzle-orm";
import type { Analysis, Paper } from "@decodoc/shared";
import { parseCachedAnalysis } from "./analysisCache";
import { getDb } from "./init-db";
import { normalizeArxivId, normalizeDoi } from "./paperIdentity";
import {
  analyses,
  analysisUsage,
  anonymousSessions,
  papers,
  userBookmarks,
  users,
} from "./schema";

export { parseCachedAnalysis } from "./analysisCache";

function rowToPaper(row: typeof papers.$inferSelect): Paper {
  return {
    id: row.id,
    title: row.title,
    authors: row.authors,
    abstract: row.abstract,
    year: row.year ?? undefined,
    venue: row.venue ?? undefined,
    arxivId: row.arxivId ?? undefined,
    doi: row.doi ?? undefined,
    url: row.url ?? undefined,
    citationCount: row.citationCount ?? 0,
    createdAt: row.createdAt?.toISOString(),
  };
}

export async function upsertPaper(paper: Paper, embedding?: number[]): Promise<Paper> {
  const db = getDb();
  const values = {
    id: paper.id,
    title: paper.title,
    authors: paper.authors,
    abstract: paper.abstract,
    year: paper.year ?? null,
    venue: paper.venue ?? null,
    arxivId: paper.arxivId ?? null,
    doi: paper.doi ?? null,
    url: paper.url ?? null,
    citationCount: paper.citationCount ?? 0,
    embedding: embedding ?? null,
  };
  const updateSet = {
    title: paper.title,
    authors: paper.authors,
    abstract: paper.abstract,
    year: paper.year ?? null,
    venue: paper.venue ?? null,
    arxivId: paper.arxivId ?? null,
    doi: paper.doi ?? null,
    url: paper.url ?? null,
    citationCount: paper.citationCount ?? 0,
    updatedAt: sql`now()`,
    ...(embedding ? { embedding } : {}),
  };
  await db.insert(papers).values(values).onConflictDoUpdate({
    target: papers.id,
    set: updateSet,
  });
  return paper;
}

export async function saveAnalysis(analysis: Analysis): Promise<void> {
  const db = getDb();
  await db
    .insert(analyses)
    .values({ paperId: analysis.paperId, payload: analysis })
    .onConflictDoUpdate({
      target: analyses.paperId,
      set: { payload: analysis, createdAt: sql`now()` },
    });
}

export async function getPaper(lookup: string): Promise<Paper | null> {
  const db = getDb();
  const trimmed = lookup.trim();

  const byId = await db.select().from(papers).where(eq(papers.id, trimmed)).limit(1);
  if (byId[0]) return rowToPaper(byId[0]);

  const arxivBare = normalizeArxivId(trimmed);
  if (arxivBare) {
    const byArxiv = await db
      .select()
      .from(papers)
      .where(or(eq(papers.arxivId, arxivBare), eq(papers.id, `arxiv:${arxivBare}`)))
      .limit(1);
    if (byArxiv[0]) return rowToPaper(byArxiv[0]);
  }

  const doiNorm = normalizeDoi(trimmed);
  if (doiNorm) {
    const byDoi = await db
      .select()
      .from(papers)
      .where(or(eq(papers.doi, doiNorm), eq(papers.id, `doi:${doiNorm}`)))
      .limit(1);
    if (byDoi[0]) return rowToPaper(byDoi[0]);
  }

  return null;
}

export async function getPaperEmbedding(paperId: string): Promise<number[] | null> {
  const db = getDb();
  const rows = await db
    .select({ embedding: papers.embedding })
    .from(papers)
    .where(eq(papers.id, paperId))
    .limit(1);
  const embedding = rows[0]?.embedding;
  return Array.isArray(embedding) ? (embedding as number[]) : null;
}

export async function getAnalysis(paperId: string): Promise<Analysis | null> {
  const db = getDb();
  const rows = await db.select().from(analyses).where(eq(analyses.paperId, paperId)).limit(1);
  if (!rows[0]) return null;
  return parseCachedAnalysis(rows[0].payload);
}

export async function listEmbeddedPapers(): Promise<Array<Paper & { embedding: number[] }>> {
  const db = getDb();
  const rows = await db.select().from(papers).where(isNotNull(papers.embedding));
  return rows.map((row) => ({
    ...rowToPaper(row),
    embedding: row.embedding as number[],
  }));
}

// --- Users ---

export async function upsertUser(authProviderId: string, email?: string | null, displayName?: string | null) {
  const db = getDb();
  const [user] = await db
    .insert(users)
    .values({
      authProviderId,
      email: email ?? null,
      displayName: displayName ?? null,
    })
    .onConflictDoUpdate({
      target: users.authProviderId,
      set: {
        email: email ?? null,
        displayName: displayName ?? null,
      },
    })
    .returning();
  return user;
}

export async function getUserByAuthProviderId(authProviderId: string) {
  const db = getDb();
  const rows = await db.select().from(users).where(eq(users.authProviderId, authProviderId)).limit(1);
  return rows[0] ?? null;
}

export function emailAuthProviderId(email: string) {
  return `email:${email.trim().toLowerCase()}`;
}

export async function getUserByEmail(email: string) {
  return getUserByAuthProviderId(emailAuthProviderId(email));
}

export async function getUserById(id: string) {
  const db = getDb();
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createEmailUser(
  email: string,
  passwordHash: string,
  displayName?: string | null
) {
  const db = getDb();
  const normalized = email.trim().toLowerCase();
  const [user] = await db
    .insert(users)
    .values({
      authProviderId: emailAuthProviderId(normalized),
      email: normalized,
      displayName: displayName?.trim() || null,
      passwordHash,
    })
    .returning();
  return user;
}

// --- Anonymous sessions ---

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // DB cleanup horizon

export async function createAnonymousSession() {
  const db = getDb();
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const [session] = await db
    .insert(anonymousSessions)
    .values({ id, analysisCount: 0, expiresAt })
    .returning();
  return session;
}

export async function getAnonymousSession(sessionId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(anonymousSessions)
    .where(eq(anonymousSessions.id, sessionId))
    .limit(1);
  const session = rows[0];
  if (!session) return null;
  if (session.expiresAt < new Date()) return null;
  return session;
}

export async function incrementAnonymousCount(sessionId: string) {
  const db = getDb();
  await db
    .update(anonymousSessions)
    .set({ analysisCount: sql`${anonymousSessions.analysisCount} + 1` })
    .where(eq(anonymousSessions.id, sessionId));
}

// --- Usage tracking ---

export async function recordAnalysisUsage(params: {
  userId?: string | null;
  sessionId?: string | null;
  paperId: string;
  wasCacheHit: boolean;
}) {
  const db = getDb();
  await db.insert(analysisUsage).values({
    userId: params.userId ?? null,
    sessionId: params.sessionId ?? null,
    paperId: params.paperId,
    wasCacheHit: params.wasCacheHit,
  });
}

export async function countAnonymousUsage(sessionId: string): Promise<number> {
  const db = getDb();
  const rows = await db
    .select({ total: count() })
    .from(analysisUsage)
    .where(
      and(
        eq(analysisUsage.sessionId, sessionId),
        eq(analysisUsage.wasCacheHit, false)
      )
    );
  return Number(rows[0]?.total ?? 0);
}

export async function countDailyUserUsage(userId: string): Promise<number> {
  const db = getDb();
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const rows = await db
    .select({ total: count() })
    .from(analysisUsage)
    .where(
      and(
        eq(analysisUsage.userId, userId),
        eq(analysisUsage.wasCacheHit, false),
        gte(analysisUsage.createdAt, startOfDay)
      )
    );
  return Number(rows[0]?.total ?? 0);
}

// --- Bookmarks ---

export async function getUserBookmarks(userId: string): Promise<Paper[]> {
  const db = getDb();
  const rows = await db
    .select({ paper: papers })
    .from(userBookmarks)
    .innerJoin(papers, eq(userBookmarks.paperId, papers.id))
    .where(eq(userBookmarks.userId, userId))
    .orderBy(sql`${userBookmarks.createdAt} desc`);
  return rows.map((r) => rowToPaper(r.paper));
}

export async function isBookmarked(userId: string, paperId: string): Promise<boolean> {
  const db = getDb();
  const rows = await db
    .select()
    .from(userBookmarks)
    .where(and(eq(userBookmarks.userId, userId), eq(userBookmarks.paperId, paperId)))
    .limit(1);
  return rows.length > 0;
}

export async function addBookmark(userId: string, paperId: string): Promise<void> {
  const db = getDb();
  await db
    .insert(userBookmarks)
    .values({ userId, paperId })
    .onConflictDoNothing();
}

export async function removeBookmark(userId: string, paperId: string): Promise<void> {
  const db = getDb();
  await db
    .delete(userBookmarks)
    .where(and(eq(userBookmarks.userId, userId), eq(userBookmarks.paperId, paperId)));
}

export async function syncBookmarks(userId: string, paperIds: string[]): Promise<Paper[]> {
  const db = getDb();
  const unique = [...new Set(paperIds)];
  if (unique.length > 0) {
    await db
      .insert(userBookmarks)
      .values(unique.map((paperId) => ({ userId, paperId })))
      .onConflictDoNothing();
  }
  return getUserBookmarks(userId);
}
