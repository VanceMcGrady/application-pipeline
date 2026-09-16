import type { ResumeBullet } from "./grounding/checkGrounding.js";

// Structurally identical to a resume bullet (achievement_ids + text) -- a
// body paragraph is just a longer claim citing the same ledger entries, so
// it runs through the same deterministic grounding check.
export type CoverLetterParagraph = ResumeBullet;

export type CoverLetterContent = {
  greeting: string;
  body_paragraphs: CoverLetterParagraph[];
  closing: string;
};
