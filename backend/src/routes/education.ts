import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { educationCreate, educationUpdate } from "../schemas/education.js";
import { getUserSupabaseClient } from "../supabaseClients.js";

export const educationRouter = Router();

educationRouter.use(requireAuth);

educationRouter.get("", async (req, res) => {
  const client = getUserSupabaseClient((req as AuthedRequest).token);
  const { data, error } = await client.from("education").select("*").order("institution");
  if (error) {
    res.status(400).json({ detail: error.message });
    return;
  }
  res.json(data);
});

educationRouter.post("", validateBody(educationCreate), async (req, res) => {
  const { token, userId } = req as AuthedRequest;
  const client = getUserSupabaseClient(token);
  const payload = { ...req.body, user_id: userId };
  const { data, error } = await client.from("education").insert(payload).select().single();
  if (error) {
    res.status(400).json({ detail: error.message });
    return;
  }
  res.status(201).json(data);
});

educationRouter.get("/:educationId", async (req, res) => {
  const client = getUserSupabaseClient((req as AuthedRequest).token);
  const { data, error } = await client
    .from("education")
    .select("*")
    .eq("id", req.params.educationId);
  if (error || !data?.length) {
    res.status(404).json({ detail: "Education entry not found" });
    return;
  }
  res.json(data[0]);
});

educationRouter.patch("/:educationId", validateBody(educationUpdate), async (req, res) => {
  if (Object.keys(req.body).length === 0) {
    res.status(400).json({ detail: "No fields to update" });
    return;
  }
  const client = getUserSupabaseClient((req as AuthedRequest).token);
  const { data, error } = await client
    .from("education")
    .update(req.body)
    .eq("id", req.params.educationId)
    .select();
  if (error || !data?.length) {
    res.status(404).json({ detail: "Education entry not found" });
    return;
  }
  res.json(data[0]);
});

educationRouter.delete("/:educationId", async (req, res) => {
  const client = getUserSupabaseClient((req as AuthedRequest).token);
  await client.from("education").delete().eq("id", req.params.educationId);
  res.status(204).send();
});
