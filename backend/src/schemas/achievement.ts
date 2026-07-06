import { z } from "zod";
import { achievementStatus, isoDate, metric, sensitivity } from "./common.js";

const uuid = z.string().uuid();

export const achievementCreate = z.object({
  role_id: uuid,
  title: z.string(),
  description: z.string(),
  metrics: z.array(metric).default([]),
  scope_tags: z.array(z.string()).default([]),
  verification_note: z.string().nullish(),
  sensitivity: sensitivity.default("public"),
  status: achievementStatus.default("active"),
  last_reviewed: isoDate.nullish(),
  skill_ids: z.array(uuid).default([]),
});

export const achievementUpdate = achievementCreate.partial();

export type AchievementCreate = z.infer<typeof achievementCreate>;
export type AchievementUpdate = z.infer<typeof achievementUpdate>;
