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

describe("profile", () => {
  let authHeaders: { Authorization: string };

  beforeAll(async () => {
    authHeaders = await createSignedInUser();
  });

  it("returns null before a profile is created", async () => {
    const response = await request(app).get("/profile").set(authHeaders);
    expect(response.status).toBe(200);
    expect(response.body).toBeNull();
  });

  it("rejects an upsert missing required fields", async () => {
    const response = await request(app)
      .put("/profile")
      .set(authHeaders)
      .send({ full_name: "Vance McGrady" });
    expect(response.status).toBe(422);
  });

  it("creates then updates the caller's own profile", async () => {
    const created = await request(app)
      .put("/profile")
      .set(authHeaders)
      .send({ full_name: "Vance McGrady", email: "vance@example.com" });
    expect(created.status).toBe(200);
    expect(created.body.full_name).toBe("Vance McGrady");
    expect(created.body.phone).toBeNull();

    const updated = await request(app)
      .put("/profile")
      .set(authHeaders)
      .send({
        full_name: "Vance McGrady",
        email: "vance@example.com",
        phone: "555-123-4567",
        location: "Remote",
      });
    expect(updated.status).toBe(200);
    expect(updated.body.phone).toBe("555-123-4567");

    const fetched = await request(app).get("/profile").set(authHeaders);
    expect(fetched.body.location).toBe("Remote");
  });
});

describe("profile isolation", () => {
  it("does not leak one user's profile to another", async () => {
    const headersA = await createSignedInUser();
    const headersB = await createSignedInUser();

    await request(app)
      .put("/profile")
      .set(headersA)
      .send({ full_name: "User A", email: "a@example.com" });

    const asB = await request(app).get("/profile").set(headersB);
    expect(asB.status).toBe(200);
    expect(asB.body).toBeNull();
  });
});
