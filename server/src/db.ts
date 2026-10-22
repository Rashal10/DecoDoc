import { and, count, eq, gte, inArray, isNotNull, or, sql } from "drizzle-orm";
import type { Analysis, Paper } from "@decodoc/shared";
import { parseCachedAnalysis } from "./analysisCache";
import { getDb } from "./init-db";
import { normalizeArxivId, normalizeDoi } from "./paperIdentity";
import type { PaperVisibility } from "./paperAccess";
import {
  analyses,
  analysisJobs,
  analysisUsage,
  anonymousSessions,
  papers,
  userBookmarks,
  users,
} from "./schema";

export { parseCachedAnalysis } from "./analysisCache";

export type StoredPaper = Paper & {
  visibility: PaperVisibility;
  ownerUserId: string | null;
  ownerSessionId: string | null;
};

export type PaperOwnership = {
  visibility: PaperVisibility;
  ownerUserId?: string | null;
  ownerSessionId?: string | null;
  embedding?: number[];
};

const STALE_JOB_MS = 15 * 60 * 1000;

export function isUniqueViolation(error: unknown): boolean {
  const seen = new Set<unknown>();
  let current: unknown = error;
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    if ((current as { code?: string }).code === "23505") return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

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

function rowToStoredPaper(row: typeof papers.$inferSelect): StoredPaper {
  return {
    ...rowToPaper(row),
    visibility: row.visibility === "private" ? "private" : "public",
    ownerUserId: row.ownerUserId ?? null,
    ownerSessionId: row.ownerSessionId ?? null,
  };
}

export function toPublicPaper(paper: StoredPaper): Paper {
  return {
    id: paper.id,
    title: paper.title,
    authors: paper.authors,
    abstract: paper.abstract,
    year: paper.year,
    venue: paper.venue,
    arxivId: paper.arxivId,
    doi: paper.doi,
    url: paper.url,
    citationCount: paper.citationCount,
    createdAt: paper.createdAt,
  };
}

export async function upsertPaper(paper: Paper, ownership: PaperOwnership = { visibility: "public" }): Promise<StoredPaper> {
  const db = getDb();
  const visibility = ownership.visibility;
  const embedding = visibility === "private" ? null : ownership.embedding ?? null;
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
    embedding,
    visibility,
    ownerUserId: ownership.ownerUserId ?? null,
    ownerSessionId: ownership.ownerSessionId ?? null,
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
    visibility: sql`CASE WHEN ${papers.visibility} = 'private' THEN ${papers.visibility} ELSE EXCLUDED.visibility END`,
    ownerUserId: sql`CASE WHEN ${papers.visibility} = 'private' THEN ${papers.ownerUserId} ELSE EXCLUDED.owner_user_id END`,
    ownerSessionId: sql`CASE WHEN ${papers.visibility} = 'private' THEN ${papers.ownerSessionId} ELSE EXCLUDED.owner_session_id END`,
    embedding: sql`CASE WHEN ${papers.visibility} = 'private' OR EXCLUDED.visibility = 'private' THEN NULL ELSE COALESCE(EXCLUDED.embedding, ${papers.embedding}) END`,
  };
  await db.insert(papers).values(values).onConflictDoUpdate({
    target: papers.id,
    set: updateSet,
  });
  const stored = await getPaper(paper.id);
  return stored ?? { ...paper, visibility, ownerUserId: ownership.ownerUserId ?? null, ownerSessionId: ownership.ownerSessionId ?? null };
}

export async function saveAnalysis(analysis: Analysis, options?: { citationsFetchedAt?: Date }): Promise<void> {
  const db = getDb();
  const citationsFetchedAt = options?.citationsFetchedAt ?? null;
  await db
    .insert(analyses)
    .values({ paperId: analysis.paperId, payload: analysis, citationsFetchedAt })
    .onConflictDoUpdate({
      target: analyses.paperId,
      set: {
        payload: analysis,
        createdAt: sql`now()`,
        ...(options?.citationsFetchedAt ? { citationsFetchedAt: options.citationsFetchedAt } : {}),
      },
    });
}

