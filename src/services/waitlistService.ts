import { prisma } from "../db/prisma";
import { hashPassword, validatePasswordStrength } from "./auth/passwordService";
import { sendWaitlistSetupEmail } from "./auth/authEmailService";
import {
  generateSecureToken,
  passwordSetupExpiresAt,
} from "./auth/tokenService";
import type {
  WaitlistEntryPublic,
  WaitlistSignupInput,
  WaitlistStatus,
} from "../types/waitlist";

function toWaitlistPublic(row: {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  businessIndustry: string;
  status: string;
  userId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): WaitlistEntryPublic {
  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    businessIndustry: row.businessIndustry,
    status: row.status as WaitlistStatus,
    userId: row.userId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function validateSignupInput(input: WaitlistSignupInput): WaitlistSignupInput {
  const firstName = input.firstName?.trim();
  const lastName = input.lastName?.trim();
  const email = input.email?.trim().toLowerCase();
  const businessIndustry = input.businessIndustry?.trim();

  if (!firstName) throw new Error("firstName is required");
  if (!lastName) throw new Error("lastName is required");
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("A valid email is required");
  }
  if (!businessIndustry) throw new Error("businessIndustry is required");

  return { firstName, lastName, email, businessIndustry };
}

export async function joinWaitlist(
  input: WaitlistSignupInput
): Promise<WaitlistEntryPublic> {
  const data = validateSignupInput(input);

  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
  });
  if (existingUser) {
    throw new Error("An account with this email already exists");
  }

  const existingWaitlist = await prisma.waitlistEntry.findUnique({
    where: { email: data.email },
  });
  if (existingWaitlist) {
    throw new Error("This email is already on the waitlist");
  }

  const row = await prisma.waitlistEntry.create({
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      businessIndustry: data.businessIndustry,
      status: "pending",
    },
  });

  return toWaitlistPublic(row);
}

export async function listWaitlistEntries(): Promise<WaitlistEntryPublic[]> {
  const rows = await prisma.waitlistEntry.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
  return rows.map(toWaitlistPublic);
}

/** Admin only — pending → active, create user, email setup link */
export async function approveWaitlistEntry(
  waitlistId: string
): Promise<WaitlistEntryPublic> {
  const entry = await prisma.waitlistEntry.findUnique({
    where: { id: waitlistId },
  });

  if (!entry) throw new Error("Waitlist entry not found");
  if (entry.status === "active") {
    throw new Error("Waitlist entry is already approved");
  }
  if (entry.status === "rejected") {
    throw new Error("Rejected waitlist entries cannot be approved");
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: entry.email },
  });
  if (existingUser) {
    throw new Error("A user account already exists for this email");
  }

  const setupToken = generateSecureToken();

  const user = await prisma.user.create({
    data: {
      email: entry.email,
      firstName: entry.firstName,
      lastName: entry.lastName,
      businessIndustry: entry.businessIndustry,
      role: "user",
      status: "pending",
      passwordHash: null,
      emailVerifiedAt: new Date(),
      passwordSetupToken: setupToken,
      passwordSetupExpires: passwordSetupExpiresAt(),
    },
  });

  const updated = await prisma.waitlistEntry.update({
    where: { id: waitlistId },
    data: {
      status: "active",
      userId: user.id,
    },
  });

  await sendWaitlistSetupEmail(entry.email, entry.firstName, setupToken);

  return toWaitlistPublic(updated);
}

export async function rejectWaitlistEntry(
  waitlistId: string
): Promise<WaitlistEntryPublic> {
  const entry = await prisma.waitlistEntry.findUnique({
    where: { id: waitlistId },
  });
  if (!entry) throw new Error("Waitlist entry not found");

  const updated = await prisma.waitlistEntry.update({
    where: { id: waitlistId },
    data: { status: "rejected" },
  });

  return toWaitlistPublic(updated);
}

export async function validatePasswordSetupToken(token: string): Promise<{
  email: string;
  firstName: string;
  lastName: string;
}> {
  const user = await prisma.user.findFirst({
    where: {
      passwordSetupToken: token,
      passwordSetupExpires: { gt: new Date() },
      status: "pending",
    },
  });

  if (!user) {
    throw new Error("Invalid or expired setup link");
  }

  return {
    email: user.email,
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
  };
}

export async function completePasswordSetup(
  token: string,
  password: string
): Promise<{ message: string }> {
  const passwordError = validatePasswordStrength(password);
  if (passwordError) throw new Error(passwordError);

  const user = await prisma.user.findFirst({
    where: {
      passwordSetupToken: token,
      passwordSetupExpires: { gt: new Date() },
      status: "pending",
    },
  });

  if (!user) {
    throw new Error("Invalid or expired setup link");
  }

  const passwordHash = await hashPassword(password);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      status: "active",
      passwordSetupToken: null,
      passwordSetupExpires: null,
    },
  });

  return {
    message: "Password set successfully. You can now log in.",
  };
}
