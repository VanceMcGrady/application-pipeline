"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { backendFetch } from "@/lib/backend-fetch";

export default function RoleForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = new FormData(event.currentTarget);
    const payload = {
      company: form.get("company"),
      title: form.get("title"),
      start_date: form.get("start_date"),
      end_date: form.get("end_date") || null,
      location: form.get("location") || null,
      one_line_summary: form.get("one_line_summary") || null,
    };

    const response = await backendFetch("/roles", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      setError("Could not save role.");
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
          name="company"
          placeholder="Company"
          required
          className="rounded border px-2 py-1"
        />
        <input
          name="title"
          placeholder="Title"
          required
          className="rounded border px-2 py-1"
        />
        <input name="start_date" type="date" required className="rounded border px-2 py-1" />
        <input name="end_date" type="date" className="rounded border px-2 py-1" />
        <input
          name="location"
          placeholder="Location"
          className="rounded border px-2 py-1"
        />
        <input
          name="one_line_summary"
          placeholder="One-line summary"
          className="rounded border px-2 py-1"
        />
      </div>
      <button
        type="submit"
        className="self-start rounded bg-black px-3 py-1 text-white"
      >
        Add role
      </button>
      {error && <p className="text-red-600">{error}</p>}
    </form>
  );
}
