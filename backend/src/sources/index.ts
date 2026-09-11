import { greenhouseSource } from "./greenhouse.js";
import type { JobSource } from "./types.js";

// Adding a new ATS is a new adapter file implementing JobSource + one entry
// here — the ingestion job and everything else is source-agnostic.
export const sources: Record<string, JobSource> = {
  greenhouse: greenhouseSource,
};

export type { JobSource, NormalizedPosting } from "./types.js";
