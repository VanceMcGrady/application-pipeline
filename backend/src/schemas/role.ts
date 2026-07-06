import { z } from "zod";
import { isoDate } from "./common.js";

export const roleCreate = z.object({
  company: z.string(),
  title: z.string(),
  start_date: isoDate,
  end_date: isoDate.nullish(),
  location: z.string().nullish(),
  one_line_summary: z.string().nullish(),
});

export const roleUpdate = roleCreate.partial();

export type RoleCreate = z.infer<typeof roleCreate>;
export type RoleUpdate = z.infer<typeof roleUpdate>;
