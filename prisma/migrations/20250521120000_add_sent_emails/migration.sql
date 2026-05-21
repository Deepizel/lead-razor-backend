CREATE TABLE "sent_emails" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "provider" VARCHAR(20) NOT NULL,
    "provider_message_id" VARCHAR(255),
    "subject" VARCHAR(500) NOT NULL,
    "body_html" TEXT NOT NULL,
    "body_text" TEXT NOT NULL,
    "links_json" JSONB,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "sent_at" TIMESTAMPTZ(6),
    "first_opened_at" TIMESTAMPTZ(6),
    "open_count" INTEGER NOT NULL DEFAULT 0,
    "first_clicked_at" TIMESTAMPTZ(6),
    "click_count" INTEGER NOT NULL DEFAULT 0,
    "replied_at" TIMESTAMPTZ(6),
    "reply_snippet" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sent_emails_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "sent_emails_user_id_sent_at_idx" ON "sent_emails"("user_id", "sent_at" DESC);
CREATE INDEX "sent_emails_lead_id_sent_at_idx" ON "sent_emails"("lead_id", "sent_at" DESC);

ALTER TABLE "sent_emails"
    ADD CONSTRAINT "sent_emails_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sent_emails"
    ADD CONSTRAINT "sent_emails_lead_id_fkey"
    FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
