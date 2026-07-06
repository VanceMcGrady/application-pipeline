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
  await admin.auth.admin.createUser({ email, password, email_confirm: true });
  const { data } = await anon.auth.signInWithPassword({ email, password });
  await anon.auth.signOut();
  return { Authorization: `Bearer ${data.session!.access_token}` };
}

describe("ledger isolation", () => {
  let headersA: { Authorization: string };
  let headersB: { Authorization: string };

  beforeAll(async () => {
    headersA = await createSignedInUser();
    headersB = await createSignedInUser();
  });

  it("user cannot see another user's role", async () => {
    const created = await request(app)
      .post("/roles")
      .set(headersA)
      .send({ company: "Acme Corp", title: "Engineer", start_date: "2020-01-01" });
    expect(created.status).toBe(201);
    const roleId = created.body.id;

    const rolesA = await request(app).get("/roles").set(headersA);
    expect(rolesA.body.some((role: { id: string }) => role.id === roleId)).toBe(true);

    const rolesB = await request(app).get("/roles").set(headersB);
    expect(rolesB.body.every((role: { id: string }) => role.id !== roleId)).toBe(true);

    // RLS filters the row out entirely for user B, so Postgres never
    // confirms the row exists — the endpoint reports 404, not 403.
    const direct = await request(app).get(`/roles/${roleId}`).set(headersB);
    expect(direct.status).toBe(404);
  });

  it("user cannot update or delete another user's role", async () => {
    const created = await request(app)
      .post("/roles")
      .set(headersA)
      .send({ company: "Globex", title: "Analyst", start_date: "2021-06-01" });
    const roleId = created.body.id;

    const updateAttempt = await request(app)
      .patch(`/roles/${roleId}`)
      .set(headersB)
      .send({ title: "Hacked" });
    expect(updateAttempt.status).toBe(404);

    const deleteAttempt = await request(app).delete(`/roles/${roleId}`).set(headersB);
    expect(deleteAttempt.status).toBe(204); // no-op: RLS means nothing matched

    const stillThere = await request(app).get(`/roles/${roleId}`).set(headersA);
    expect(stillThere.status).toBe(200);
    expect(stillThere.body.title).toBe("Analyst");
  });
});
