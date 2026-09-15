import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import { groupBulletsByRole, type ResumeContent } from "../resumeContent.js";
import type { ProfileInfo } from "./resumeHtml.js";

function formatDateRange(start: string, end: string | null): string {
  return `${start} – ${end ?? "Present"}`;
}

export async function renderResumeDocx(profile: ProfileInfo, content: ResumeContent): Promise<Buffer> {
  const contactLine = [profile.email, profile.phone, profile.location].filter(Boolean).join(" · ");
  const groups = groupBulletsByRole(content.bullets);

  const children: Paragraph[] = [
    new Paragraph({
      heading: HeadingLevel.TITLE,
      children: [new TextRun({ text: profile.full_name, bold: true })],
    }),
    new Paragraph({
      alignment: AlignmentType.LEFT,
      children: [new TextRun({ text: contactLine, size: 20, color: "444444" })],
    }),
  ];

  for (const group of groups) {
    if (group.role) {
      children.push(
        new Paragraph({
          spacing: { before: 240 },
          children: [
            new TextRun({ text: `${group.role.title} — ${group.role.company}`, bold: true }),
            new TextRun({
              text: `   ${formatDateRange(group.role.start_date, group.role.end_date)}`,
              italics: true,
              color: "555555",
            }),
          ],
        }),
      );
    }
    for (const bullet of group.bullets) {
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          children: [new TextRun({ text: bullet.text })],
        }),
      );
    }
  }

  const document = new Document({ sections: [{ children }] });
  return Packer.toBuffer(document);
}
