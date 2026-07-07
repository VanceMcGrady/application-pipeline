import { afterEach, describe, expect, it, vi } from "vitest";
import { greenhouseSource } from "../src/sources/greenhouse.js";

describe("greenhouseSource", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("normalizes Greenhouse jobs and strips HTML content", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        jobs: [
          {
            id: 12345,
            title: "Backend Engineer",
            updated_at: "2026-01-15T10:00:00Z",
            absolute_url: "https://boards.greenhouse.io/acme/jobs/12345",
            // Greenhouse escapes the HTML tags inside `content` (real API
            // responses look like this, not literal `<p>` tags) — the
            // adapter must decode entities before stripping tags.
            content: "&lt;p&gt;Build &lt;strong&gt;great&lt;/strong&gt; things &amp; stuff.&lt;/p&gt;",
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const postings = await greenhouseSource.fetchJobs("acme", "Acme Corp");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://boards-api.greenhouse.io/v1/boards/acme/jobs?content=true",
    );
    expect(postings).toEqual([
      {
        externalId: "12345",
        title: "Backend Engineer",
        company: "Acme Corp",
        rawText: "Build great things & stuff.",
        sourceUrl: "https://boards.greenhouse.io/acme/jobs/12345",
        externalUpdatedAt: "2026-01-15T10:00:00Z",
      },
    ]);
  });

  it("throws on a non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    await expect(greenhouseSource.fetchJobs("missing", "Nobody")).rejects.toThrow("404");
  });
});
