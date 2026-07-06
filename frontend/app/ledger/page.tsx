import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RoleForm from "./role-form";
import SkillForm from "./skill-form";
import AchievementForm from "./achievement-form";
import EducationForm from "./education-form";

type Role = {
  id: string;
  company: string;
  title: string;
  start_date: string;
  end_date: string | null;
};
type Skill = { id: string; name: string; category: string | null };
type Achievement = {
  id: string;
  title: string;
  description: string;
  role_id: string;
  skill_ids: string[];
};
type Education = {
  id: string;
  institution: string;
  credential: string;
  completed: boolean;
};

async function fetchList<T>(path: string, token: string): Promise<T[]> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) return [];
  return response.json();
}

export default async function LedgerPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session!.access_token;

  const [roles, skills, achievements, education] = await Promise.all([
    fetchList<Role>("/roles", token),
    fetchList<Skill>("/skills", token),
    fetchList<Achievement>("/achievements", token),
    fetchList<Education>("/education", token),
  ]);

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-10 p-8">
      <h1 className="text-2xl font-semibold">Experience ledger</h1>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Roles</h2>
        <ul className="flex flex-col gap-1 text-sm">
          {roles.map((role) => (
            <li key={role.id}>
              {role.title} at {role.company} ({role.start_date} –{" "}
              {role.end_date ?? "present"})
            </li>
          ))}
        </ul>
        <RoleForm />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Skills</h2>
        <ul className="flex flex-wrap gap-2 text-sm">
          {skills.map((skill) => (
            <li key={skill.id} className="rounded-full border px-3 py-1">
              {skill.name}
            </li>
          ))}
        </ul>
        <SkillForm />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Achievements</h2>
        <ul className="flex flex-col gap-2 text-sm">
          {achievements.map((achievement) => (
            <li key={achievement.id} className="rounded border p-3">
              <p className="font-medium">{achievement.title}</p>
              <p className="text-zinc-600">{achievement.description}</p>
            </li>
          ))}
        </ul>
        <AchievementForm roles={roles} skills={skills} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Education</h2>
        <ul className="flex flex-col gap-1 text-sm">
          {education.map((entry) => (
            <li key={entry.id}>
              {entry.credential}, {entry.institution}{" "}
              {entry.completed ? "" : "(in progress)"}
            </li>
          ))}
        </ul>
        <EducationForm />
      </section>
    </main>
  );
}
