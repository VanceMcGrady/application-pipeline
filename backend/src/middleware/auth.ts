import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export type AuthedRequest = Request<any, any, any, any, any> & {
  token: string;
  userId: string;
};

/**
 * Extracts the bearer token and decodes the JWT's `sub` claim for use in
 * insert payloads. This is NOT the security check — it's just so we have a
 * user_id to write. Postgres independently re-verifies the JWT's signature
 * and enforces `user_id = auth.uid()` via RLS, so a forged value here would
 * simply be rejected by the insert policy, not trusted.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authorization = req.header("authorization");
  if (!authorization || !authorization.startsWith("Bearer ")) {
    res.status(401).json({ detail: "Missing bearer token" });
    return;
  }

  const token = authorization.slice("Bearer ".length);
  const payload = jwt.decode(token) as { sub?: string } | null;
  if (!payload?.sub) {
    res.status(401).json({ detail: "Invalid bearer token" });
    return;
  }

  (req as AuthedRequest).token = token;
  (req as AuthedRequest).userId = payload.sub;
  next();
}
