export const EMAIL_PROVIDER_TYPES = [
  "gmail",
  "smtp",
  "resend",
  "brevo",
] as const;

export type EmailProviderType = (typeof EMAIL_PROVIDER_TYPES)[number];

export const REPLY_HANDLING_MODES = ["webhook", "gmail", "manual"] as const;

export type ReplyHandlingMode = (typeof REPLY_HANDLING_MODES)[number];

/** Stored encrypted (JSON before encrypt). */
export interface SmtpCredentials {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
}

export interface ApiKeyCredentials {
  apiKey: string;
}

export type IdentityCredentials = SmtpCredentials | ApiKeyCredentials;

export interface EmailIdentityPublic {
  id: string;
  label: string;
  fromName: string;
  fromEmail: string;
  replyTo: string | null;
  providerType: EmailProviderType;
  domainVerified: boolean;
  isDefault: boolean;
  trackingEnabled: boolean;
  replyHandlingMode: ReplyHandlingMode;
  credentialsMasked: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmailIdentityInput {
  label: string;
  fromName: string;
  fromEmail: string;
  replyTo?: string | null;
  providerType: EmailProviderType;
  domainVerified?: boolean;
  isDefault?: boolean;
  trackingEnabled?: boolean;
  replyHandlingMode?: ReplyHandlingMode;
  credentials: IdentityCredentials;
}

export interface UpdateEmailIdentityInput {
  label?: string;
  fromName?: string;
  fromEmail?: string;
  replyTo?: string | null;
  domainVerified?: boolean;
  isDefault?: boolean;
  trackingEnabled?: boolean;
  replyHandlingMode?: ReplyHandlingMode;
  /** Omit to keep existing encrypted credentials */
  credentials?: IdentityCredentials;
}
