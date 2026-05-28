import { prisma } from "../db/prisma";
import type { AdminUserListItem, UserRole, UserStatus } from "../types/waitlist";

export async function listAllUsersForAdmin(): Promise<AdminUserListItem[]> {
  const rows = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: { waitlistEntry: { select: { id: true } } },
  });

  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    firstName: row.firstName,
    lastName: row.lastName,
    businessIndustry: row.businessIndustry,
    role: row.role as UserRole,
    status: row.status as UserStatus,
    hasPassword: Boolean(row.passwordHash),
    waitlistId: row.waitlistEntry?.id ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export async function approveUserAccount(userId: string): Promise<AdminUserListItem> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");
  if (user.role === "admin") {
    throw new Error("Cannot change approval status of admin accounts via this action");
  }
  if (!user.passwordHash) {
    throw new Error(
      "User has not set a password yet. They must use the invite link first."
    );
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { status: "active" },
    include: { waitlistEntry: { select: { id: true } } },
  });

  return {
    id: updated.id,
    email: updated.email,
    firstName: updated.firstName,
    lastName: updated.lastName,
    businessIndustry: updated.businessIndustry,
    role: updated.role as UserRole,
    status: updated.status as UserStatus,
    hasPassword: Boolean(updated.passwordHash),
    waitlistId: updated.waitlistEntry?.id ?? null,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  };
}

export async function deactivateUserAccount(userId: string): Promise<AdminUserListItem> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");
  if (user.role === "admin") {
    throw new Error("Cannot deactivate an admin account");
  }

  await prisma.refreshToken.deleteMany({ where: { userId } });

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { status: "deactivated" },
    include: { waitlistEntry: { select: { id: true } } },
  });

  return {
    id: updated.id,
    email: updated.email,
    firstName: updated.firstName,
    lastName: updated.lastName,
    businessIndustry: updated.businessIndustry,
    role: updated.role as UserRole,
    status: updated.status as UserStatus,
    hasPassword: Boolean(updated.passwordHash),
    waitlistId: updated.waitlistEntry?.id ?? null,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  };
}

export async function updateUserRole(
  userId: string,
  role: UserRole
): Promise<AdminUserListItem> {
  if (role !== "admin" && role !== "user") {
    throw new Error("role must be admin or user");
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { role },
    include: { waitlistEntry: { select: { id: true } } },
  });

  return {
    id: updated.id,
    email: updated.email,
    firstName: updated.firstName,
    lastName: updated.lastName,
    businessIndustry: updated.businessIndustry,
    role: updated.role as UserRole,
    status: updated.status as UserStatus,
    hasPassword: Boolean(updated.passwordHash),
    waitlistId: updated.waitlistEntry?.id ?? null,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  };
}
