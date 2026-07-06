import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { app } from "../src/app.js";
import { settings } from "../src/config.js";

describe("achievements", () => {
  let authHeaders: { Authorization: string };

  beforeAll(async () => {
    const admin = createClient(settings.supabaseUrl, settings.supabaseServiceRoleKey);
    const anon = createClient(settings.supabaseUrl, settings.supabaseAnonKey);

    const email = `${randomUUID()}@example.com`;
    const password = "correct horse battery staple";
    await admin.auth.admin.createUser({ email, password, email_confirm: true });
    const { data } = await anon.auth.signInWithPassword({ email, password });
    authHeaders = { Authorization: `Bearer ${data.session!.access_token}` };
  });

  it("links and unlinks skills", async () => {
    const role = await request(app)
      .post("/roles")
      .set(authHeaders)
      .send({ company: "Initech", title: "Developer", start_date: "2019-01-01" });

    const skillA = await request(app)
      .post("/skills")
      .set(authHeaders)
      .send({ name: "Python" });
    const skillB = await request(app)
      .post("/skills")
      .set(authHeaders)
      .send({ name: "Terraform" });

    const achievement = await request(app)
      .post("/achievements")
      .set(authHeaders)
      .send({
        role_id: role.body.id,
        title: "Migrated infra to Terraform",
        description: "Rewrote provisioning scripts as Terraform modules.",
        metrics: [
          {
            value: 40,
            unit: "%",
            label: "reduced provisioning time",
            confidence: "approximate",
          },
        ],
        skill_ids: [skillA.body.id, skillB.body.id],
      });

    expect(achievement.status).toBe(201);
    expect(new Set(achievement.body.skill_ids)).toEqual(
      new Set([skillA.body.id, skillB.body.id]),
    );
    expect(achievement.body.metrics[0].confidence).toBe("approximate");

    const updated = await request(app)
      .patch(`/achievements/${achievement.body.id}`)
      .set(authHeaders)
      .send({ skill_ids: [skillA.body.id] });

    expect(updated.status).toBe(200);
    expect(updated.body.skill_ids).toEqual([skillA.body.id]);

    const fetched = await request(app)
      .get(`/achievements/${achievement.body.id}`)
      .set(authHeaders);
    expect(fetched.body.skill_ids).toEqual([skillA.body.id]);
  });
});
