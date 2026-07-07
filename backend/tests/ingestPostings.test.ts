import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { runIngestion } from "../src/jobs/ingestPostings.js";
import { getServiceSupabaseClient } from "../src/supabaseClients.js";
import type { JobSource, NormalizedPosting } from "../src/sources/types.js";

function fakeSource(postings: NormalizedPosting[]): JobSource {
  return { fetchJobs: async () => postings };
}

describe("runIngestion", () => {
  it("inserts new postings, skips unchanged ones, and rewrites changed ones", async () => {
    const boardToken = randomUUID();
    const externalId = randomUUID();
    const board = { source: "test-source", boardToken, companyName: "Test Co" };

    const v1: NormalizedPosting = {
      externalId,
      title: "Backend Engineer",
      company: "Test Co",
      rawText: "Original description",
      sourceUrl: "https://example.com/jobs/1",
      externalUpdatedAt: "2026-01-01T00:00:00Z",
    };

    const firstRun = await runIngestion([board], { "test-source": fakeSource([v1]) });
    expect(firstRun).toEqual([
      { source: "test-source", boardToken, fetched: 1, upserted: 1 },
    ]);

    const client = getServiceSupabaseClient();
    const { data: afterFirst } = await client
      .from("postings")
      .select("*")
      .eq("source", "test-source")
      .eq("external_id", externalId)
      .single();
    expect(afterFirst.title).toBe("Backend Engineer");
    expect(afterFirst.raw_text).toBe("Original description");

    const { data: boardRow } = await client
      .from("ats_boards")
      .select("last_polled_at")
      .eq("source", "test-source")
      .eq("board_token", boardToken)
      .single();
    expect(boardRow.last_polled_at).not.toBeNull();

    const secondRun = await runIngestion([board], { "test-source": fakeSource([v1]) });
    expect(secondRun).toEqual([
      { source: "test-source", boardToken, fetched: 1, upserted: 0 },
    ]);

    const v2: NormalizedPosting = {
      ...v1,
      title: "Senior Backend Engineer",
      rawText: "Updated description",
      externalUpdatedAt: "2026-02-01T00:00:00Z",
    };
    const thirdRun = await runIngestion([board], { "test-source": fakeSource([v2]) });
    expect(thirdRun).toEqual([
      { source: "test-source", boardToken, fetched: 1, upserted: 1 },
    ]);

    const { data: afterThird } = await client
      .from("postings")
      .select("*")
      .eq("source", "test-source")
      .eq("external_id", externalId)
      .single();
    expect(afterThird.title).toBe("Senior Backend Engineer");
    expect(afterThird.raw_text).toBe("Updated description");
  });

  it("records an error for a board with no matching source adapter, without throwing", async () => {
    const board = { source: "unregistered-source", boardToken: randomUUID(), companyName: "Nobody" };
    const results = await runIngestion([board], {});
    expect(results).toEqual([
      expect.objectContaining({ source: "unregistered-source", error: expect.any(String) }),
    ]);
  });
});
