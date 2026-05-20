import { prisma } from "../../db/prisma";
import type { AuthTokensResponse, AuthUser } from "../../types/auth";
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
  verificationExpiresAt,
} from "./tokenService";
import { sendPasswordResetEmail, sendVerificationEmail } from "./authEmailService";

function toAuthUser(user: {
  id: string;
  email: string;
  emailVerifiedAt: Date | null;
}): AuthUser {
  return {
    id: user.id,
    email: user.email,
    emailVerified: Boolean(user.emailVerifiedAt),
  };
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
    user: {
      id: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
    },
  };
}

export async function signup(
  email: string,
  password: string
): Promise<{ message: string }> {
  const normalizedEmail = email.toLowerCase().trim();
  const passwordError = validatePasswordStrength(password);
  if (passwordError) throw new Error(passwordError);

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });
  if (existing) {
    throw new Error("An account with this email already exists");
  }

  const verificationToken = generateSecureToken();
  const passwordHash = await hashPassword(password);

  await prisma.user.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpiresAt(),
    },
  });

  await sendVerificationEmail(normalizedEmail, verificationToken);

  return {
    message:
      "Account created. Check your email for a verification link before logging in.",
  };
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

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw new Error("Invalid email or password");
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

  await prisma.refreshToken.delete({ where: { id: record.id } });

  const authUser = toAuthUser(record.user);
  if (!authUser.emailVerified) {
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
  return user ? toAuthUser(user) : null;
}
