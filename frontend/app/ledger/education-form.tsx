"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { backendFetch } from "@/lib/backend-fetch";

export default function EducationForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = new FormData(event.currentTarget);
    const payload = {
      institution: form.get("institution"),
      credential: form.get("credential"),
      completed: form.get("completed") === "on",
      notes: form.get("notes") || null,
    };

    const response = await backendFetch("/education", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      setError("Could not save education entry.");
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
          name="institution"
          placeholder="Institution"
          required
          className="rounded border px-2 py-1"
        />
        <input
          name="credential"
          placeholder="Credential"
          required
          className="rounded border px-2 py-1"
        />
      </div>
      <label className="flex items-center gap-2">
        <input name="completed" type="checkbox" />
        Completed
      </label>
      <textarea
        name="notes"
        placeholder="Notes"
        className="rounded border px-2 py-1"
      />
      <button
        type="submit"
        className="self-start rounded bg-black px-3 py-1 text-white"
      >
        Add education
      </button>
      {error && <p className="text-red-600">{error}</p>}
    </form>
  );
}
