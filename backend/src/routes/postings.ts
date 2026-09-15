import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { postingCreate } from "../schemas/posting.js";
import { getUserSupabaseClient } from "../supabaseClients.js";

export const postingsRouter = Router();

postingsRouter.use(requireAuth);

postingsRouter.get("", async (req, res) => {
  const client = getUserSupabaseClient((req as AuthedRequest).token);
  const { data, error } = await client
    .from("postings")
    .select("*")
    .order("date_added", { ascending: false });
  if (error) {
    res.status(400).json({ detail: error.message });
    return;
  }
  res.json(data);
});

postingsRouter.post("", validateBody(postingCreate), async (req, res) => {
  const { token, userId } = req as AuthedRequest;
  const client = getUserSupabaseClient(token);
  const payload = { ...req.body, user_id: userId };
  const { data, error } = await client.from("postings").insert(payload).select().single();
  if (error) {
    res.status(400).json({ detail: error.message });
    return;
  }
  res.status(201).json(data);
});

postingsRouter.delete("/:postingId", async (req, res) => {
  const client = getUserSupabaseClient((req as AuthedRequest).token);
  await client.from("postings").delete().eq("id", req.params.postingId);
  res.status(204).send();
});
