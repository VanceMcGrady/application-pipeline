import type { JobSource, NormalizedPosting } from "./types.js";

interface GreenhouseJob {
  id: number;
  title: string;
  updated_at: string;
  absolute_url: string | null;
  content: string | null;
}

interface GreenhouseJobsResponse {
  jobs: GreenhouseJob[];
}

/**
 * Greenhouse's `content` field is an HTML job description whose tags are
 * themselves entity-escaped (e.g. `&lt;h2&gt;`), so entities must be decoded
 * before tags can be stripped — doing it in the other order leaves the
 * escaped tags untouched. Produces plain text for `raw_text`, matching what
 * a pasted-in posting would look like, rather than storing markup the
 * tailoring/grounding pass would have to account for.
 */
function stripHtml(html: string): string {
  const decoded = html
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");

  return decoded
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchJobs(boardToken: string, companyName: string): Promise<NormalizedPosting[]> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs?content=true`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Greenhouse board "${boardToken}" returned ${response.status}`);
  }
  const body = (await response.json()) as GreenhouseJobsResponse;

  return body.jobs.map((job) => ({
    externalId: String(job.id),
    title: job.title,
    company: companyName,
    rawText: job.content ? stripHtml(job.content) : "",
    sourceUrl: job.absolute_url,
    externalUpdatedAt: job.updated_at,
  }));
}

export const greenhouseSource: JobSource = { fetchJobs };
