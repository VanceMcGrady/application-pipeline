export type LedgerAchievement = {
  id: string;
  description: string;
  metrics: { value: string; unit: string; label: string }[];
  skills_tags: string[];
};

export type ResumeBullet = {
  achievement_ids: string[];
  text: string;
};

export type GroundingResult = {
  status: "passed" | "flagged";
  notes: string[];
};

const NUMBER_PATTERN = /\$?\d+(?:,\d{3})*(?:\.\d+)?%?[kmbKMB]?\+?/g;

function achievementText(achievement: LedgerAchievement): string {
  const metricText = achievement.metrics
    .map((metric) => {
      // No space before symbol-like units (%, $) so "40" + "%" reads as the
      // same "40%" token a bullet would claim; a space otherwise ("40 hours").
      const joiner = /^[a-zA-Z]/.test(metric.unit) ? " " : "";
      return `${metric.value}${joiner}${metric.unit} ${metric.label}`;
    })
    .join(" ");
  return `${achievement.description} ${metricText}`;
}

function extractNumbers(text: string): string[] {
  return text.match(NUMBER_PATTERN) ?? [];
}

/**
 * Deterministic, non-LLM verification of a generated resume draft against
 * the ledger entries it cites (CLAUDE.md principle 2). Flags, never
 * silently fixes: a flagged bullet is surfaced for human review, not
 * dropped or rewritten.
 */
export function checkGrounding(
  bullets: ResumeBullet[],
  achievements: LedgerAchievement[],
): GroundingResult {
  const byId = new Map(achievements.map((achievement) => [achievement.id, achievement]));
  const notes: string[] = [];

  bullets.forEach((bullet, index) => {
    if (bullet.achievement_ids.length === 0) {
      notes.push(`Bullet ${index + 1} cites no ledger entry: "${bullet.text}"`);
      return;
    }

    const cited = bullet.achievement_ids.map((id) => byId.get(id));
    const missingIds = bullet.achievement_ids.filter((id) => !byId.has(id));
    if (missingIds.length > 0) {
      notes.push(
        `Bullet ${index + 1} cites unknown ledger entry id(s) ${missingIds.join(", ")}: "${bullet.text}"`,
      );
      return;
    }

    const citedText = cited
      .filter((achievement): achievement is LedgerAchievement => achievement !== undefined)
      .map(achievementText)
      .join(" ");
    const citedSkillTags = new Set(
      cited.flatMap((achievement) => achievement?.skills_tags ?? []),
    );

    for (const number of extractNumbers(bullet.text)) {
      if (!citedText.includes(number)) {
        notes.push(
          `Bullet ${index + 1} claims "${number}", not found in its cited ledger entry: "${bullet.text}"`,
        );
      }
    }

    // Flag any skill/technology term drawn from the wider ledger vocabulary
    // that appears in the bullet but isn't tagged on the entry it cites --
    // e.g. citing a "backend rewrite" achievement tagged ["Go"] but the
    // bullet claims "Kubernetes" because another achievement mentions it.
    const allSkillTags = new Set(achievements.flatMap((achievement) => achievement.skills_tags));
    for (const tag of allSkillTags) {
      const mentioned = new RegExp(`\\b${escapeRegExp(tag)}\\b`, "i").test(bullet.text);
      if (mentioned && !citedSkillTags.has(tag)) {
        notes.push(
          `Bullet ${index + 1} mentions "${tag}", not tagged on its cited ledger entry: "${bullet.text}"`,
        );
      }
    }
  });

  return { status: notes.length === 0 ? "passed" : "flagged", notes };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
