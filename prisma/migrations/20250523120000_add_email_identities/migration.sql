-- Per-user sending identities (encrypted credentials) + link sent emails to identity

CREATE TABLE "email_identities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "label" VARCHAR(100) NOT NULL,
    "from_name" VARCHAR(100) NOT NULL,
    "from_email" VARCHAR(255) NOT NULL,
    "reply_to" VARCHAR(255),
    "provider_type" VARCHAR(20) NOT NULL,
    "domain_verified" BOOLEAN NOT NULL DEFAULT false,
    "credentials_encrypted" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "tracking_enabled" BOOLEAN NOT NULL DEFAULT true,
    "reply_handling_mode" VARCHAR(20) NOT NULL DEFAULT 'webhook',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_identities_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "email_identities_user_id_idx" ON "email_identities"("user_id");
CREATE INDEX "email_identities_user_id_is_default_idx" ON "email_identities"("user_id", "is_default");

ALTER TABLE "email_identities" ADD CONSTRAINT "email_identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sent_emails" ADD COLUMN "email_identity_id" UUID;

CREATE INDEX "sent_emails_email_identity_id_idx" ON "sent_emails"("email_identity_id");

ALTER TABLE "sent_emails" ADD CONSTRAINT "sent_emails_email_identity_id_fkey" FOREIGN KEY ("email_identity_id") REFERENCES "email_identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
