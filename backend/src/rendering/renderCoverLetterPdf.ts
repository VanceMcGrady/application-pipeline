import puppeteer from "puppeteer";
import type { CoverLetterContent } from "../coverLetterContent.js";
import { renderCoverLetterHtml } from "./coverLetterHtml.js";
import type { ProfileInfo } from "./resumeHtml.js";

export async function renderCoverLetterPdf(profile: ProfileInfo, content: CoverLetterContent): Promise<Buffer> {
  const html = renderCoverLetterHtml(profile, content);
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    const pdf = await page.pdf({ format: "letter", printBackground: true });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
