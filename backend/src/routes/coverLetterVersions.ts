import { Router } from "express";
import { getAnthropicClient } from "../anthropicClient.js";
import type { CoverLetterContent, CoverLetterParagraph } from "../coverLetterContent.js";
import { checkGrounding } from "../grounding/checkGrounding.js";
import type { LedgerAchievement } from "../llm/generateResumeDraft.js";
import { generateCoverLetterDraft } from "../llm/generateCoverLetterDraft.js";
import { fetchLedgerContext } from "../ledgerContext.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { renderCoverLetterDocx } from "../rendering/renderCoverLetterDocx.js";
import { renderCoverLetterPdf } from "../rendering/renderCoverLetterPdf.js";
import { coverLetterVersionCreate, coverLetterVersionRevise } from "../schemas/coverLetterVersion.js";
import { getUserSupabaseClient } from "../supabaseClients.js";

export const coverLetterVersionsRouter = Router();

coverLetterVersionsRouter.use(requireAuth);

function buildVersionRow(
  userId: string,
  postingId: string,
  greeting: string,
  bodyParagraphs: CoverLetterParagraph[],
  closing: string,
  achievements: LedgerAchievement[],
) {
  // Only body paragraphs make factual claims about the candidate -- the
  // greeting/closing are boilerplate, so grounding runs on the paragraphs
  // alone (see 0006_cover_letter_versions.sql).
  const grounding = checkGrounding(bodyParagraphs, achievements);
  const citedAchievementIds = Array.from(
    new Set(bodyParagraphs.flatMap((paragraph) => paragraph.achievement_ids)),
  );
  const content: CoverLetterContent = { greeting, body_paragraphs: bodyParagraphs, closing };

  return {
    user_id: userId,
    posting_id: postingId,
    content,
    cited_achievement_ids: citedAchievementIds,
    verification_status: grounding.status,
    verification_notes: grounding.notes,
  };
}

coverLetterVersionsRouter.get("", async (req, res) => {
  const client = getUserSupabaseClient((req as AuthedRequest).token);
  let query = client.from("cover_letter_versions").select("*").order("created_at", { ascending: false });
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

coverLetterVersionsRouter.get("/:coverLetterVersionId", async (req, res) => {
  const client = getUserSupabaseClient((req as AuthedRequest).token);
  const { data, error } = await client
    .from("cover_letter_versions")
    .select("*")
    .eq("id", req.params.coverLetterVersionId);
  if (error || !data?.length) {
    res.status(404).json({ detail: "Cover letter version not found" });
    return;
  }
  res.json(data[0]);
});

coverLetterVersionsRouter.post("", validateBody(coverLetterVersionCreate), async (req, res) => {
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
    draft = await generateCoverLetterDraft(getAnthropicClient(), posting, ledger.roles, ledger.achievements);
  } catch (error) {
    res.status(502).json({ detail: `Cover letter generation failed: ${(error as Error).message}` });
    return;
  }

  const { data, error } = await client
    .from("cover_letter_versions")
    .insert(
      buildVersionRow(
        userId,
        postingId,
        draft.greeting,
        draft.body_paragraphs,
        draft.closing,
        ledger.achievements,
      ),
    )
    .select()
    .single();
  if (error) {
    res.status(400).json({ detail: error.message });
    return;
  }
  res.status(201).json(data);
});

coverLetterVersionsRouter.post(
  "/:coverLetterVersionId/revise",
  validateBody(coverLetterVersionRevise),
  async (req, res) => {
    const { token, userId } = req as AuthedRequest;
    const client = getUserSupabaseClient(token);

    const { data: original, error: originalError } = await client
      .from("cover_letter_versions")
      .select("posting_id")
      .eq("id", req.params.coverLetterVersionId)
      .single();
    if (originalError || !original) {
      res.status(404).json({ detail: "Cover letter version not found" });
      return;
    }

    const ledger = await fetchLedgerContext(client);
    if (!ledger.ok) {
      res.status(ledger.status).json({ detail: ledger.detail });
      return;
    }

    const { greeting, body_paragraphs: bodyParagraphs, closing } = req.body as {
      greeting: string;
      body_paragraphs: CoverLetterParagraph[];
      closing: string;
    };
    const { data, error } = await client
      .from("cover_letter_versions")
      .insert(
        buildVersionRow(userId, original.posting_id, greeting, bodyParagraphs, closing, ledger.achievements),
      )
      .select()
      .single();
    if (error) {
      res.status(400).json({ detail: error.message });
      return;
    }
    res.status(201).json(data);
  },
);

coverLetterVersionsRouter.post("/:coverLetterVersionId/approve", async (req, res) => {
  const client = getUserSupabaseClient((req as AuthedRequest).token);

  const { data: existing, error: fetchError } = await client
    .from("cover_letter_versions")
    .select("*")
    .eq("id", req.params.coverLetterVersionId)
    .single();
  if (fetchError || !existing) {
    res.status(404).json({ detail: "Cover letter version not found" });
    return;
  }
  if (existing.approved_at) {
    res.json(existing);
    return;
  }

  const { data, error } = await client
    .from("cover_letter_versions")
    .update({ approved_at: new Date().toISOString() })
    .eq("id", req.params.coverLetterVersionId)
    .select()
    .single();
  if (error) {
    res.status(400).json({ detail: error.message });
    return;
  }
  res.json(data);
});

coverLetterVersionsRouter.get("/:coverLetterVersionId/render", async (req, res) => {
  const client = getUserSupabaseClient((req as AuthedRequest).token);
  const format = req.query.format;
  if (format !== "pdf" && format !== "docx") {
    res.status(400).json({ detail: "format must be 'pdf' or 'docx'" });
    return;
  }

  const { data: version, error: versionError } = await client
    .from("cover_letter_versions")
    .select("*")
    .eq("id", req.params.coverLetterVersionId)
    .single();
  if (versionError || !version) {
    res.status(404).json({ detail: "Cover letter version not found" });
    return;
  }
  if (!version.approved_at) {
    res.status(400).json({ detail: "Only approved cover letter versions can be rendered" });
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
    const pdf = await renderCoverLetterPdf(profile, version.content);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=cover-letter.pdf");
    res.send(pdf);
    return;
  }

  const docx = await renderCoverLetterDocx(profile, version.content);
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  );
  res.setHeader("Content-Disposition", "attachment; filename=cover-letter.docx");
  res.send(docx);
});
