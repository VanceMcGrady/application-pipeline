import { z } from "zod";

export const coverLetterVersionCreate = z.object({
  posting_id: z.string().uuid(),
});

export type CoverLetterVersionCreate = z.infer<typeof coverLetterVersionCreate>;

export const coverLetterVersionRevise = z.object({
  greeting: z.string(),
  body_paragraphs: z.array(
    z.object({
      achievement_ids: z.array(z.string().uuid()).min(1),
      text: z.string(),
    }),
  ),
  closing: z.string(),
});

export type CoverLetterVersionRevise = z.infer<typeof coverLetterVersionRevise>;
