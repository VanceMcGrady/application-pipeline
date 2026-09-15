import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { app } from "../src/app.js";
import { settings } from "../src/config.js";

async function createSignedInUser() {
  const admin = createClient(settings.supabaseUrl, settings.supabaseServiceRoleKey);
  const anon = createClient(settings.supabaseUrl, settings.supabaseAnonKey);

  const email = `${randomUUID()}@example.com`;
  const password = "correct horse battery staple";
  const { data: created } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  const { data } = await anon.auth.signInWithPassword({ email, password });
  await anon.auth.signOut();
  return {
    headers: { Authorization: `Bearer ${data.session!.access_token}` },
    userId: created.user!.id,
  };
}

// Seeds a resume_versions row directly via the service-role client instead of
// going through POST /resume-versions, which would call the real Anthropic
// API -- these tests exercise approve/revise/render, not generation.
async function seedResumeVersion(
  userId: string,
  postingId: string,
  overrides: Record<string, unknown> = {},
) {
  const admin = createClient(settings.supabaseUrl, settings.supabaseServiceRoleKey);
  const { data, error } = await admin
    .from("resume_versions")
    .insert({
      user_id: userId,
      posting_id: postingId,
      content: { bullets: [] },
      cited_achievement_ids: [],
      verification_status: "passed",
      verification_notes: [],
      ...overrides,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function createPosting(headers: { Authorization: string }) {
  const response = await request(app)
    .post("/postings")
    .set(headers)
    .send({
      company: "Acme Corp",
      title: "Backend Engineer",
      raw_text: "We need a backend engineer.",
    });
  expect(response.status).toBe(201);
  return response.body.id as string;
}

// fetchLedgerContext (shared by generate/revise) 400s unless the user has at
// least one active, public achievement -- set one up so revise tests exercise
// the real happy path.
async function createGroundedAchievement(headers: { Authorization: string }) {
  const role = await request(app)
    .post("/roles")
    .set(headers)
    .send({ company: "Acme Corp", title: "Engineer", start_date: "2020-01-01" });
  const achievement = await request(app)
    .post("/achievements")
    .set(headers)
    .send({
      role_id: role.body.id,
      title: "Deployment improvements",
      description: "Reduced deployment time by 42% through process improvements.",
      metrics: [],
      skill_ids: [],
    });
  expect(achievement.status).toBe(201);
  return achievement.body.id as string;
}

describe("resume version approve", () => {
  let headers: { Authorization: string };
  let userId: string;

  beforeAll(async () => {
    ({ headers, userId } = await createSignedInUser());
  });

  it("sets approved_at and is idempotent", async () => {
    const postingId = await createPosting(headers);
    const seeded = await seedResumeVersion(userId, postingId);

    const first = await request(app).post(`/resume-versions/${seeded.id}/approve`).set(headers);
    expect(first.status).toBe(200);
    expect(first.body.approved_at).toBeTruthy();

    const second = await request(app).post(`/resume-versions/${seeded.id}/approve`).set(headers);
    expect(second.status).toBe(200);
    expect(second.body.approved_at).toBe(first.body.approved_at);
  });
});

describe("resume version revise", () => {
  let headers: { Authorization: string };
  let userId: string;

  beforeAll(async () => {
    ({ headers, userId } = await createSignedInUser());
  });

  it("creates a new, grounded version instead of mutating the original", async () => {
    const postingId = await createPosting(headers);
    const achievementId = await createGroundedAchievement(headers);
    const original = await seedResumeVersion(userId, postingId, {
      content: { bullets: [{ achievement_ids: [achievementId], text: "Original bullet." }] },
    });

    const revised = await request(app)
      .post(`/resume-versions/${original.id}/revise`)
      .set(headers)
      .send({
        bullets: [
          {
            achievement_ids: [achievementId],
            text: "Reduced deployment time by 42% through process improvements.",
          },
        ],
      });

    expect(revised.status).toBe(201);
    expect(revised.body.id).not.toBe(original.id);
    expect(revised.body.verification_status).toBe("passed");
    expect(revised.body.verification_notes).toHaveLength(0);
    expect(revised.body.content.bullets[0].text).toBe(
      "Reduced deployment time by 42% through process improvements.",
    );
    expect(revised.body.cited_achievement_ids).toEqual([achievementId]);

    const stillOriginal = await request(app).get(`/resume-versions/${original.id}`).set(headers);
    expect(stillOriginal.body.content.bullets[0].text).toBe("Original bullet.");
  });

  it("flags an unfamiliar revision instead of rejecting it", async () => {
    const postingId = await createPosting(headers);
    const achievementId = await createGroundedAchievement(headers);
    const original = await seedResumeVersion(userId, postingId);

    const revised = await request(app)
      .post(`/resume-versions/${original.id}/revise`)
      .set(headers)
      .send({
        bullets: [{ achievement_ids: [achievementId], text: "Reduced deployment time by 99%." }],
      });

    expect(revised.status).toBe(201);
    expect(revised.body.verification_status).toBe("flagged");
    expect(revised.body.verification_notes[0]).toMatch(/99%/);
  });
});

describe("resume version render", () => {
  let headers: { Authorization: string };
  let userId: string;

  beforeAll(async () => {
    ({ headers, userId } = await createSignedInUser());
  });

  it("refuses to render until approved and a profile exists", async () => {
    const postingId = await createPosting(headers);
    const seeded = await seedResumeVersion(userId, postingId, {
      content: { bullets: [{ achievement_ids: [], text: "Some bullet.", role: null }] },
    });

    const beforeApproval = await request(app)
      .get(`/resume-versions/${seeded.id}/render`)
      .query({ format: "pdf" })
      .set(headers);
    expect(beforeApproval.status).toBe(400);
    expect(beforeApproval.body.detail).toMatch(/approved/i);

    await request(app).post(`/resume-versions/${seeded.id}/approve`).set(headers);

    const beforeProfile = await request(app)
      .get(`/resume-versions/${seeded.id}/render`)
      .query({ format: "pdf" })
      .set(headers);
    expect(beforeProfile.status).toBe(400);
    expect(beforeProfile.body.detail).toMatch(/profile/i);
  });

  it("renders pdf and docx once approved with a profile", async () => {
    const postingId = await createPosting(headers);
    const seeded = await seedResumeVersion(userId, postingId, {
      content: { bullets: [{ achievement_ids: [], text: "Some bullet.", role: null }] },
    });
    await request(app).post(`/resume-versions/${seeded.id}/approve`).set(headers);
    await request(app)
      .put("/profile")
      .set(headers)
      .send({ full_name: "Test User", email: "test@example.com" });

    const pdf = await request(app)
      .get(`/resume-versions/${seeded.id}/render`)
      .query({ format: "pdf" })
      .set(headers);
    expect(pdf.status).toBe(200);
    expect(pdf.headers["content-type"]).toBe("application/pdf");
    expect(Number(pdf.headers["content-length"])).toBeGreaterThan(100);

    const docx = await request(app)
      .get(`/resume-versions/${seeded.id}/render`)
      .query({ format: "docx" })
      .set(headers);
    expect(docx.status).toBe(200);
    expect(docx.headers["content-type"]).toBe(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
    expect(Number(docx.headers["content-length"])).toBeGreaterThan(100);
  });

  it("rejects an unrecognized format", async () => {
    const postingId = await createPosting(headers);
    const seeded = await seedResumeVersion(userId, postingId);

    const response = await request(app)
      .get(`/resume-versions/${seeded.id}/render`)
      .query({ format: "txt" })
      .set(headers);
    expect(response.status).toBe(400);
  });
});

describe("resume version isolation", () => {
  let headersA: { Authorization: string };
  let userIdA: string;
  let headersB: { Authorization: string };

  beforeAll(async () => {
    ({ headers: headersA, userId: userIdA } = await createSignedInUser());
    ({ headers: headersB } = await createSignedInUser());
  });

  it("user cannot approve, revise, or render another user's resume version", async () => {
    const postingId = await createPosting(headersA);
    const seeded = await seedResumeVersion(userIdA, postingId, {
      content: { bullets: [{ achievement_ids: [], text: "Some bullet.", role: null }] },
    });
    const approved = await request(app).post(`/resume-versions/${seeded.id}/approve`).set(headersA);
    expect(approved.status).toBe(200);

    const approveAttempt = await request(app)
      .post(`/resume-versions/${seeded.id}/approve`)
      .set(headersB);
    expect(approveAttempt.status).toBe(404);

    const reviseAttempt = await request(app)
      .post(`/resume-versions/${seeded.id}/revise`)
      .set(headersB)
      .send({ bullets: [{ achievement_ids: [randomUUID()], text: "Hacked bullet." }] });
    expect(reviseAttempt.status).toBe(404);

    const renderAttempt = await request(app)
      .get(`/resume-versions/${seeded.id}/render`)
      .query({ format: "pdf" })
      .set(headersB);
    expect(renderAttempt.status).toBe(404);

    // Confirm none of user B's attempts changed anything.
    const stillA = await request(app).get(`/resume-versions/${seeded.id}`).set(headersA);
    expect(stillA.body.approved_at).toBe(approved.body.approved_at);
    expect(stillA.body.content.bullets[0].text).toBe("Some bullet.");
  });
});
