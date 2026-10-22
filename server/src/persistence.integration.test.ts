import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "./app";
import {
  claimJobForResume,
  createAnonymousSession,
  findReusableReservation,
  reserveAnalysisUsage,
  searchPublicByVector,
  upsertPaper,
} from "./db";
import { EMBEDDING_DIMENSIONS } from "./embedding";
import { closeDatabase, getPool, initDatabase } from "./init-db";

const runIntegration = process.env.CI === "true" || process.env.RUN_DB_INTEGRATION === "1";

describe.skipIf(!runIntegration)("postgres persistence", () => {
  let server: Server | undefined;
  let base = "";
  const sessionIds: string[] = [];

  beforeAll(async () => {
    await initDatabase();
    const app = createApp();
    server = await new Promise<Server>((resolve) => {
      const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
    });
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    base = `http://127.0.0.1:${port}`;
  }, 30_000);

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
    try {
      const pool = getPool();
      await pool.query("delete from analysis_usage where paper_id like 'itest-%'");
      await pool.query("delete from analysis_jobs where paper_id like 'itest-%'");
      await pool.query("delete from papers where id like 'itest-%'");
      if (sessionIds.length > 0) {
        await pool.query("delete from anonymous_sessions where id = any($1::uuid[])", [sessionIds]);
      }
      await pool.query("delete from users where email like 'itest-%@example.com'");
    } catch (error) {
      console.warn("Integration cleanup skipped:", error);
    }
    await closeDatabase();
  });

  it("reports a live database and hides a private paper from other readers", async () => {
    const health = await fetch(`${base}/api/health`);
    expect(health.status).toBe(200);
    await expect(health.json()).resolves.toMatchObject({ ok: true, database: true });

    const session = await createAnonymousSession();
    if (!session) throw new Error("Session was not created.");
    sessionIds.push(session.id);
    await upsertPaper(
      {
        id: "itest-private",
        title: "Private integration paper",
        authors: ["Ada"],
        abstract: "This abstract stays with the owner session.",
        venue: "Uploaded PDF",
      },
      { visibility: "private", ownerSessionId: session.id }
    );

    const stranger = await fetch(`${base}/api/paper/itest-private`);
    expect(stranger.status).toBe(404);

    const owner = await fetch(`${base}/api/paper/itest-private`, {
      headers: { cookie: `decodoc_sid=${session.id}` },
    });
    expect(owner.status).toBe(200);
    const body = (await owner.json()) as { paper?: { id?: string } };
    expect(body.paper?.id).toBe("itest-private");
  });

  it("registers an email account", async () => {
    const email = `itest-${Date.now()}@example.com`;
    const response = await fetch(`${base}/api/auth/register`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:5173",
      },
      body: JSON.stringify({ email, password: "test-password-1", displayName: "Integration" }),
    });
    expect(response.status).toBe(201);
    const body = (await response.json()) as { email?: string };
    expect(body.email).toBe(email);
  });

  it("stops an anonymous session at three reserved analyses", async () => {
    const session = await createAnonymousSession();
    if (!session) throw new Error("Session was not created.");
    sessionIds.push(session.id);
    await upsertPaper(
      {
        id: "itest-quota",
        title: "Quota paper",
        authors: ["Ada"],
        abstract: "Used only to reserve analysis quota rows.",
        venue: "User provided",
      },
      { visibility: "private", ownerSessionId: session.id }
    );

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const reserved = await reserveAnalysisUsage({
        sessionId: session.id,
        paperId: "itest-quota",
        limit: 3,
      });
      expect(reserved.ok).toBe(true);
    }
    const blocked = await reserveAnalysisUsage({
      sessionId: session.id,
      paperId: "itest-quota",
      limit: 3,
    });
    expect(blocked.ok).toBe(false);
  });

  it("orders public papers by vector distance and keeps private papers out", async () => {
    const near = Array.from({ length: EMBEDDING_DIMENSIONS }, (_, index) => (index === 0 ? 1 : 0));
    const far = Array.from({ length: EMBEDDING_DIMENSIONS }, (_, index) => (index === 1 ? 1 : 0));
    const short = [1, 0, 0];
    await upsertPaper(
      {
        id: "itest-near",
        title: "Near paper",
        authors: ["Ada"],
        abstract: "Closest public vector.",
        venue: "Test",
      },
      { visibility: "public", embedding: near }
    );
    await upsertPaper(
      {
        id: "itest-far",
        title: "Far paper",
        authors: ["Ada"],
        abstract: "A different public vector.",
        venue: "Test",
      },
      { visibility: "public", embedding: far }
    );
    await upsertPaper(
      {
        id: "itest-short",
        title: "Short paper",
        authors: ["Ada"],
        abstract: "This embedding is the wrong width.",
        venue: "Test",
      },
      { visibility: "public", embedding: short }
    );
    const session = await createAnonymousSession();
    if (!session) throw new Error("Session was not created.");
    sessionIds.push(session.id);
    await upsertPaper(
      {
        id: "itest-hidden",
        title: "Hidden paper",
        authors: ["Ada"],
        abstract: "Private papers are not searchable.",
        venue: "Uploaded PDF",
      },
      { visibility: "private", ownerSessionId: session.id, embedding: near }
    );

    const ranked = await searchPublicByVector(near, 8);
    expect(ranked).not.toBeNull();
    const ids = ranked?.map((paper) => paper.id) ?? [];
    expect(ids[0]).toBe("itest-near");
    expect(ids).toContain("itest-far");
    expect(ids).not.toContain("itest-short");
    expect(ids).not.toContain("itest-hidden");
    expect(ranked?.[0]?.score).toBeGreaterThan(0.99);
  });

  it("claims a queued job once and reuses the reservation for that paper", async () => {
    const session = await createAnonymousSession();
    if (!session) throw new Error("Session was not created.");
    sessionIds.push(session.id);
    await upsertPaper(
      {
        id: "itest-job",
        title: "Job paper",
        authors: ["Ada"],
        abstract: "Queued so a restart can claim it.",
        venue: "User provided",
      },
      { visibility: "private", ownerSessionId: session.id }
    );
    const inserted = await getPool().query<{ id: string; created_at: Date }>(
      `insert into analysis_jobs (paper_id, status, owner_session_id)
       values ('itest-job', 'queued', $1)
       returning id, created_at`,
      [session.id]
    );
    const jobId = inserted.rows[0]?.id;
    if (!jobId) throw new Error("Job was not created.");
    const first = await claimJobForResume(jobId);
    expect(first?.paperId).toBe("itest-job");
    expect(await claimJobForResume(jobId)).toBeNull();

    const reserved = await reserveAnalysisUsage({
      sessionId: session.id,
      paperId: "itest-job",
      limit: 3,
    });
    expect(reserved.ok).toBe(true);
    if (!reserved.ok || !first) return;
    const reused = await findReusableReservation({
      paperId: "itest-job",
      sessionId: session.id,
      since: first.createdAt,
    });
    expect(reused).toBe(reserved.id);
  });
});
