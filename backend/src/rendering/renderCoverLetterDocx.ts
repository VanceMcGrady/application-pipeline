import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import type { CoverLetterContent } from "../coverLetterContent.js";
import type { ProfileInfo } from "./resumeHtml.js";

export async function renderCoverLetterDocx(
  profile: ProfileInfo,
  content: CoverLetterContent,
): Promise<Buffer> {
  const contactLine = [profile.email, profile.phone, profile.location].filter(Boolean).join(" · ");

  const children: Paragraph[] = [
    new Paragraph({
      heading: HeadingLevel.TITLE,
      children: [new TextRun({ text: profile.full_name, bold: true })],
    }),
    new Paragraph({
      alignment: AlignmentType.LEFT,
      children: [new TextRun({ text: contactLine, size: 20, color: "444444" })],
    }),
    new Paragraph({
      spacing: { before: 240 },
      children: [new TextRun({ text: content.greeting })],
    }),
  ];

  for (const paragraph of content.body_paragraphs) {
    children.push(
      new Paragraph({
        spacing: { before: 160 },
        children: [new TextRun({ text: paragraph.text })],
      }),
    );
  }

  children.push(
    new Paragraph({
      spacing: { before: 240 },
      children: [new TextRun({ text: content.closing })],
    }),
    new Paragraph({
      children: [new TextRun({ text: profile.full_name })],
    }),
  );

  const document = new Document({ sections: [{ children }] });
  return Packer.toBuffer(document);
}
