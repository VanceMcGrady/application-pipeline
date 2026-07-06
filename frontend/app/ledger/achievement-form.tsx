"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { backendFetch } from "@/lib/backend-fetch";

type Role = { id: string; company: string; title: string };
type Skill = { id: string; name: string };

export default function AchievementForm({
  roles,
  skills,
}: {
  roles: Role[];
  skills: Skill[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);

  function toggleSkill(skillId: string) {
    setSelectedSkillIds((current) =>
      current.includes(skillId)
        ? current.filter((id) => id !== skillId)
        : [...current, skillId],
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = new FormData(event.currentTarget);
    const metricValue = form.get("metric_value");
    const metrics = metricValue
      ? [
          {
            value: Number(metricValue),
            unit: String(form.get("metric_unit") || ""),
            label: String(form.get("metric_label") || ""),
            confidence: String(form.get("metric_confidence") || "approximate"),
          },
        ]
      : [];

    const payload = {
      role_id: form.get("role_id"),
      title: form.get("title"),
      description: form.get("description"),
      metrics,
      skill_ids: selectedSkillIds,
      sensitivity: form.get("sensitivity") || "public",
      status: "active",
    };

    const response = await backendFetch("/achievements", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      setError("Could not save achievement.");
      return;
    }

    event.currentTarget.reset();
    setSelectedSkillIds([]);
    router.refresh();
  }

  if (roles.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        Add a role first before logging achievements.
      </p>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 rounded border p-3 text-sm"
    >
      <select name="role_id" required className="rounded border px-2 py-1">
        {roles.map((role) => (
          <option key={role.id} value={role.id}>
            {role.title} at {role.company}
          </option>
        ))}
      </select>
      <input
        name="title"
        placeholder="Achievement title"
        required
        className="rounded border px-2 py-1"
      />
      <textarea
        name="description"
        placeholder="Description"
        required
        className="rounded border px-2 py-1"
      />

      <div className="grid grid-cols-4 gap-2">
        <input
          name="metric_value"
          type="number"
          step="any"
          placeholder="Value"
          className="rounded border px-2 py-1"
        />
        <input
          name="metric_unit"
          placeholder="Unit (e.g. %)"
          className="rounded border px-2 py-1"
        />
        <input
          name="metric_label"
          placeholder="Label"
          className="rounded border px-2 py-1"
        />
        <select name="metric_confidence" className="rounded border px-2 py-1">
          <option value="exact">exact</option>
          <option value="approximate">approximate</option>
          <option value="rough">rough</option>
        </select>
      </div>

      {skills.length > 0 && (
        <fieldset className="flex flex-wrap gap-2">
          {skills.map((skill) => (
            <label
              key={skill.id}
              className="flex items-center gap-1 rounded-full border px-2 py-1"
            >
              <input
                type="checkbox"
                checked={selectedSkillIds.includes(skill.id)}
                onChange={() => toggleSkill(skill.id)}
              />
              {skill.name}
            </label>
          ))}
        </fieldset>
      )}

      <select name="sensitivity" className="rounded border px-2 py-1">
        <option value="public">public</option>
        <option value="interview-only">interview-only</option>
        <option value="confidential-general-only">confidential-general-only</option>
      </select>

      <button
        type="submit"
        className="self-start rounded bg-black px-3 py-1 text-white"
      >
        Add achievement
      </button>
      {error && <p className="text-red-600">{error}</p>}
    </form>
  );
}
