import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { trackedBoardCreate } from "../schemas/board.js";
import { getUserSupabaseClient } from "../supabaseClients.js";

export const boardsRouter = Router();

boardsRouter.use(requireAuth);

boardsRouter.get("", async (req, res) => {
  const client = getUserSupabaseClient((req as AuthedRequest).token);
  const { data, error } = await client
    .from("ats_boards")
    .select("*")
    .order("company_name", { ascending: true });
  if (error) {
    res.status(400).json({ detail: error.message });
    return;
  }
  res.json(data);
});

boardsRouter.get("/tracked", async (req, res) => {
  const client = getUserSupabaseClient((req as AuthedRequest).token);
  const { data, error } = await client
    .from("user_tracked_boards")
    .select("*, ats_boards(*)")
    .order("created_at", { ascending: false });
  if (error) {
    res.status(400).json({ detail: error.message });
    return;
  }
  res.json(data);
});

boardsRouter.post("/tracked", validateBody(trackedBoardCreate), async (req, res) => {
  const { token, userId } = req as AuthedRequest;
  const client = getUserSupabaseClient(token);
  const boardId = req.body.board_id as string;

  const { error: insertError } = await client
    .from("user_tracked_boards")
    .insert({ user_id: userId, board_id: boardId });
  // 23505 = unique_violation: already tracked, treat as a no-op success.
  if (insertError && insertError.code !== "23505") {
    res.status(400).json({ detail: insertError.message });
    return;
  }

  const { data, error: fetchError } = await client
    .from("user_tracked_boards")
    .select("*, ats_boards(*)")
    .eq("board_id", boardId)
    .single();
  if (fetchError || !data) {
    res.status(404).json({ detail: "Board not found" });
    return;
  }
  res.status(201).json(data);
});

boardsRouter.delete("/tracked/:boardId", async (req, res) => {
  const client = getUserSupabaseClient((req as AuthedRequest).token);
  await client.from("user_tracked_boards").delete().eq("board_id", req.params.boardId);
  res.status(204).send();
});
