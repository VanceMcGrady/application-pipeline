import type { SupabaseClient } from "@supabase/supabase-js";
import type { LedgerAchievement, LedgerRole } from "./llm/generateResumeDraft.js";

/**
 * Fetches the requesting user's active, public ledger (roles + achievements)
 * for a generation call. Shared by resume and cover letter generation --
 * both draw from the same ledger under the same rules (CLAUDE.md principle
 * 1: a generation request must never be able to read another user's
 * ledger, enforced here by using the caller's own RLS-scoped client).
 */
export async function fetchLedgerContext(
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
