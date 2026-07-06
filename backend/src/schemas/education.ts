import { z } from "zod";

export const educationCreate = z.object({
  institution: z.string(),
  credential: z.string(),
  completed: z.boolean().default(false),
  notes: z.string().nullish(),
});

export const educationUpdate = educationCreate.partial();

export type EducationCreate = z.infer<typeof educationCreate>;
export type EducationUpdate = z.infer<typeof educationUpdate>;
