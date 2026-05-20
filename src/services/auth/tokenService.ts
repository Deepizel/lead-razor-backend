import crypto from "crypto";
import jwt from "jsonwebtoken";
import { env, assertAuthConfigured } from "../../config/env";
import type { AuthUser } from "../../types/auth";

export interface AccessTokenPayload {
  sub: string;
  email: string;
  type: "access";
}

export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function signAccessToken(user: AuthUser): string {
  assertAuthConfigured();
  const payload: AccessTokenPayload = {
    sub: user.id,
    email: user.email,
    type: "access",
  };
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtAccessExpires as jwt.SignOptions["expiresIn"],
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  assertAuthConfigured();
  const payload = jwt.verify(token, env.jwtSecret) as AccessTokenPayload;
  if (payload.type !== "access") {
    throw new Error("Invalid token type");
  }
  return payload;
}

export function refreshTokenExpiresAt(): Date {
  const d = new Date();
  d.setDate(d.getDate() + env.jwtRefreshExpiresDays);
  return d;
}

export function verificationExpiresAt(): Date {
  const d = new Date();
  d.setHours(d.getHours() + 24);
  return d;
}

export function passwordResetExpiresAt(): Date {
  const d = new Date();
  d.setHours(d.getHours() + 1);
  return d;
}
