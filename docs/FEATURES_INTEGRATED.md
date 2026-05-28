# Integrated features (backend)

**Living inventory** of what is implemented and working in **razor-backend** today.  
For gaps and deferred work, see [NOT_IMPLEMENTED.md](./NOT_IMPLEMENTED.md). For request/response shapes, see [API_REFERENCE.md](../API_REFERENCE.md).

**Last updated:** 2026-05-23

---

## Runtime & deployment

- **Express API** on `PORT` (default `5000`), CORS enabled, JSON body parsing
- **PostgreSQL** via Prisma (`DATABASE_URL`)
- **Health**
  - `GET /` — plain-text liveness (`Leads AI Backend Running`)
  - `GET /api/health/config` — which secrets are configured (no values returned): DB, JWT, OpenAI, outreach email provider
- **Rate limiting** — tiered limits on auth, API, send, tracking, webhooks (`docs/RATE_LIMITING.md`); `trust proxy` for Render
- **Render / production** — deployable with migrations; see `RENDER_DEPLOY.md` and `render.yaml`

**Required env (minimum):** `DATABASE_URL`, `JWT_SECRET`  
**Optional but feature-gating:** `OPENAI_API_KEY`, `EMAIL_CREDENTIALS_ENCRYPTION_KEY`, `APP_URL` (tracking + auth links), `RESEND_*` (auth mail only)

---

## 1. Authentication & users

Multi-tenant: every lead, category, upload, and email is scoped to the authenticated user.

| Feature | Status | Notes |
|---------|--------|-------|
| Sign up | Working | `POST /api/auth/signup` — bcrypt password, strength validation |
| Login | Working | `POST /api/auth/login` → access + refresh tokens |
| Token refresh | Working | `POST /api/auth/refresh` — rotated refresh token |
| Logout | Working | `POST /api/auth/logout` — revokes refresh token |
| Current user | Working | `GET /api/auth/me` |
| Forgot / reset password | Working | `POST /api/auth/forgot-password`, `POST /api/auth/reset-password` |
| Email verification link | Working (endpoint) | `GET /api/auth/verify-email?token=` |
| Auto-verify on signup/login | **On (temporary)** | `AUTO_VERIFY_EMAIL = true` — no gate on protected routes until Resend auth mail is configured |
| JWT access token | Working | Short-lived (default **5 minutes**); Bearer on protected routes |
| Auth transactional email | Working when Resend set | Verification + reset via `authEmailService` (Resend only, separate from outreach provider) |

Protected routes use `authenticate` middleware (`Authorization: Bearer <accessToken>`).

---

## 2. Categories (ICP / offering context)

Categories drive LLM profiling prompts (offering + ideal customer statement).

| Feature | Endpoint |
|---------|----------|
| List categories | `GET /api/categories` |
| Get one | `GET /api/categories/:id` |
| Create | `POST /api/categories` |
| Update | `PATCH /api/categories/:id` |

---

## 3. Leads — CRUD, list, filters

| Feature | Endpoint / behavior |
|---------|---------------------|
| List leads | `GET /api/leads` — query: `tier` (hot/warm/cold), `sort` (e.g. score) |
| Lead detail | `GET /api/leads/:id` — lead fields + `lead_snapshots` + `scoreBreakdown` |
| Create single lead (form) | `POST /api/leads` — JSON body; scores + queues profiling |
| Update lead | `PATCH /api/leads/:id` — rescored; may record `tier_change` events |
| Per-user data isolation | Enforced in repositories by `userId` |
| Unique email per user | `@@unique([userId, email])` on upload/create |

**Lead fields stored:** name, email, company, job title, phone, source, initial message, business detail, engagement counters (`emails_sent`, `emails_opened`, `links_clicked`, `replies_received`, `booking_clicks`), `score`, `tier`, `last_event_*`, optional `category_id`, optional `upload_id`, optional `linkedin_url` (DB column; report export uses it — not yet on create/upload JSON in all paths).

---

## 4. Deterministic scoring & tiers

No LLM — rule-based score 0–100 and tier assignment.

