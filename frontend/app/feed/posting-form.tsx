"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { backendFetch } from "@/lib/backend-fetch";

export default function PostingForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = new FormData(event.currentTarget);
    const payload = {
      company: form.get("company"),
      title: form.get("title"),
      raw_text: form.get("raw_text"),
      source_url: form.get("source_url") || null,
    };

    const response = await backendFetch("/postings", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      setError("Could not save posting.");
      return;
    }

    event.currentTarget?.reset();
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
        <input
          name="source_url"
          placeholder="Posting URL (optional)"
          className="col-span-2 rounded border px-2 py-1"
        />
      </div>
      <textarea
        name="raw_text"
        placeholder="Paste the full job description here"
        required
        rows={8}
        className="rounded border px-2 py-1"
      />
      <button
        type="submit"
        className="self-start rounded bg-black px-3 py-1 text-white"
      >
        Add posting
      </button>
      {error && <p className="text-red-600">{error}</p>}
    </form>
  );
}
