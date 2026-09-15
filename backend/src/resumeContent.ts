import type { ResumeBullet } from "./grounding/checkGrounding.js";
import type { LedgerAchievement, LedgerRole } from "./llm/generateResumeDraft.js";

export type BulletRole = {
  id: string;
  company: string;
  title: string;
  start_date: string;
  end_date: string | null;
};

export type EnrichedBullet = ResumeBullet & { role: BulletRole | null };

export type ResumeContent = { bullets: EnrichedBullet[] };

/**
 * Denormalizes each bullet's role (company/title/dates) at write time so a
 * rendered resume never depends on live ledger state -- editing or retiring
 * the underlying role/achievement later can't silently change what an
 * already-approved resume_version renders.
 */
export function enrichBullets(
  bullets: ResumeBullet[],
  achievements: LedgerAchievement[],
  roles: LedgerRole[],
): EnrichedBullet[] {
  const achievementsById = new Map(achievements.map((achievement) => [achievement.id, achievement]));
  const rolesById = new Map(roles.map((role) => [role.id, role]));

  return bullets.map((bullet) => {
    const primaryAchievement = achievementsById.get(bullet.achievement_ids[0]);
    const role = primaryAchievement ? (rolesById.get(primaryAchievement.role_id) ?? null) : null;
    return {
      ...bullet,
      role: role
        ? {
            id: role.id,
            company: role.company,
            title: role.title,
            start_date: role.start_date,
            end_date: role.end_date,
          }
        : null,
    };
  });
}

export function groupBulletsByRole(bullets: EnrichedBullet[]): { role: BulletRole | null; bullets: EnrichedBullet[] }[] {
  const groups: { role: BulletRole | null; bullets: EnrichedBullet[] }[] = [];
  const indexByRoleId = new Map<string, number>();

  for (const bullet of bullets) {
    const key = bullet.role?.id ?? "__unassigned__";
    const existingIndex = indexByRoleId.get(key);
    if (existingIndex === undefined) {
      indexByRoleId.set(key, groups.length);
      groups.push({ role: bullet.role, bullets: [bullet] });
    } else {
      groups[existingIndex].bullets.push(bullet);
    }
  }

  return groups.sort((a, b) => (b.role?.start_date ?? "").localeCompare(a.role?.start_date ?? ""));
}