| Feature | Detail |
|---------|--------|
| Score calculation | `scoringService` — signals: exec/manager title, company, initial message, referral source, email opens (1+ and 3+), link clicks, replies, booking clicks |
| Tier from score | `src/constants/leadTiers.ts` — **hot** ≥ 70, **warm** ≥ 40, **cold** &lt; 40 |
| Score on create/update/upload | Score + tier persisted on `leads` |
| Score breakdown (“why this score”) | `GET /api/leads/:id` includes `scoreBreakdown`; dedicated `GET /api/leads/:id/score` |
| Tier change analytics | `tier_change` events written when tier changes on rescore |

---

## 5. Excel upload & export

| Feature | Endpoint |
|---------|----------|
| Upload `.xlsx` | `POST /api/leads/upload` — multipart `file`; create/update by email |
| Upload metadata | Optional `categoryId`, `defaultCategoryId`, `uploadId` (client idempotency), `sourceLabel` / `source` |
| Upload stats | Returns created/updated/error counts; links leads to `lead_uploads` |
| Download upload template | `GET /api/leads/upload/template` — sample columns (optional `?samples=false`) |
| Export all leads (re-upload shape) | `GET /api/leads/export` — `.xlsx` download |
| Parser | `excelParser.ts` — column mapping for bulk ingest |
| Post-upload profiling | Queued per lead (`profilingQueueService`) when `OPENAI_API_KEY` is set |

---

## 6. LLM profiling (LangChain + OpenAI)

| Feature | Detail |
|---------|--------|
| Profiling chain | `profilingChain.ts` — structured output: summary, intent (high/medium/low), last meaningful event, suggested email subject/body |
| Snapshot storage | `lead_snapshots` — one snapshot per lead |
| Triggered after | Upload, `POST /api/leads`, `PATCH /api/leads/:id/snapshot` |
| Async execution | In-process queue (`setImmediate`); not a Redis/Bull worker |
| Manual refresh | `PATCH /api/leads/:id/snapshot` — regenerates snapshot from current lead + category |
| Model config | `OPENAI_MODEL` (default `gpt-4o-mini`), requires `OPENAI_API_KEY` |

---

## 7. Pipeline analytics

Read-only aggregations for dashboard charts (no LLM).

| Feature | Endpoint |
|---------|----------|
| Pipeline dashboard data | `GET /api/analytics/pipeline?days=30` (7–365) |

**Includes:** tier distribution, tier movement over time (`tier_change` events), engagement rates (open/reply/click/booking vs leads emailed), breakdown by category, upload history with tier counts, hot leads week-over-week.

**Tables:** `lead_uploads`, `lead_events`, `leads.upload_id`

See [PIPELINE_ANALYTICS.md](./PIPELINE_ANALYTICS.md).

---

## 8. Filtered report export

For spreadsheet reports (Report modal backend).

| Feature | Endpoint |
|---------|----------|
| Tier definitions for UI | `GET /api/reports/tiers` — hot/warm/cold thresholds + report limit options |
| Filtered Excel report | `GET /api/reports/export` |

**Filters:** `categoryId`, `tier`, `dateFrom`, `dateTo`, `limit` (10 / 20 / 50 / 100 / all)

**Columns:** Name, Email, Company, Job Title, LinkedIn URL, Category, Score, Tier, Intent, AI Summary, engagement fields, last event

---

## 9. Email identities (per-user senders)

Multiple encrypted sending identities per user; default auto-selected on send.

| Feature | Endpoint |
|---------|----------|
| List identities (masked secrets) | `GET /api/settings/email-identities` |
| Default identity | `GET /api/settings/email-identity` or `.../default` |
| Create / update / delete | `POST`, `PATCH`, `DELETE` under `/api/settings/email-identities` |
| Set default ⭐ | `POST .../:id/default` |
| Test send | `POST .../:id/test` |
| Providers | `gmail`, `smtp`, `resend`, `brevo` |
| Credential storage | AES-256-GCM in DB (`EMAIL_CREDENTIALS_ENCRYPTION_KEY` on server) |

See [EMAIL_IDENTITIES.md](./EMAIL_IDENTITIES.md) — includes **frontend checklist**.

