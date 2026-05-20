import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../services/auth/tokenService";
import { getUserById } from "../services/auth/authService";

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const token = header.slice(7);
  try {
    const payload = verifyAccessToken(token);
    const user = await getUserById(payload.sub);
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired access token" });
  }
}

export function requireVerifiedEmail(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user?.emailVerified) {
    res.status(403).json({
      error: "Email not verified. Check your inbox for the verification link.",
    });
    return;
  }
  next();
}
