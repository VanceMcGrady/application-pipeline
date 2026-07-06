import { z } from "zod";

export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const confidence = z.enum(["exact", "approximate", "rough"]);
export const sensitivity = z.enum(["public", "interview-only", "confidential-general-only"]);
export const achievementStatus = z.enum(["active", "retired"]);

export const metric = z.object({
  value: z.number(),
  unit: z.string(),
  label: z.string(),
  confidence,
});

export type Metric = z.infer<typeof metric>;
