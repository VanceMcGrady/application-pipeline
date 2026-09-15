import { z } from "zod";

export const resumeVersionCreate = z.object({
  posting_id: z.string().uuid(),
});

export type ResumeVersionCreate = z.infer<typeof resumeVersionCreate>;
