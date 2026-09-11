import { z } from "zod";

export const trackedBoardCreate = z.object({
  board_id: z.string().uuid(),
});

export type TrackedBoardCreate = z.infer<typeof trackedBoardCreate>;
