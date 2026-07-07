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

async function createBoard() {
  const admin = createClient(settings.supabaseUrl, settings.supabaseServiceRoleKey);
  const { data, error } = await admin
    .from("ats_boards")
    .insert({ source: "greenhouse", board_token: randomUUID(), company_name: "Acme Corp" })
    .select()
    .single();
  if (error) throw error;
  return data.id as string;
}

describe("boards", () => {
  let headersA: { Authorization: string };
  let headersB: { Authorization: string };

  beforeAll(async () => {
    headersA = await createSignedInUser();
    headersB = await createSignedInUser();
  });

  it("lists the shared ats_boards catalog for any authenticated user", async () => {
    const boardId = await createBoard();
    const response = await request(app).get("/boards").set(headersA);
    expect(response.status).toBe(200);
    expect(response.body.some((board: { id: string }) => board.id === boardId)).toBe(true);
  });

  it("user cannot see or modify another user's tracked boards", async () => {
    const boardId = await createBoard();

    const tracked = await request(app).post("/boards/tracked").set(headersA).send({ board_id: boardId });
    expect(tracked.status).toBe(201);
    expect(tracked.body.board_id).toBe(boardId);

    const trackedListA = await request(app).get("/boards/tracked").set(headersA);
    expect(trackedListA.body.some((row: { board_id: string }) => row.board_id === boardId)).toBe(true);

    const trackedListB = await request(app).get("/boards/tracked").set(headersB);
    expect(trackedListB.body.every((row: { board_id: string }) => row.board_id !== boardId)).toBe(true);

    // RLS scopes the delete to the caller's own rows, so this is a no-op for B.
    await request(app).delete(`/boards/tracked/${boardId}`).set(headersB);
    const stillTracked = await request(app).get("/boards/tracked").set(headersA);
    expect(stillTracked.body.some((row: { board_id: string }) => row.board_id === boardId)).toBe(true);
  });

  it("tracking the same board twice is a no-op, not an error", async () => {
    const boardId = await createBoard();

    const first = await request(app).post("/boards/tracked").set(headersA).send({ board_id: boardId });
    expect(first.status).toBe(201);

    const second = await request(app).post("/boards/tracked").set(headersA).send({ board_id: boardId });
    expect(second.status).toBe(201);

    const trackedList = await request(app).get("/boards/tracked").set(headersA);
    expect(
      trackedList.body.filter((row: { board_id: string }) => row.board_id === boardId).length,
    ).toBe(1);
  });
});