export async function getPaper(lookup: string): Promise<StoredPaper | null> {
  const db = getDb();
  const trimmed = lookup.trim();

  const byId = await db.select().from(papers).where(eq(papers.id, trimmed)).limit(1);
  if (byId[0]) return rowToStoredPaper(byId[0]);

  const arxivBare = normalizeArxivId(trimmed);
  if (arxivBare) {
    const byArxiv = await db
      .select()
      .from(papers)
      .where(or(eq(papers.arxivId, arxivBare), eq(papers.id, `arxiv:${arxivBare}`)))
      .limit(1);
    if (byArxiv[0]) return rowToStoredPaper(byArxiv[0]);
  }

  const doiNorm = normalizeDoi(trimmed);
  if (doiNorm) {
    const byDoi = await db
      .select()
      .from(papers)
      .where(or(eq(papers.doi, doiNorm), eq(papers.id, `doi:${doiNorm}`)))
      .limit(1);
    if (byDoi[0]) return rowToStoredPaper(byDoi[0]);
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

export async function getAnalysisRecord(
  paperId: string
): Promise<{ analysis: Analysis; citationsFetchedAt: Date | null } | null> {
  const db = getDb();
  const rows = await db.select().from(analyses).where(eq(analyses.paperId, paperId)).limit(1);
  if (!rows[0]) return null;
  const analysis = parseCachedAnalysis(rows[0].payload);
  if (!analysis) return null;
  return { analysis, citationsFetchedAt: rows[0].citationsFetchedAt ?? null };
}

export async function getAnalysis(paperId: string): Promise<Analysis | null> {
  const record = await getAnalysisRecord(paperId);
  return record?.analysis ?? null;
}

export async function listPublicEmbeddedPapers(): Promise<Array<Paper & { embedding: number[] }>> {
  const db = getDb();
  const rows = await db
    .select()
    .from(papers)
    .where(and(eq(papers.visibility, "public"), isNotNull(papers.embedding)));
  return rows
    .filter((row) => Array.isArray(row.embedding))
    .map((row) => ({
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

export async function findUserByEmailAddress(email: string) {
  const normalized = email.trim().toLowerCase();
  const rows = await getDb()
    .select()
    .from(users)
    .where(sql`lower(${users.email}) = ${normalized}`)
    .limit(1);
  return rows[0] ?? null;
}

export async function upsertGoogleUser(sub: string, email: string, displayName: string | null) {
  const db = getDb();
  const normalized = email.trim().toLowerCase();
  const providerId = `google:${sub}`;
  const byGoogle = await db
    .select()
    .from(users)
    .where(or(eq(users.googleSub, sub), eq(users.authProviderId, providerId)))
    .limit(1);

  if (byGoogle[0]) {
    const [user] = await db
      .update(users)
      .set({
        email: normalized,
        displayName: byGoogle[0].displayName ?? displayName,
        googleSub: sub,
      })
      .where(eq(users.id, byGoogle[0].id))
      .returning();
    return user;
  }

  const byEmail = await findUserByEmailAddress(normalized);
  if (byEmail) {
    const [user] = await db
      .update(users)
      .set({
        googleSub: sub,
        displayName: byEmail.displayName ?? displayName,
      })
      .where(eq(users.id, byEmail.id))
      .returning();
    return user;
  }

  const [user] = await db
    .insert(users)
    .values({
      authProviderId: providerId,
      email: normalized,
      displayName,
      googleSub: sub,
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

export async function reserveAnalysisUsage(params: {
  userId?: string | null;
  sessionId?: string | null;
  paperId: string;
  limit: number;
}): Promise<{ ok: true; id: string } | { ok: false; used: number }> {
  const db = getDb();
  const lockKey = params.userId ? `user:${params.userId}` : `session:${params.sessionId ?? "none"}`;
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${lockKey})::bigint)`);
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const rows = params.userId
      ? await tx
          .select({ total: count() })
          .from(analysisUsage)
          .where(
            and(
              eq(analysisUsage.userId, params.userId),
              eq(analysisUsage.wasCacheHit, false),
              gte(analysisUsage.createdAt, startOfDay)
            )
          )
      : await tx
          .select({ total: count() })
          .from(analysisUsage)
          .where(and(eq(analysisUsage.sessionId, params.sessionId ?? ""), eq(analysisUsage.wasCacheHit, false)));
    const used = Number(rows[0]?.total ?? 0);
    if (used >= params.limit) return { ok: false, used };
    const [row] = await tx
      .insert(analysisUsage)
      .values({
        userId: params.userId ?? null,
        sessionId: params.userId ? null : params.sessionId ?? null,
        paperId: params.paperId,
        wasCacheHit: false,
      })
      .returning({ id: analysisUsage.id });
    if (!row) return { ok: false, used };
    return { ok: true, id: row.id };
  });
}

export async function releaseAnalysisUsage(id: string): Promise<void> {
  await getDb().delete(analysisUsage).where(eq(analysisUsage.id, id));
}

export async function claimAnalysisJob(
  paperId: string,
  owner: { userId: string | null; sessionId: string | null }
): Promise<{ id: string; shouldRun: boolean }> {
  const db = getDb();
  const active = await db
    .select()
    .from(analysisJobs)
    .where(and(eq(analysisJobs.paperId, paperId), or(eq(analysisJobs.status, "queued"), eq(analysisJobs.status, "running"))))
    .limit(1);

  if (active[0]) {
    const touched = active[0].updatedAt?.getTime() ?? active[0].createdAt.getTime();
    if (Date.now() - touched < STALE_JOB_MS) {
      return { id: active[0].id, shouldRun: false };
    }
    await db
      .update(analysisJobs)
      .set({ status: "failed", error: "The previous analysis timed out.", updatedAt: new Date() })
      .where(eq(analysisJobs.id, active[0].id));
  }

  try {
    const [row] = await db
      .insert(analysisJobs)
      .values({
        paperId,
        status: "queued",
        ownerUserId: owner.userId,
        ownerSessionId: owner.sessionId,
      })
      .returning();
    if (!row) throw new Error("Could not create an analysis job.");
    return { id: row.id, shouldRun: true };
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    const again = await db
      .select()
      .from(analysisJobs)
      .where(and(eq(analysisJobs.paperId, paperId), or(eq(analysisJobs.status, "queued"), eq(analysisJobs.status, "running"))))
      .limit(1);
    if (!again[0]) throw error;
    return { id: again[0].id, shouldRun: false };
  }
}

export async function markAnalysisJob(id: string, status: "running" | "done" | "failed", error?: string | null) {
  await getDb()
    .update(analysisJobs)
    .set({ status, error: error ?? null, updatedAt: new Date() })
    .where(eq(analysisJobs.id, id));
}

export async function getAnalysisJob(id: string) {
  const rows = await getDb().select().from(analysisJobs).where(eq(analysisJobs.id, id)).limit(1);
  return rows[0] ?? null;
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
  const unique = [...new Set(paperIds)].slice(0, 200);
  if (unique.length === 0) return getUserBookmarks(userId);
  const rows = await db.select().from(papers).where(inArray(papers.id, unique));
  const allowed = rows.filter((row) => row.visibility !== "private" || row.ownerUserId === userId);
  if (allowed.length > 0) {
    await db
      .insert(userBookmarks)
      .values(allowed.map((row) => ({ userId, paperId: row.id })))
      .onConflictDoNothing();
  }
  return getUserBookmarks(userId);
}
