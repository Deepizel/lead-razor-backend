"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.signup = signup;
exports.verifyEmail = verifyEmail;
exports.login = login;
exports.refresh = refresh;
exports.logout = logout;
exports.forgotPassword = forgotPassword;
exports.resetPassword = resetPassword;
exports.getUserById = getUserById;
const prisma_1 = require("../../db/prisma");
const passwordService_1 = require("./passwordService");
const tokenService_1 = require("./tokenService");
const authEmailService_1 = require("./authEmailService");
function toAuthUser(user) {
    return {
        id: user.id,
        email: user.email,
        emailVerified: Boolean(user.emailVerifiedAt),
    };
}
async function issueTokens(user) {
    const refreshToken = (0, tokenService_1.generateSecureToken)();
    await prisma_1.prisma.refreshToken.create({
        data: {
            userId: user.id,
            tokenHash: (0, tokenService_1.hashToken)(refreshToken),
            expiresAt: (0, tokenService_1.refreshTokenExpiresAt)(),
        },
    });
    return {
        accessToken: (0, tokenService_1.signAccessToken)(user),
        refreshToken,
        expiresIn: "5m",
        user: {
            id: user.id,
            email: user.email,
            emailVerified: user.emailVerified,
        },
    };
}
async function signup(email, password) {
    const normalizedEmail = email.toLowerCase().trim();
    const passwordError = (0, passwordService_1.validatePasswordStrength)(password);
    if (passwordError)
        throw new Error(passwordError);
    const existing = await prisma_1.prisma.user.findUnique({
        where: { email: normalizedEmail },
    });
    if (existing) {
        throw new Error("An account with this email already exists");
    }
    const verificationToken = (0, tokenService_1.generateSecureToken)();
    const passwordHash = await (0, passwordService_1.hashPassword)(password);
    await prisma_1.prisma.user.create({
        data: {
            email: normalizedEmail,
            passwordHash,
            emailVerificationToken: verificationToken,
            emailVerificationExpires: (0, tokenService_1.verificationExpiresAt)(),
        },
    });
    await (0, authEmailService_1.sendVerificationEmail)(normalizedEmail, verificationToken);
    return {
        message: "Account created. Check your email for a verification link before logging in.",
    };
}
async function verifyEmail(token) {
    const user = await prisma_1.prisma.user.findFirst({
        where: {
            emailVerificationToken: token,
            emailVerificationExpires: { gt: new Date() },
        },
    });
    if (!user) {
        throw new Error("Invalid or expired verification link");
    }
    await prisma_1.prisma.user.update({
        where: { id: user.id },
        data: {
            emailVerifiedAt: new Date(),
            emailVerificationToken: null,
            emailVerificationExpires: null,
        },
    });
    return { message: "Email verified successfully. You can now log in." };
}
async function login(email, password) {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma_1.prisma.user.findUnique({
        where: { email: normalizedEmail },
    });
    if (!user || !(await (0, passwordService_1.verifyPassword)(password, user.passwordHash))) {
        throw new Error("Invalid email or password");
    }
    const authUser = toAuthUser(user);
    if (!authUser.emailVerified) {
        const err = new Error("Email not verified. Check your inbox for the verification link.");
        err.statusCode = 403;
        throw err;
    }
    return issueTokens(authUser);
}
async function refresh(refreshToken) {
    const record = await prisma_1.prisma.refreshToken.findUnique({
        where: { tokenHash: (0, tokenService_1.hashToken)(refreshToken) },
        include: { user: true },
    });
    if (!record || record.expiresAt < new Date()) {
        if (record) {
            await prisma_1.prisma.refreshToken.delete({ where: { id: record.id } });
        }
        throw new Error("Invalid or expired refresh token");
    }
    await prisma_1.prisma.refreshToken.delete({ where: { id: record.id } });
    const authUser = toAuthUser(record.user);
    if (!authUser.emailVerified) {
        throw new Error("Email not verified");
    }
    return issueTokens(authUser);
}
async function logout(refreshToken) {
    await prisma_1.prisma.refreshToken.deleteMany({
        where: { tokenHash: (0, tokenService_1.hashToken)(refreshToken) },
    });
}
async function forgotPassword(email) {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma_1.prisma.user.findUnique({
        where: { email: normalizedEmail },
    });
    if (user) {
        const resetToken = (0, tokenService_1.generateSecureToken)();
        await prisma_1.prisma.user.update({
            where: { id: user.id },
            data: {
                passwordResetToken: resetToken,
                passwordResetExpires: (0, tokenService_1.passwordResetExpiresAt)(),
            },
        });
        await (0, authEmailService_1.sendPasswordResetEmail)(normalizedEmail, resetToken);
    }
    return {
        message: "If an account exists for that email, a password reset link has been sent.",
    };
}
async function resetPassword(token, newPassword) {
    const passwordError = (0, passwordService_1.validatePasswordStrength)(newPassword);
    if (passwordError)
        throw new Error(passwordError);
    const user = await prisma_1.prisma.user.findFirst({
        where: {
            passwordResetToken: token,
            passwordResetExpires: { gt: new Date() },
        },
    });
    if (!user) {
        throw new Error("Invalid or expired reset link");
    }
    const passwordHash = await (0, passwordService_1.hashPassword)(newPassword);
    await prisma_1.prisma.user.update({
        where: { id: user.id },
        data: {
            passwordHash,
            passwordResetToken: null,
            passwordResetExpires: null,
        },
    });
    await prisma_1.prisma.refreshToken.deleteMany({ where: { userId: user.id } });
    return { message: "Password updated. Please log in with your new password." };
}
async function getUserById(id) {
    const user = await prisma_1.prisma.user.findUnique({ where: { id } });
    return user ? toAuthUser(user) : null;
}
