import puppeteer from "puppeteer";
import type { ResumeContent } from "../resumeContent.js";
import { renderResumeHtml, type ProfileInfo } from "./resumeHtml.js";

export async function renderResumePdf(profile: ProfileInfo, content: ResumeContent): Promise<Buffer> {
  const html = renderResumeHtml(profile, content);
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
