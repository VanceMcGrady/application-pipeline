import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { skillCreate, skillUpdate } from "../schemas/skill.js";
import { getUserSupabaseClient } from "../supabaseClients.js";

export const skillsRouter = Router();

skillsRouter.use(requireAuth);

skillsRouter.get("", async (req, res) => {
  const client = getUserSupabaseClient((req as AuthedRequest).token);
  const { data, error } = await client.from("skills").select("*").order("name");
  if (error) {
    res.status(400).json({ detail: error.message });
    return;
  }
  res.json(data);
});

skillsRouter.post("", validateBody(skillCreate), async (req, res) => {
  const { token, userId } = req as AuthedRequest;
  const client = getUserSupabaseClient(token);
  const payload = { ...req.body, user_id: userId };
  const { data, error } = await client.from("skills").insert(payload).select().single();
  if (error) {
    res.status(400).json({ detail: error.message });
    return;
  }
  res.status(201).json(data);
});

skillsRouter.get("/:skillId", async (req, res) => {
  const client = getUserSupabaseClient((req as AuthedRequest).token);
  const { data, error } = await client
    .from("skills")
    .select("*")
    .eq("id", req.params.skillId);
  if (error || !data?.length) {
    res.status(404).json({ detail: "Skill not found" });
    return;
  }
  res.json(data[0]);
});

skillsRouter.patch("/:skillId", validateBody(skillUpdate), async (req, res) => {
  if (Object.keys(req.body).length === 0) {
    res.status(400).json({ detail: "No fields to update" });
    return;
  }
  const client = getUserSupabaseClient((req as AuthedRequest).token);
  const { data, error } = await client
    .from("skills")
    .update(req.body)
    .eq("id", req.params.skillId)
    .select();
  if (error || !data?.length) {
    res.status(404).json({ detail: "Skill not found" });
    return;
  }
  res.json(data[0]);
});

skillsRouter.delete("/:skillId", async (req, res) => {
  const client = getUserSupabaseClient((req as AuthedRequest).token);
  await client.from("skills").delete().eq("id", req.params.skillId);
  res.status(204).send();
});
