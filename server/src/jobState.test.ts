import { describe, expect, it } from "vitest";
import { JOB_HEARTBEAT_STALE_MS, inputTypeForStoredPaper, jobNeedsResume } from "./jobState";

describe("analysis job resume", () => {
  const now = Date.parse("2026-10-20T00:00:00.000Z");

  it("resumes queued work and stale running work that this process does not own", () => {
    expect(jobNeedsResume("queued", new Date(now), now, false)).toBe(true);
    expect(jobNeedsResume("running", new Date(now - JOB_HEARTBEAT_STALE_MS), now, false)).toBe(true);
    expect(jobNeedsResume("running", new Date(now - 1_000), now, false)).toBe(false);
    expect(jobNeedsResume("queued", new Date(now), now, true)).toBe(false);
    expect(jobNeedsResume("done", new Date(now - JOB_HEARTBEAT_STALE_MS), now, false)).toBe(false);
  });

  it("keeps uploaded PDFs on the PDF path and public papers on their source", () => {
    expect(inputTypeForStoredPaper({ venue: "Uploaded PDF" })).toBe("pdf");
    expect(inputTypeForStoredPaper({ venue: "User provided" })).toBe("abstract");
    expect(inputTypeForStoredPaper({ venue: "arXiv", arxivId: "1706.03762" })).toBe("arxiv");
    expect(inputTypeForStoredPaper({ venue: "Nature", doi: "10.1000/test" })).toBe("doi");
  });
});
