CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS categories (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(100) NOT NULL,
  offering     TEXT NOT NULL,
  statement    TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leads (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id       UUID REFERENCES categories(id),
  first_name        VARCHAR(100) NOT NULL,
  last_name         VARCHAR(100) NOT NULL,
  email             VARCHAR(255) UNIQUE NOT NULL,
  company           VARCHAR(255),
  job_title         VARCHAR(255),
  phone             VARCHAR(50),
  source            VARCHAR(100),
  initial_message   TEXT,
  score             INTEGER DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
  tier              VARCHAR(10) DEFAULT 'cold',
  emails_sent       INTEGER DEFAULT 0,
  emails_opened     INTEGER DEFAULT 0,
  links_clicked     INTEGER DEFAULT 0,
  replies_received  INTEGER DEFAULT 0,
  booking_clicks    INTEGER DEFAULT 0,
  last_event_at     TIMESTAMPTZ,
  last_event_type   VARCHAR(50),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lead_snapshots (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id                 UUID UNIQUE NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  current_score           INTEGER NOT NULL,
  summary                 TEXT NOT NULL,
  current_intent          VARCHAR(20) NOT NULL,
  last_meaningful_event   VARCHAR(50),
  suggested_email_subject TEXT,
  suggested_email_body    TEXT,
  suggested_email_sent_at TIMESTAMPTZ,
  llm_model               VARCHAR(100),
  token_cost              INTEGER,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);
