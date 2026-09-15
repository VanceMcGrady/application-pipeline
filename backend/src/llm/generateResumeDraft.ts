import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

const resumeDraftSchema = z.object({
  bullets: z.array(
    z.object({
      achievement_ids: z.array(z.string()).min(1),
      text: z.string(),
    }),
  ),
});

export type ResumeDraft = z.infer<typeof resumeDraftSchema>;

export type LedgerRole = {
  id: string;
  company: string;
  title: string;
  start_date: string;
  end_date: string | null;
};

export type LedgerAchievement = {
  id: string;
  role_id: string;
  title: string;
  description: string;
  metrics: { value: string; unit: string; label: string }[];
  skills_tags: string[];
};

const SYSTEM_PROMPT = `You write resume bullets for a job applicant. You may ONLY select and
rephrase content from the ledger entries provided below -- never invent a
number, technology, employer, or claim that is not already present in an
entry's description or metrics. Every bullet must cite the id(s) of the
achievement entry/entries it was drawn from in "achievement_ids". If a
posting's requirements have no matching ledger entry, omit that
requirement rather than fabricating a bullet for it.`;

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

export async function generateResumeDraft(
  client: Anthropic,
  postingText: string,
  roles: LedgerRole[],
  achievements: LedgerAchievement[],
): Promise<ResumeDraft> {
  const response = await client.messages.parse({
    model: "claude-opus-5",
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Job posting:\n${postingText}\n\nLedger entries you may draw from:\n${formatLedger(roles, achievements)}\n\nGenerate tailored resume bullets citing the ledger entries used.`,
      },
    ],
    output_config: { format: zodOutputFormat(resumeDraftSchema) },
  });

  if (!response.parsed_output) {
    throw new Error("Model response did not match the expected resume draft schema");
  }

  return response.parsed_output;
}
