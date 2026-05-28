import { prisma } from "../../db/prisma";
import type { AuthTokensResponse, AuthUser } from "../../types/auth";
import type { UserRole, UserStatus } from "../../types/waitlist";
import {
  hashPassword,
  validatePasswordStrength,
  verifyPassword,
} from "./passwordService";
import {
  generateSecureToken,
  hashToken,
  passwordResetExpiresAt,
  refreshTokenExpiresAt,
  signAccessToken,
} from "./tokenService";
import { sendPasswordResetEmail } from "./authEmailService";

/** Set emailVerifiedAt on signup/login. Re-enable sendVerificationEmail when Resend is configured. */
const AUTO_VERIFY_EMAIL = true;

function toAuthUser(user: {
  id: string;
  email: string;
  emailVerifiedAt: Date | null;
  role: string;
  status: string;
  firstName: string | null;
  lastName: string | null;
}): AuthUser {
  return {
    id: user.id,
    email: user.email,
    emailVerified: Boolean(user.emailVerifiedAt),
    role: (user.role || "user") as UserRole,
    status: (user.status || "active") as UserStatus,
    firstName: user.firstName,
    lastName: user.lastName,
  };
}

function assertCanLogin(user: {
  status: string;
  passwordHash: string | null;
}): void {
  if (user.status === "deactivated") {
    const err = new Error("This account has been deactivated.");
    (err as Error & { statusCode?: number }).statusCode = 403;
    throw err;
  }
  if (user.status === "pending" || !user.passwordHash) {
    const err = new Error(
      "Account setup is incomplete. Use the link in your approval email to set your password."
    );
    (err as Error & { statusCode?: number }).statusCode = 403;
    throw err;
  }
}

async function issueTokens(user: AuthUser): Promise<AuthTokensResponse> {
  const refreshToken = generateSecureToken();
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: refreshTokenExpiresAt(),
    },
  });

  return {
    accessToken: signAccessToken(user),
    refreshToken,
    expiresIn: "5m",
    user,
  };
}

function verifiedUserData(passwordHash: string) {
  return AUTO_VERIFY_EMAIL
    ? {
        passwordHash,
        emailVerifiedAt: new Date(),
        emailVerificationToken: null,
        emailVerificationExpires: null,
      }
    : { passwordHash };
}

export async function signup(
  email: string,
  password: string
): Promise<AuthTokensResponse> {
  const normalizedEmail = email.toLowerCase().trim();
  const passwordError = validatePasswordStrength(password);
  if (passwordError) throw new Error(passwordError);

  const passwordHash = await hashPassword(password);

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existing) {
    if (existing.emailVerifiedAt) {
      throw new Error("An account with this email already exists");
    }
    const user = await prisma.user.update({
      where: { id: existing.id },
      data: verifiedUserData(passwordHash),
    });
    return issueTokens(toAuthUser(user));
  }

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      role: "user",
      status: "active",
      ...verifiedUserData(passwordHash),
    },
  });

  return issueTokens(toAuthUser(user));
}

export async function verifyEmail(token: string): Promise<{ message: string }> {
  const user = await prisma.user.findFirst({
    where: {
      emailVerificationToken: token,
      emailVerificationExpires: { gt: new Date() },
    },
  });

  if (!user) {
    throw new Error("Invalid or expired verification link");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerifiedAt: new Date(),
      emailVerificationToken: null,
      emailVerificationExpires: null,
    },
  });

  return { message: "Email verified successfully. You can now log in." };
}

export async function login(
  email: string,
  password: string
): Promise<AuthTokensResponse> {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user || !user.passwordHash) {
    throw new Error("Invalid email or password");
  }

  if (!(await verifyPassword(password, user.passwordHash))) {
    throw new Error("Invalid email or password");
  }

  assertCanLogin(user);

  if (!user.emailVerifiedAt && AUTO_VERIFY_EMAIL) {
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerifiedAt: new Date(),
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
    });
    return issueTokens(toAuthUser(updated));
  }

  const authUser = toAuthUser(user);
  if (!authUser.emailVerified) {
    const err = new Error(
      "Email not verified. Check your inbox for the verification link."
    );
    (err as Error & { statusCode?: number }).statusCode = 403;
    throw err;
  }

  return issueTokens(authUser);
}

export async function refresh(
  refreshToken: string
): Promise<AuthTokensResponse> {
  const record = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(refreshToken) },
    include: { user: true },
  });

  if (!record || record.expiresAt < new Date()) {
    if (record) {
      await prisma.refreshToken.delete({ where: { id: record.id } });
    }
    throw new Error("Invalid or expired refresh token");
  }

  assertCanLogin(record.user);

  await prisma.refreshToken.delete({ where: { id: record.id } });

  let authUser = toAuthUser(record.user);
  if (!authUser.emailVerified && AUTO_VERIFY_EMAIL) {
    const updated = await prisma.user.update({
      where: { id: record.user.id },
      data: {
        emailVerifiedAt: new Date(),
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
    });
    authUser = toAuthUser(updated);
  } else if (!authUser.emailVerified) {
    throw new Error("Email not verified");
  }

  return issueTokens(authUser);
}

export async function logout(refreshToken: string): Promise<void> {
  await prisma.refreshToken.deleteMany({
    where: { tokenHash: hashToken(refreshToken) },
  });
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (user) {
    const resetToken = generateSecureToken();
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpires: passwordResetExpiresAt(),
      },
    });
    await sendPasswordResetEmail(normalizedEmail, resetToken);
  }

  return {
    message:
      "If an account exists for that email, a password reset link has been sent.",
  };
}

export async function resetPassword(
  token: string,
  newPassword: string
): Promise<{ message: string }> {
  const passwordError = validatePasswordStrength(newPassword);
  if (passwordError) throw new Error(passwordError);

  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: token,
      passwordResetExpires: { gt: new Date() },
    },
  });

  if (!user) {
    throw new Error("Invalid or expired reset link");
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      passwordResetToken: null,
      passwordResetExpires: null,
    },
  });

  await prisma.refreshToken.deleteMany({ where: { userId: user.id } });

  return { message: "Password updated. Please log in with your new password." };
}

export async function getUserById(id: string): Promise<AuthUser | null> {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.status === "deactivated") {
    return null;
  }
  return toAuthUser(user);
}
