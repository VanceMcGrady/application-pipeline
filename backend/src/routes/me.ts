import { createClient } from "@supabase/supabase-js";
import { Router } from "express";
import { settings } from "../config.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";

export const meRouter = Router();

/** Proves the auth wiring end to end: given a caller's JWT, ask Supabase who they are. */
meRouter.get("/me", requireAuth, async (req, res) => {
  const { token } = req as AuthedRequest;
  const client = createClient(settings.supabaseUrl, settings.supabaseAnonKey);

  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) {
    res.status(401).json({ detail: "Invalid or expired session" });
    return;
  }

  res.json({ id: data.user.id, email: data.user.email ?? null });
});
