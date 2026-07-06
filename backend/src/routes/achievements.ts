import type { SupabaseClient } from "@supabase/supabase-js";
import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { achievementCreate, achievementUpdate } from "../schemas/achievement.js";
import { getUserSupabaseClient } from "../supabaseClients.js";

export const achievementsRouter = Router();

achievementsRouter.use(requireAuth);

async function loadSkillIds(client: SupabaseClient, achievementId: string): Promise<string[]> {
  const { data } = await client
    .from("achievement_skills")
    .select("skill_id")
    .eq("achievement_id", achievementId);
  return (data ?? []).map((row) => row.skill_id as string);
}

async function attachSkillIds(
  achievement: Record<string, unknown>,
  client: SupabaseClient,
): Promise<Record<string, unknown>> {
  achievement.skill_ids = await loadSkillIds(client, achievement.id as string);
  return achievement;
}

function definedEntries(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

achievementsRouter.get("", async (req, res) => {
  const client = getUserSupabaseClient((req as AuthedRequest).token);
  const { data, error } = await client
    .from("achievements")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    res.status(400).json({ detail: error.message });
    return;
  }
  const withSkills = await Promise.all(data.map((a) => attachSkillIds(a, client)));
  res.json(withSkills);
});

achievementsRouter.post("", validateBody(achievementCreate), async (req, res) => {
  const { token, userId } = req as AuthedRequest;
  const client = getUserSupabaseClient(token);
  const { skill_ids: skillIds, ...rest } = req.body;

  const { data: created, error } = await client
    .from("achievements")
    .insert({ ...rest, user_id: userId })
    .select()
    .single();
  if (error) {
    res.status(400).json({ detail: error.message });
    return;
  }

  if (skillIds?.length) {
    const links = skillIds.map((skillId: string) => ({
      user_id: userId,
      achievement_id: created.id,
      skill_id: skillId,
    }));
    await client.from("achievement_skills").insert(links);
  }

  res.status(201).json(await attachSkillIds(created, client));
});

async function fetchAchievement(client: SupabaseClient, achievementId: string) {
  const { data, error } = await client
    .from("achievements")
    .select("*")
    .eq("id", achievementId);
  if (error || !data?.length) {
    return null;
  }
  return attachSkillIds(data[0], client);
}

achievementsRouter.get("/:achievementId", async (req, res) => {
  const client = getUserSupabaseClient((req as AuthedRequest).token);
  const achievement = await fetchAchievement(client, req.params.achievementId);
  if (!achievement) {
    res.status(404).json({ detail: "Achievement not found" });
    return;
  }
  res.json(achievement);
});

achievementsRouter.patch("/:achievementId", validateBody(achievementUpdate), async (req, res) => {
  const { token, userId } = req as AuthedRequest;
  const client = getUserSupabaseClient(token);
  const achievementId = req.params.achievementId as string;
  const { skill_ids: skillIds, ...rest } = req.body;
  const fields = definedEntries(rest);

  if (Object.keys(fields).length > 0) {
    const { data, error } = await client
      .from("achievements")
      .update(fields)
      .eq("id", achievementId)
      .select();
    if (error || !data?.length) {
      res.status(404).json({ detail: "Achievement not found" });
      return;
    }
  }

  if (skillIds !== undefined) {
    await client.from("achievement_skills").delete().eq("achievement_id", achievementId);
    if (skillIds.length) {
      const links = skillIds.map((skillId: string) => ({
        user_id: userId,
        achievement_id: achievementId,
        skill_id: skillId,
      }));
      await client.from("achievement_skills").insert(links);
    }
  }

  const achievement = await fetchAchievement(client, achievementId);
  if (!achievement) {
    res.status(404).json({ detail: "Achievement not found" });
    return;
  }
  res.json(achievement);
});

achievementsRouter.delete("/:achievementId", async (req, res) => {
  const client = getUserSupabaseClient((req as AuthedRequest).token);
  await client.from("achievements").delete().eq("id", req.params.achievementId);
  res.status(204).send();
});
