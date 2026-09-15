import type { SupabaseClient } from "@supabase/supabase-js";
import { Router } from "express";
import { getAnthropicClient } from "../anthropicClient.js";
import { checkGrounding, type ResumeBullet } from "../grounding/checkGrounding.js";
import { generateResumeDraft, type LedgerAchievement, type LedgerRole } from "../llm/generateResumeDraft.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { renderResumeDocx } from "../rendering/renderResumeDocx.js";
import { renderResumePdf } from "../rendering/renderResumePdf.js";
import { enrichBullets } from "../resumeContent.js";
import { resumeVersionCreate, resumeVersionRevise } from "../schemas/resumeVersion.js";
import { getUserSupabaseClient } from "../supabaseClients.js";

export const resumeVersionsRouter = Router();

resumeVersionsRouter.use(requireAuth);

async function fetchLedgerContext(
  client: SupabaseClient,
): Promise<
  | { ok: true; roles: LedgerRole[]; achievements: LedgerAchievement[] }
  | { ok: false; status: number; detail: string }
> {
  const [{ data: roles, error: rolesError }, { data: achievementRows, error: achievementsError }] =
    await Promise.all([
      client.from("roles").select("*"),
      client
        .from("achievements")
        .select("*, achievement_skills(skills(name))")
        .eq("status", "active")
        .eq("sensitivity", "public"),
    ]);
  if (rolesError || achievementsError) {
    return { ok: false, status: 400, detail: (rolesError ?? achievementsError)!.message };
  }
  // Skills are linked via achievement_skills -> skills, not a column on
  // achievements -- flatten the joined names into skills_tags for the
  // generation prompt and the grounding check's technology-term vocabulary.
  const achievements = (achievementRows ?? []).map((row) => {
    const { achievement_skills, ...achievement } = row as Record<string, unknown> & {
      achievement_skills?: { skills: { name: string } | null }[];
    };
    return {
      ...achievement,
      skills_tags: (achievement_skills ?? [])
        .map((link) => link.skills?.name)
        .filter((name): name is string => Boolean(name)),
    } as LedgerAchievement;
  });
  if (!achievements.length) {
    return { ok: false, status: 400, detail: "No active, public ledger achievements to draw from" };
  }
  return { ok: true, roles: roles ?? [], achievements };
}

function buildVersionRow(
  userId: string,
  postingId: string,
  bullets: ResumeBullet[],
  achievements: LedgerAchievement[],
  roles: LedgerRole[],
) {
  const grounding = checkGrounding(bullets, achievements);
  const enrichedBullets = enrichBullets(bullets, achievements, roles);
  const citedAchievementIds = Array.from(new Set(bullets.flatMap((bullet) => bullet.achievement_ids)));

  return {
    user_id: userId,
    posting_id: postingId,
    content: { bullets: enrichedBullets },
    cited_achievement_ids: citedAchievementIds,
    verification_status: grounding.status,
    verification_notes: grounding.notes,
  };
}

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

  const ledger = await fetchLedgerContext(client);
  if (!ledger.ok) {
    res.status(ledger.status).json({ detail: ledger.detail });
    return;
  }

  let draft;
  try {
    draft = await generateResumeDraft(getAnthropicClient(), posting.raw_text, ledger.roles, ledger.achievements);
  } catch (error) {
    res.status(502).json({ detail: `Resume generation failed: ${(error as Error).message}` });
    return;
  }

  const { data, error } = await client
    .from("resume_versions")
    .insert(buildVersionRow(userId, postingId, draft.bullets, ledger.achievements, ledger.roles))
    .select()
    .single();
  if (error) {
    res.status(400).json({ detail: error.message });
    return;
  }
  res.status(201).json(data);
});

resumeVersionsRouter.post(
  "/:resumeVersionId/revise",
  validateBody(resumeVersionRevise),
  async (req, res) => {
    const { token, userId } = req as AuthedRequest;
    const client = getUserSupabaseClient(token);

    const { data: original, error: originalError } = await client
      .from("resume_versions")
      .select("posting_id")
      .eq("id", req.params.resumeVersionId)
      .single();
    if (originalError || !original) {
      res.status(404).json({ detail: "Resume version not found" });
      return;
    }

    const ledger = await fetchLedgerContext(client);
    if (!ledger.ok) {
      res.status(ledger.status).json({ detail: ledger.detail });
      return;
    }

    const bullets = req.body.bullets as ResumeBullet[];
    const { data, error } = await client
      .from("resume_versions")
      .insert(buildVersionRow(userId, original.posting_id, bullets, ledger.achievements, ledger.roles))
      .select()
      .single();
    if (error) {
      res.status(400).json({ detail: error.message });
      return;
    }
    res.status(201).json(data);
  },
);

resumeVersionsRouter.post("/:resumeVersionId/approve", async (req, res) => {
  const client = getUserSupabaseClient((req as AuthedRequest).token);

  const { data: existing, error: fetchError } = await client
    .from("resume_versions")
    .select("*")
    .eq("id", req.params.resumeVersionId)
    .single();
  if (fetchError || !existing) {
    res.status(404).json({ detail: "Resume version not found" });
    return;
  }
  if (existing.approved_at) {
    res.json(existing);
    return;
  }

  const { data, error } = await client
    .from("resume_versions")
    .update({ approved_at: new Date().toISOString() })
    .eq("id", req.params.resumeVersionId)
    .select()
    .single();
  if (error) {
    res.status(400).json({ detail: error.message });
    return;
  }
  res.json(data);
});

resumeVersionsRouter.get("/:resumeVersionId/render", async (req, res) => {
  const client = getUserSupabaseClient((req as AuthedRequest).token);
  const format = req.query.format;
  if (format !== "pdf" && format !== "docx") {
    res.status(400).json({ detail: "format must be 'pdf' or 'docx'" });
    return;
  }

  const { data: version, error: versionError } = await client
    .from("resume_versions")
    .select("*")
    .eq("id", req.params.resumeVersionId)
    .single();
  if (versionError || !version) {
    res.status(404).json({ detail: "Resume version not found" });
    return;
  }
  if (!version.approved_at) {
    res.status(400).json({ detail: "Only approved resume versions can be rendered" });
    return;
  }

  const { data: profile, error: profileError } = await client.from("profile").select("*").maybeSingle();
  if (profileError) {
    res.status(400).json({ detail: profileError.message });
    return;
  }
  if (!profile) {
    res.status(400).json({ detail: "Add your profile info before rendering" });
    return;
  }

  if (format === "pdf") {
    const pdf = await renderResumePdf(profile, version.content);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=resume.pdf");
    res.send(pdf);
    return;
  }

  const docx = await renderResumeDocx(profile, version.content);
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  );
  res.setHeader("Content-Disposition", "attachment; filename=resume.docx");
  res.send(docx);
});
