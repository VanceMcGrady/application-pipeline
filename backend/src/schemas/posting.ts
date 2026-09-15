import { z } from "zod";

export const postingCreate = z.object({
  company: z.string(),
  title: z.string(),
  raw_text: z.string(),
  source_url: z.string().url().nullish(),
});

export type PostingCreate = z.infer<typeof postingCreate>;
