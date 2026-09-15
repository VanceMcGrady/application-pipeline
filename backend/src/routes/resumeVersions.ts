import { Router } from "express";
import { getAnthropicClient } from "../anthropicClient.js";
import { checkGrounding } from "../grounding/checkGrounding.js";
import { generateResumeDraft } from "../llm/generateResumeDraft.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { resumeVersionCreate } from "../schemas/resumeVersion.js";
import { getUserSupabaseClient } from "../supabaseClients.js";

export const resumeVersionsRouter = Router();

resumeVersionsRouter.use(requireAuth);

resumeVersionsRouter.get("", async (req, res) => {
  const client = getUserSupabaseClient((req as AuthedRequest).token);
  let query = client.from("resume_versions").select("*").order("created_at", { ascending: false });
  if (typeof req.query.posting_id === "string") {
    query = query.eq("posting_id", req.query.posting_id);
  }
  const { data, error } = await query;
  if (error) {
    res.status(400).json({ detail: error.message });
    return;
  }
  res.json(data);
});

resumeVersionsRouter.get("/:resumeVersionId", async (req, res) => {
  const client = getUserSupabaseClient((req as AuthedRequest).token);
  const { data, error } = await client
    .from("resume_versions")
    .select("*")
    .eq("id", req.params.resumeVersionId);
  if (error || !data?.length) {
    res.status(404).json({ detail: "Resume version not found" });
    return;
  }
  res.json(data[0]);
});

resumeVersionsRouter.post("", validateBody(resumeVersionCreate), async (req, res) => {
  const { token, userId } = req as AuthedRequest;
  const client = getUserSupabaseClient(token);
  const postingId = req.body.posting_id as string;

  const { data: posting, error: postingError } = await client
    .from("postings")
    .select("*")
    .eq("id", postingId)
    .single();
  if (postingError || !posting) {
    res.status(404).json({ detail: "Posting not found" });
    return;
  }

  const [{ data: roles, error: rolesError }, { data: achievements, error: achievementsError }] =
    await Promise.all([
      client.from("roles").select("*"),
      client.from("achievements").select("*").eq("status", "active"),
    ]);
  if (rolesError || achievementsError) {
    res.status(400).json({ detail: (rolesError ?? achievementsError)!.message });
    return;
  }
  if (!achievements?.length) {
    res.status(400).json({ detail: "No active ledger achievements to draw from" });
    return;
  }

  let draft;
  try {
    draft = await generateResumeDraft(getAnthropicClient(), posting.raw_text, roles ?? [], achievements);
  } catch (error) {
    res.status(502).json({ detail: `Resume generation failed: ${(error as Error).message}` });
    return;
  }

  const grounding = checkGrounding(draft.bullets, achievements);
  const citedAchievementIds = Array.from(new Set(draft.bullets.flatMap((bullet) => bullet.achievement_ids)));

  const { data, error } = await client
    .from("resume_versions")
    .insert({
      user_id: userId,
      posting_id: postingId,
      content: draft,
      cited_achievement_ids: citedAchievementIds,
      verification_status: grounding.status,
      verification_notes: grounding.notes,
    })
    .select()
    .single();
  if (error) {
    res.status(400).json({ detail: error.message });
    return;
  }
  res.status(201).json(data);
});
