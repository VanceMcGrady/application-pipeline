import { z } from "zod";

export const resumeVersionCreate = z.object({
  posting_id: z.string().uuid(),
});

export type ResumeVersionCreate = z.infer<typeof resumeVersionCreate>;

export const resumeVersionRevise = z.object({
  bullets: z.array(
    z.object({
      achievement_ids: z.array(z.string().uuid()).min(1),
      text: z.string(),
    }),
  ),
});

export type ResumeVersionRevise = z.infer<typeof resumeVersionRevise>;
