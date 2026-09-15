import { z } from "zod";

export const profileUpsert = z.object({
  full_name: z.string(),
  email: z.string().email(),
  phone: z.string().nullish(),
  location: z.string().nullish(),
});

export type ProfileUpsert = z.infer<typeof profileUpsert>;
