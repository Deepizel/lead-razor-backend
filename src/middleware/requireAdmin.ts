import { Request, Response, NextFunction } from "express";
import { prisma } from "../db/prisma";

/** Must run after `authenticate`. */
export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user?.id) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { role: true, status: true },
  });

  if (!user || user.status === "deactivated") {
    res.status(403).json({ error: "Account is deactivated" });
    return;
  }

  if (user.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  next();
}
