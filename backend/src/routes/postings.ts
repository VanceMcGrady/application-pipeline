import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
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
