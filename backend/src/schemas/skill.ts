import { z } from "zod";
import { isoDate } from "./common.js";

export const skillCreate = z.object({
  name: z.string(),
  category: z.string().nullish(),
  first_used: isoDate.nullish(),
  last_used: isoDate.nullish(),
});

export const skillUpdate = skillCreate.partial();

export type SkillCreate = z.infer<typeof skillCreate>;
export type SkillUpdate = z.infer<typeof skillUpdate>;
