"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { backendFetch } from "@/lib/backend-fetch";

export default function SkillForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = new FormData(event.currentTarget);
    const payload = {
      name: form.get("name"),
      category: form.get("category") || null,
      first_used: form.get("first_used") || null,
      last_used: form.get("last_used") || null,
    };

    const response = await backendFetch("/skills", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      setError("Could not save skill.");
      return;
    }

    event.currentTarget.reset();
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 rounded border p-3 text-sm"
    >
      <div className="grid grid-cols-2 gap-2">
        <input
          name="name"
          placeholder="Skill name"
          required
          className="rounded border px-2 py-1"
        />
        <input
          name="category"
          placeholder="Category"
          className="rounded border px-2 py-1"
        />
        <input name="first_used" type="date" className="rounded border px-2 py-1" />
        <input name="last_used" type="date" className="rounded border px-2 py-1" />
      </div>
      <button
        type="submit"
        className="self-start rounded bg-black px-3 py-1 text-white"
      >
        Add skill
      </button>
      {error && <p className="text-red-600">{error}</p>}
    </form>
  );
}
