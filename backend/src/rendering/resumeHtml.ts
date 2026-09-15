import { groupBulletsByRole, type ResumeContent } from "../resumeContent.js";

export type ProfileInfo = {
  full_name: string;
  email: string;
  phone: string | null;
  location: string | null;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDateRange(start: string, end: string | null): string {
  return `${start} – ${end ?? "Present"}`;
}

export function renderResumeHtml(profile: ProfileInfo, content: ResumeContent): string {
  const contactLine = [profile.email, profile.phone, profile.location].filter(Boolean).join(" · ");
  const groups = groupBulletsByRole(content.bullets);

  const sections = groups
    .map((group) => {
      const roleHeader = group.role
        ? `<div class="role-header">
             <span class="role-title">${escapeHtml(group.role.title)} — ${escapeHtml(group.role.company)}</span>
             <span class="role-dates">${escapeHtml(formatDateRange(group.role.start_date, group.role.end_date))}</span>
           </div>`
        : "";
      const bullets = group.bullets
        .map((bullet) => `<li>${escapeHtml(bullet.text)}</li>`)
        .join("");
      return `<section>${roleHeader}<ul>${bullets}</ul></section>`;
    })
    .join("");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  body { font-family: Helvetica, Arial, sans-serif; color: #1a1a1a; margin: 48px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .contact { font-size: 12px; color: #444; margin-bottom: 24px; }
  section { margin-bottom: 18px; }
  .role-header { display: flex; justify-content: space-between; font-size: 13px; font-weight: bold; margin-bottom: 6px; }
  .role-dates { font-weight: normal; color: #555; }
  ul { margin: 0; padding-left: 18px; }
  li { font-size: 12px; line-height: 1.5; margin-bottom: 4px; }
</style>
</head>
<body>
  <h1>${escapeHtml(profile.full_name)}</h1>
  <div class="contact">${escapeHtml(contactLine)}</div>
  ${sections}
</body>
</html>`;
}
