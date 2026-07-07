import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { roleCreate, roleUpdate } from "../schemas/role.js";
import { getUserSupabaseClient } from "../supabaseClients.js";

export const rolesRouter = Router();

rolesRouter.use(requireAuth);

rolesRouter.get("", async (req, res) => {
  const client = getUserSupabaseClient((req as AuthedRequest).token);
  const { data, error } = await client
    .from("roles")
    .select("*")
    .order("start_date", { ascending: false });
  if (error) {
    res.status(400).json({ detail: error.message });
    return;
  }
  console.log("data in roles.ts", data);
  res.json(data);
});

rolesRouter.post("", validateBody(roleCreate), async (req, res) => {
  const { token, userId } = req as AuthedRequest;
  const client = getUserSupabaseClient(token);
  const payload = { ...req.body, user_id: userId };
  console.log("payload", payload);
  const { data, error } = await client.from("roles").insert(payload).select().single();
  console.log("data", data);
  console.log("error", error);
  if (error) {
    res.status(400).json({ detail: error.message });
    return;
  }
  res.status(201).json(data);
});

rolesRouter.get("/:roleId", async (req, res) => {
  const client = getUserSupabaseClient((req as AuthedRequest).token);
  const { data, error } = await client
    .from("roles")
    .select("*")
    .eq("id", req.params.roleId);
  if (error || !data?.length) {
    res.status(404).json({ detail: "Role not found" });
    return;
  }
  res.json(data[0]);
});

rolesRouter.patch("/:roleId", validateBody(roleUpdate), async (req, res) => {
  if (Object.keys(req.body).length === 0) {
    res.status(400).json({ detail: "No fields to update" });
    return;
  }
  const client = getUserSupabaseClient((req as AuthedRequest).token);
  const { data, error } = await client
    .from("roles")
    .update(req.body)
    .eq("id", req.params.roleId)
    .select();
  if (error || !data?.length) {
    res.status(404).json({ detail: "Role not found" });
    return;
  }
  res.json(data[0]);
});

rolesRouter.delete("/:roleId", async (req, res) => {
  const client = getUserSupabaseClient((req as AuthedRequest).token);
  await client.from("roles").delete().eq("id", req.params.roleId);
  res.status(204).send();
});
