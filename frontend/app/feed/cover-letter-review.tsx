"use client";

import { useState } from "react";
import { backendFetch } from "@/lib/backend-fetch";

type CoverLetterParagraph = { achievement_ids: string[]; text: string };
type CoverLetterVersion = {
  id: string;
  content: { greeting: string; body_paragraphs: CoverLetterParagraph[]; closing: string };
  verification_status: "pending" | "passed" | "flagged";
  verification_notes: string[];
  approved_at: string | null;
};
type Achievement = { id: string; title: string; description: string };

export default function CoverLetterReview({
  postingId,
  achievements,
}: {
  postingId: string;
  achievements: Achievement[];
}) {
  const [version, setVersion] = useState<CoverLetterVersion | null>(null);
  const [draftGreeting, setDraftGreeting] = useState("");
  const [draftTexts, setDraftTexts] = useState<string[]>([]);
  const [draftClosing, setDraftClosing] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const achievementsById = new Map(achievements.map((achievement) => [achievement.id, achievement]));

  function loadVersion(next: CoverLetterVersion) {
    setVersion(next);
    setDraftGreeting(next.content.greeting);
    setDraftTexts(next.content.body_paragraphs.map((paragraph) => paragraph.text));
    setDraftClosing(next.content.closing);
  }

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    const response = await backendFetch("/cover-letter-versions", {
      method: "POST",
      body: JSON.stringify({ posting_id: postingId }),
    });
    setLoading(false);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.detail ?? "Could not generate cover letter draft.");
      return;
    }
    loadVersion(await response.json());
  }

  const hasEdits = version
    ? draftGreeting !== version.content.greeting ||
      draftClosing !== version.content.closing ||
      draftTexts.some((text, index) => text !== version.content.body_paragraphs[index].text)
    : false;

  async function handleSaveEdits() {
    if (!version) return;
    setLoading(true);
    setError(null);
    const response = await backendFetch(`/cover-letter-versions/${version.id}/revise`, {
      method: "POST",
      body: JSON.stringify({
        greeting: draftGreeting,
        body_paragraphs: version.content.body_paragraphs.map((paragraph, index) => ({
          achievement_ids: paragraph.achievement_ids,
          text: draftTexts[index],
        })),
        closing: draftClosing,
      }),
    });
    setLoading(false);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.detail ?? "Could not save edits.");
      return;
    }
    loadVersion(await response.json());
  }

  async function handleApprove() {
    if (!version) return;
    setLoading(true);
    setError(null);
    const response = await backendFetch(`/cover-letter-versions/${version.id}/approve`, { method: "POST" });
    setLoading(false);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.detail ?? "Could not approve.");
      return;
    }
    loadVersion(await response.json());
  }

  async function handleDownload(format: "pdf" | "docx") {
    if (!version) return;
    setError(null);
    const response = await backendFetch(`/cover-letter-versions/${version.id}/render?format=${format}`);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.detail ?? "Could not render document.");
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `cover-letter.${format}`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (!version) {
    return (
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="self-start rounded border px-3 py-1 disabled:opacity-50"
        >
          {loading ? "Generating…" : "Generate cover letter draft"}
        </button>
        {error && <p className="text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded border border-dashed p-3">
      <div className="flex items-center gap-2">
        <span
          className={
            version.verification_status === "flagged"
              ? "rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800"
              : "rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800"
          }
        >
          {version.verification_status}
        </span>
        {version.approved_at && (
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800">approved</span>
        )}
      </div>

      {version.verification_notes.length > 0 && (
        <ul className="flex flex-col gap-1 text-xs text-amber-700">
          {version.verification_notes.map((note, index) => (
            <li key={index}>{note}</li>
          ))}
        </ul>
      )}

      <input
        value={draftGreeting}
        onChange={(event) => setDraftGreeting(event.target.value)}
        className="rounded border px-2 py-1 text-sm"
      />

      <ul className="flex flex-col gap-3">
        {version.content.body_paragraphs.map((paragraph, index) => {
          const citedText = paragraph.achievement_ids
            .map((id) => achievementsById.get(id)?.description)
            .filter(Boolean)
            .join(" ");
          return (
            <li key={index} className="flex flex-col gap-1">
              <textarea
                value={draftTexts[index]}
                onChange={(event) => {
                  const next = [...draftTexts];
                  next[index] = event.target.value;
                  setDraftTexts(next);
                }}
                rows={3}
                className="rounded border px-2 py-1 text-sm"
              />
              {citedText && <p className="text-xs text-zinc-500">Ledger entry: {citedText}</p>}
            </li>
          );
        })}
      </ul>

      <input
        value={draftClosing}
        onChange={(event) => setDraftClosing(event.target.value)}
        className="rounded border px-2 py-1 text-sm"
      />

      <div className="flex flex-wrap gap-2">
        {hasEdits && (
          <button
            type="button"
            onClick={handleSaveEdits}
            disabled={loading}
            className="rounded border px-3 py-1 disabled:opacity-50"
          >
            Save edits as new version
          </button>
        )}
        {!version.approved_at && !hasEdits && (
          <button
            type="button"
            onClick={handleApprove}
            disabled={loading}
            className="rounded bg-black px-3 py-1 text-white disabled:opacity-50"
          >
            Approve
          </button>
        )}
        {version.approved_at && (
          <>
            <button type="button" onClick={() => handleDownload("pdf")} className="rounded border px-3 py-1">
              Download PDF
            </button>
            <button type="button" onClick={() => handleDownload("docx")} className="rounded border px-3 py-1">
              Download DOCX
            </button>
          </>
        )}
        <button type="button" onClick={handleGenerate} disabled={loading} className="rounded border px-3 py-1 text-zinc-500">
          Regenerate
        </button>
      </div>
      {error && <p className="text-red-600">{error}</p>}
    </div>
  );
}
