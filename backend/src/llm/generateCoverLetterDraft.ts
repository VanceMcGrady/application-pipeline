import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { LedgerAchievement, LedgerRole } from "./generateResumeDraft.js";

const coverLetterDraftSchema = z.object({
  greeting: z.string(),
  body_paragraphs: z.array(
    z.object({
      achievement_ids: z.array(z.string()).min(1),
      text: z.string(),
    }),
  ),
  closing: z.string(),
});

export type CoverLetterDraft = z.infer<typeof coverLetterDraftSchema>;

export type PostingSummary = {
  company: string;
  title: string;
  raw_text: string;
};

const SYSTEM_PROMPT = `You write cover letters for a job applicant. The greeting and closing are
boilerplate only -- e.g. "Dear Hiring Team," and "Sincerely," -- and must
never name a specific hiring manager (you have no way to know one) or
contain any factual claim about the candidate. Every body paragraph is
where the candidate's actual case is made, and you may ONLY select and
rephrase content from the ledger entries provided below -- never invent a
number, technology, employer, or claim that is not already present in an
entry's description or metrics. Every body paragraph must cite the id(s)
of the achievement entry/entries it was drawn from in "achievement_ids".
If a posting's requirements have no matching ledger entry, omit that
requirement rather than fabricating a paragraph for it. Write 2-4 body
paragraphs.`;

function formatLedger(roles: LedgerRole[], achievements: LedgerAchievement[]): string {
  const rolesById = new Map(roles.map((role) => [role.id, role]));
  return achievements
    .map((achievement) => {
      const role = rolesById.get(achievement.role_id);
      const roleLabel = role ? `${role.title} at ${role.company}` : "unknown role";
      const metrics = achievement.metrics
        .map((metric) => `${metric.value} ${metric.unit} (${metric.label})`)
        .join("; ");
      return [
        `id: ${achievement.id}`,
        `role: ${roleLabel}`,
        `title: ${achievement.title}`,
        `description: ${achievement.description}`,
        metrics ? `metrics: ${metrics}` : null,
        achievement.skills_tags.length ? `skills: ${achievement.skills_tags.join(", ")}` : null,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");
}

export async function generateCoverLetterDraft(
  client: Anthropic,
  posting: PostingSummary,
  roles: LedgerRole[],
  achievements: LedgerAchievement[],
): Promise<CoverLetterDraft> {
  const response = await client.messages.parse({
    model: "claude-opus-5",
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Job posting at ${posting.company} for "${posting.title}":\n${posting.raw_text}\n\nLedger entries you may draw from:\n${formatLedger(roles, achievements)}\n\nGenerate a tailored cover letter citing the ledger entries used in each body paragraph.`,
      },
    ],
    output_config: { format: zodOutputFormat(coverLetterDraftSchema) },
  });

  if (!response.parsed_output) {
    throw new Error("Model response did not match the expected cover letter draft schema");
  }

  return response.parsed_output;
}
