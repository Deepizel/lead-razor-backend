import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "crypto";
import { env, assertEmailCredentialsEncryptionConfigured } from "../config/env";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const SCRYPT_SALT = "razor-email-credentials-v1";

function deriveKey(raw: string): Buffer {
  const trimmed = raw.trim();
  if (trimmed.length === 64 && /^[0-9a-f]+$/i.test(trimmed)) {
    return Buffer.from(trimmed, "hex");
  }
  if (trimmed.length >= 32) {
    const b64 = Buffer.from(trimmed, "base64");
    if (b64.length === 32) return b64;
  }
  return scryptSync(trimmed, SCRYPT_SALT, 32);
}

function encryptionKey(): Buffer {
  assertEmailCredentialsEncryptionConfigured();
  return deriveKey(env.emailCredentialsEncryptionKey);
}

/** AES-256-GCM encrypt JSON-serializable credentials (reversible — required for SMTP/API send). */
export function encryptCredentials(payload: unknown): string {
  const key = encryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const plaintext = JSON.stringify(payload);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

export function decryptCredentials<T>(blob: string): T {
  const key = encryptionKey();
  const parts = blob.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted credentials format");
  }
  const iv = Buffer.from(parts[0], "base64");
  const authTag = Buffer.from(parts[1], "base64");
  const data = Buffer.from(parts[2], "base64");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return JSON.parse(decrypted.toString("utf8")) as T;
}
