import type { CoverLetterContent } from "../coverLetterContent.js";
import type { ProfileInfo } from "./resumeHtml.js";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderCoverLetterHtml(profile: ProfileInfo, content: CoverLetterContent): string {
  const contactLine = [profile.email, profile.phone, profile.location].filter(Boolean).join(" · ");
  const paragraphs = content.body_paragraphs
    .map((paragraph) => `<p>${escapeHtml(paragraph.text)}</p>`)
    .join("");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  body { font-family: Helvetica, Arial, sans-serif; color: #1a1a1a; margin: 48px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .contact { font-size: 12px; color: #444; margin-bottom: 24px; }
  p { font-size: 12px; line-height: 1.6; margin: 0 0 14px; }
  .signoff { margin-top: 24px; }
</style>
</head>
<body>
  <h1>${escapeHtml(profile.full_name)}</h1>
  <div class="contact">${escapeHtml(contactLine)}</div>
  <p>${escapeHtml(content.greeting)}</p>
  ${paragraphs}
  <p class="signoff">${escapeHtml(content.closing)}<br />${escapeHtml(profile.full_name)}</p>
</body>
</html>`;
}
