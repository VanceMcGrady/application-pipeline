"use client";

import { useState } from "react";
import { backendFetch } from "@/lib/backend-fetch";

type ResumeBullet = { achievement_ids: string[]; text: string };
type ResumeVersion = {
  id: string;
  content: { bullets: ResumeBullet[] };
  verification_status: "pending" | "passed" | "flagged";
  verification_notes: string[];
};

export default function GenerateResumeButton({ postingId }: { postingId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResumeVersion | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);

    const response = await backendFetch("/resume-versions", {
      method: "POST",
      body: JSON.stringify({ posting_id: postingId }),
    });

    setLoading(false);

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.detail ?? "Could not generate resume draft.");
      return;
    }

    setResult(await response.json());
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleGenerate}
        disabled={loading}
        className="self-start rounded border px-3 py-1 disabled:opacity-50"
      >
        {loading ? "Generating…" : "Generate resume draft"}
      </button>
      {error && <p className="text-red-600">{error}</p>}
      {result && (
        <div className="flex flex-col gap-2 rounded border border-dashed p-3">
          <span
            className={
              result.verification_status === "flagged"
                ? "self-start rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800"
                : "self-start rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800"
            }
          >
            {result.verification_status}
          </span>
          <ul className="flex flex-col gap-1">
            {result.content.bullets.map((bullet, index) => (
              <li key={index}>
                {bullet.text}
                <span className="ml-1 text-xs text-zinc-500">
                  [{bullet.achievement_ids.join(", ")}]
                </span>
              </li>
            ))}
          </ul>
          {result.verification_notes.length > 0 && (
            <ul className="flex flex-col gap-1 text-xs text-amber-700">
              {result.verification_notes.map((note, index) => (
                <li key={index}>{note}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