---

## 10. Email outreach & tracking

Outreach uses **per-user email identities** (not server `SMTP_*` / `RESEND_*` env for send).

| Feature | Endpoint / path |
|---------|-----------------|
| Draft from snapshot | `POST /api/emails/draft` |
| Bulk recipient preview | `POST /api/emails/recipients/preview` |
| Send (one or bulk) | `POST /api/emails/send` — optional `emailIdentityId` |
| Outbox list | `GET /api/emails` — `?emailIdentityId=`, tier, opened, replied |
| Sent email detail | `GET /api/emails/:id` — includes `emailIdentity` |
| Lead email timeline | `GET /api/leads/:id/emails` |
| Send suggested email | `POST /api/leads/:id/email/send` |
| Open / click tracking | `GET /api/track/open|click/...` (per-identity `trackingEnabled`) |
| `sent_emails.email_identity_id` | Links each send to the identity used |

See [EMAIL_OUTREACH.md](./EMAIL_OUTREACH.md).

---

## 11. Event ingestion (internal)

| Event types (examples) | Source |
|------------------------|--------|
| `email_sent`, `email_opened`, `link_clicked` | Outreach send + tracking routes |
| `email_replied` | Resend inbound webhook |
| `tier_change` | Rescore on PATCH / upload |

Stored in `lead_events` with optional `from_tier` / `to_tier` and JSON `metadata`.

---

## 12. Database schema (migrations applied in repo)

| Migration | Adds |
|-----------|------|
| `20250517120000_init` | Core leads, categories, snapshots |
| `20250518120000_add_lead_business_detail` | `business_detail` on leads |
| `20250519120000_add_auth_and_user_scoping` | Users, refresh tokens, user scoping |
| `20250520120000_add_pipeline_analytics` | `lead_uploads`, `lead_events`, `upload_id` |
| `20250521120000_add_sent_emails` | Outreach + tracking storage |
| `20250522120000_add_lead_linkedin_url` | `linkedin_url` on leads |
| `20250523120000_add_email_identities` | `email_identities`, `sent_emails.email_identity_id` |

Deploy: `npx prisma migrate deploy`

---

## 13. API surface summary (all integrated routes)

### Public

- `GET /`
- `GET /api/health/config`
- `POST /api/auth/*` (signup, login, refresh, logout, forgot/reset password, verify-email)
- `GET /api/track/open/:id.png`
- `GET /api/track/click/:sentEmailId/:linkIndex`
- `POST /api/webhooks/resend/inbound`

### Protected (Bearer JWT)

- Categories: `GET/POST/PATCH` under `/api/categories`
- Leads: list, create, upload, template, export, detail, score, patch, snapshot refresh, per-lead send
- Analytics: `GET /api/analytics/pipeline`
- Emails: draft, preview, send, list, detail; lead timeline
- Reports: tiers, export
- Auth: `GET /api/auth/me`

---

## 14. Not in this repo (by design)

These are **not** backend gaps in the sense of missing APIs — they are **frontend / ops** items:

- React (or other) UI for leads table, lead detail, score tab, outreach compose, analytics charts, report modal
- Gmail API reply polling for SMTP users
- `GET /api/uploads/:id/progress` (SSE profiling progress)
- `POST /api/events` (generic webhook)
- BullMQ / Redis job queue for profiling
- Email verification gate re-enabled on all protected routes

Full backlog: [NOT_IMPLEMENTED.md](./NOT_IMPLEMENTED.md).

---

## 15. Related documentation

| Doc | Purpose |
|-----|---------|
| [API_REFERENCE.md](../API_REFERENCE.md) | Request/response examples for frontend |
| [AUTH_UNDERSTANDING.md](./AUTH_UNDERSTANDING.md) | Auth flows and token usage |
| [EMAIL_OUTREACH.md](./EMAIL_OUTREACH.md) | Env vars, tracking, webhooks |
| [PIPELINE_ANALYTICS.md](./PIPELINE_ANALYTICS.md) | Analytics response fields |
| [NOT_IMPLEMENTED.md](./NOT_IMPLEMENTED.md) | Backlog and recently shipped |
