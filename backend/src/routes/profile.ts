import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { profileUpsert } from "../schemas/profile.js";
import { getUserSupabaseClient } from "../supabaseClients.js";

export const profileRouter = Router();

profileRouter.use(requireAuth);

profileRouter.get("", async (req, res) => {
  const client = getUserSupabaseClient((req as AuthedRequest).token);
  const { data, error } = await client.from("profile").select("*").maybeSingle();
  if (error) {
    res.status(400).json({ detail: error.message });
    return;
  }
  res.json(data);
});

profileRouter.put("", validateBody(profileUpsert), async (req, res) => {
  const { token, userId } = req as AuthedRequest;
  const client = getUserSupabaseClient(token);
  const payload = { ...req.body, user_id: userId, updated_at: new Date().toISOString() };
  const { data, error } = await client
    .from("profile")
    .upsert(payload, { onConflict: "user_id" })
    .select()
    .single();
  if (error) {
    res.status(400).json({ detail: error.message });
    return;
  }
  res.json(data);
});
