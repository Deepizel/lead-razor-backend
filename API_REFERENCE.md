# Lead Qualifier API — Frontend Integration Reference

**Base URL (local default):** `http://localhost:5000`  
**Production:** `https://lead-razor-backend.onrender.com`

**Global headers (JSON routes):**

```http
Content-Type: application/json
```

CORS is enabled on all routes.

**Protected routes** require:

```http
Authorization: Bearer <accessToken>
```

Access tokens expire in **5 minutes**. Use `POST /api/auth/refresh` with the refresh token to stay logged in.

See **`docs/AUTH_UNDERSTANDING.md`** for full auth flows.

For a categorized list of everything working today, see **`docs/FEATURES_INTEGRATED.md`**.

---

## Implemented endpoints

### Auth (public)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/signup` | Register; sends email verification link |
| `GET` | `/api/auth/verify-email?token=` | Confirm email (link from inbox) |
| `POST` | `/api/auth/login` | Login → access + refresh tokens |
| `POST` | `/api/auth/refresh` | New access token (5m) + rotated refresh |
| `POST` | `/api/auth/logout` | Revoke refresh token |
| `POST` | `/api/auth/forgot-password` | Send password reset link |
| `POST` | `/api/auth/reset-password` | Set new password with token |
| `GET` | `/api/auth/me` | Current user (requires Bearer) |

### App (requires auth + verified email)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Health check |
| `GET` | `/api/categories` | List all categories |
| `GET` | `/api/categories/:id` | Get one category by ID |
| `POST` | `/api/categories` | Create a category |
| `PATCH` | `/api/categories/:id` | Update a category |
| `GET` | `/api/leads` | List leads (`?tier=&sort=`) |
| `POST` | `/api/leads` | Create one lead (form JSON) |
| `POST` | `/api/leads/upload` | Upload `.xlsx` — create/update leads |
| `GET` | `/api/leads/upload/template` | Download upload template (`.xlsx`) |
| `GET` | `/api/leads/export` | Download all leads as `.xlsx` |
| `GET` | `/api/reports/tiers` | Tier definitions + score thresholds (for filters) |
| `GET` | `/api/reports/export` | Filtered leads report `.xlsx` (modal export) |
| `GET` | `/api/leads/:id` | Lead detail + snapshot |
| `GET` | `/api/leads/:id/score` | Score breakdown checklist only |
| `PATCH` | `/api/leads/:id` | Update a lead (rescored) |
| `PATCH` | `/api/leads/:id/snapshot` | Regenerate LLM snapshot (incl. suggested email) |
| `POST` | `/api/leads/:id/email/send` | Send suggested email (optional `emailIdentityId` in body) |
| `GET` | `/api/analytics/pipeline` | Pipeline dashboard aggregations (`?days=30`) |
| `GET` | `/api/settings/email-identities` | List sending identities (masked credentials) |
| `GET` | `/api/settings/email-identity` | Default sending identity |
| `POST` | `/api/settings/email-identities` | Create sending identity (encrypts credentials) |
| `PATCH` | `/api/settings/email-identities/:id` | Update identity |
| `DELETE` | `/api/settings/email-identities/:id` | Delete identity |
| `POST` | `/api/settings/email-identities/:id/default` | Set default sender |
| `POST` | `/api/settings/email-identities/:id/test` | Test send |
| `POST` | `/api/emails/draft` | Draft subject/body from lead snapshot |
| `POST` | `/api/emails/send` | Send outreach (optional `emailIdentityId`; uses default if omitted) |
| `GET` | `/api/emails` | Outbox (`?emailIdentityId=` filter) |
| `GET` | `/api/emails/:id` | Sent email detail + tracking + `emailIdentity` |
| `GET` | `/api/leads/:id/emails` | Lead email timeline |

See **`docs/EMAIL_IDENTITIES.md`** for per-user senders and **frontend checklist**.  
See **`docs/EMAIL_OUTREACH.md`** for tracking URLs and webhooks.

---

## Pipeline analytics

Read-only dashboard data for the Pipeline Analytics panel. No LLM — aggregations on `leads`, `lead_uploads`, and `lead_events`.

```http
GET /api/analytics/pipeline?days=30
Authorization: Bearer <accessToken>
```

**Query**

| Param | Default | Description |
|-------|---------|-------------|
| `days` | `30` | Lookback window (clamped 7–365) for tier movement series |

**Success `200`**

```json
{
  "period": { "days": 30, "from": "...", "to": "..." },
  "tierDistribution": { "hot": 12, "warm": 40, "cold": 88 },
  "tierMovement": [
    {
      "periodStart": "2025-05-12",
      "transitions": { "cold_to_warm": 3, "warm_to_hot": 2 },
      "netHotDelta": 2
    }
  ],
  "engagement": {
    "totalLeads": 140,
    "leadsEmailed": 50,
    "openRate": 0.42,
    "replyRate": 0.08,
    "clickRate": 0.2,
    "bookingRate": 0.04
  },
  "byCategory": [
    {
      "categoryId": "uuid",
      "categoryName": "Enterprise SaaS",
      "hot": 5,
      "warm": 10,
      "cold": 20,
      "total": 35
    }
  ],
  "uploads": [
    {
      "id": "uuid",
      "externalUploadId": "client-upload-uuid",
      "createdAt": "...",
      "rowCount": 100,
      "createdCount": 80,
      "updatedCount": 20,
      "errorCount": 0,
      "sourceLabel": "Q1 trade show",
      "leadSources": ["referral", "linkedin"],
      "tierCounts": { "hot": 2, "warm": 15, "cold": 63 }
    }
  ],
  "hotLeadsWeekOverWeek": { "currentWeek": 12, "previousWeek": 4 }
}
```

**Notes**

- `tierMovement` is built from `tier_change` events recorded when scores are recalculated (upload, PATCH lead, etc.).
- Engagement rates use **leads with at least one email sent** as the denominator.
- Upload `sourceLabel` is optional on `POST /api/leads/upload` (`sourceLabel` or `source` form field).
- Run migration `20250520120000_add_pipeline_analytics` before using this endpoint.

---

## Auth endpoints (summary)

### Signup

```http
POST /api/auth/signup
{ "email": "you@company.com", "password": "minimum8chars" }
```

→ `201` — same shape as login (`accessToken`, `refreshToken`, `user`). Email verification is off until Resend is configured.

### Login

```http
POST /api/auth/login
{ "email": "you@company.com", "password": "..." }
```

→ `200`

```json
{
  "accessToken": "eyJ...",
  "refreshToken": "hex...",
  "expiresIn": "5m",
  "user": { "id": "uuid", "email": "...", "emailVerified": true }
}
```

### Refresh (call ~every 4 minutes while app is open)

```http
POST /api/auth/refresh
{ "refreshToken": "..." }
```

→ New `accessToken` + new `refreshToken`.

---

## 1. Health check

```http
GET /
```

**Request body:** none

**Success `200`:** plain text

```
Leads AI Backend Running
```

---

## 2. List categories

```http
GET /api/categories
```

**Request body:** none

**Success `200`**

```json
{
  "categories": [
    {
      "id": "223e4567-e89b-12d3-a456-426614174001",
      "name": "Enterprise SaaS",
      "offering": "We provide an AI-powered CRM automation platform...",
      "statement": "A good fit is a company with an existing CRM...",
      "created_at": "2025-05-17T10:00:00.000Z",
      "updated_at": "2025-05-17T10:00:00.000Z"
    }
  ]
}
```

**Success `200` (empty database)**

```json
{
  "categories": []
}
```

**Error `500`**

```json
{
  "error": "Failed to list categories"
}
```

---

## 3. Get category by ID

```http
GET /api/categories/:id
```

**Path params**

| Param | Type | Description |
|-------|------|-------------|
| `id` | `string` (UUID) | Category ID |

**Request body:** none

**Success `200`**

```json
{
  "category": {
    "id": "223e4567-e89b-12d3-a456-426614174001",
    "name": "Enterprise SaaS",
    "offering": "We provide an AI-powered CRM automation platform...",
    "statement": "A good fit is a company with an existing CRM...",
    "created_at": "2025-05-17T10:00:00.000Z",
    "updated_at": "2025-05-17T10:00:00.000Z"
  }
}
```

**Error `404`**

```json
{
  "error": "Category not found"
}
```

**Error `500`**

```json
{
  "error": "Failed to fetch category"
}
```

---

## 4. Update category

```http
PATCH /api/categories/:id
```

**Request body** (at least one field)

```json
{
  "name": "Enterprise SaaS",
  "offering": "Updated offering text...",
  "statement": "Updated qualifying statement..."
}
```

**Success `200`** — `{ "category": { ... } }`  
**Error `404`** — category not found  
**Error `400`** — empty body or invalid fields

---

## 5. Create category

```http
POST /api/categories
```

**Request body**

```json
{
  "name": "Enterprise SaaS",
  "offering": "We provide an AI-powered CRM automation platform for mid-market B2B companies.",
  "statement": "A good fit is a company with an existing CRM and dedicated sales ops."
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Short label (max 100 chars in DB) |
| `offering` | Yes | What you sell — used in LLM prompts |
| `statement` | Yes | What a good-fit lead looks like |

**Success `201`**

```json
{
  "category": {
    "id": "223e4567-e89b-12d3-a456-426614174001",
    "name": "Enterprise SaaS",
    "offering": "...",
    "statement": "...",
    "created_at": "2025-05-17T10:00:00.000Z",
    "updated_at": "2025-05-17T10:00:00.000Z"
  }
}
```

**Error `400`**

```json
{
  "error": "name, offering, and statement are required non-empty strings"
}
```

**Error `500`**

```json
{
  "error": "Failed to create category"
}
```

---

## 6. List leads

```http
GET /api/leads?tier=hot&sort=score
```

| Query | Values | Default |
|-------|--------|---------|
| `tier` | `hot`, `warm`, `cold` | all |
| `sort` | `score`, `created_at` | `score` |

**Success `200`**

```json
{
  "leads": [
    {
      "id": "...",
      "first_name": "Jane",
      "last_name": "Doe",
      "email": "jane@acme.com",
      "score": 72,
      "tier": "hot",
      "snapshot_summary": "VP at logistics co...",
      "snapshot_intent": "high",
      "...": "other lead fields"
    }
  ]
}
```

---

## 6b. Create lead (form)

```http
POST /api/leads
Content-Type: application/json
Authorization: Bearer <accessToken>
```

**Required body fields:** `first_name`, `last_name`, `email`

**Optional:** `category_id`, `company`, `job_title`, `phone`, `source`, `initial_message`, `business_detail`

```json
{
  "first_name": "Jane",
  "last_name": "Doe",
  "email": "jane@acme.com",
  "company": "Acme Logistics",
  "job_title": "VP Sales",
  "phone": "+1-555-0100",
  "source": "referral",
  "initial_message": "Interested in a demo",
  "business_detail": "Mid-market freight broker",
  "category_id": "223e4567-e89b-12d3-a456-426614174001"
}
```

**Success `201`**

```json
{
  "lead": { "id": "...", "score": 45, "tier": "warm", "...": "..." },
  "scoreBreakdown": { "total": 45, "tier": "warm", "breakdown": [ "..."] },
  "snapshot": null,
  "profilingQueued": 1
}
```

Scores immediately; LLM profiling runs async when `OPENAI_API_KEY` is set (same as upload).

**Error `409`** — email already exists for this account

```json
{ "error": "A lead with this email already exists" }
```

---

## 7. Upload leads (Excel)

```http
POST /api/leads/upload
Content-Type: multipart/form-data
```

| Field | Required | Description |
|-------|----------|-------------|
| `file` | Yes | `.xlsx` spreadsheet |
| `categoryId` | No | UUID applied to rows without `category_id` column |

**Required Excel columns:** `first_name`, `last_name`, `email`  
**Optional:** `company`, `job_title`, `phone`, `source`, `initial_message`, `business_detail`, `category_id`  
(Column names are case-insensitive; spaces → underscores.)

**Success `202`**

```json
{
  "uploadId": "uuid",
  "rowCount": 50,
  "status": "processing",
  "processed": 48,
  "created": 40,
  "updated": 8,
  "errors": [{ "rowNumber": 12, "email": "bad@", "error": "Invalid email format" }],
  "profilingQueued": 48
}
```

Upserts by **email**. Scores each lead immediately. LLM profiling runs **async** when `OPENAI_API_KEY` is set.

---

## 7b. Download upload template

```http
GET /api/leads/upload/template
Authorization: Bearer <accessToken>
```

**Query**

| Param | Default | Description |
|-------|---------|-------------|
| `samples` | included | `samples=false` → headers only, no example rows |

**Success `200`** — `.xlsx` file download (`Content-Disposition: attachment`)

Sheet **Leads Upload Template** with columns:

`first_name`, `last_name`, `email`, `company`, `job_title`, `phone`, `source`, `initial_message`, `business_detail`, `category_id`

Same shape as upload expects; includes 5 example rows by default.

**Frontend example**

```ts
const res = await fetch(`${API_BASE}/api/leads/upload/template`, {
  headers: { Authorization: `Bearer ${accessToken}` },
});
const blob = await res.blob();
// trigger browser download from blob
```

---

## 7c. Export leads (Excel)

```http
GET /api/leads/export
Authorization: Bearer <accessToken>
```

**Success `200`** — `.xlsx` download of **all leads for the signed-in user**, same columns as the upload template (re-uploadable).

Filename: `leads_export_YYYY-MM-DD.xlsx`

---

## 7d. Report tier definitions

Use this to populate the Report modal **tier** dropdown (same benchmark as scoring).

```http
GET /api/reports/tiers
Authorization: Bearer <accessToken>
```

**Success `200`**

```json
{
  "tiers": [
    { "id": "hot", "label": "Hot", "minScore": 70, "maxScore": 100 },
    { "id": "warm", "label": "Warm", "minScore": 40, "maxScore": 69 },
    { "id": "cold", "label": "Cold", "minScore": 0, "maxScore": 39 }
  ],
  "allOption": { "id": null, "label": "All tiers" },
  "reportLimits": [10, 20, 50, 100, "all"]
}
```

Source of truth: `src/constants/leadTiers.ts` (used by `scoringService` when assigning tier).

---

## 7e. Leads report export (filtered)

For the **Report** modal — category, **tier**, date range, and row limit.

```http
GET /api/reports/export?categoryId=&tier=hot&dateFrom=2026-04-22&dateTo=2026-05-22&limit=50
Authorization: Bearer <accessToken>
```

**Query params**

| Param | Required | Description |
|-------|----------|-------------|
| `categoryId` | No | Category UUID, or omit / `null` for all categories |
| `tier` | No | `hot`, `warm`, `cold`, or omit / `all` / `null` for all tiers |
| `dateFrom` | No | `YYYY-MM-DD` — filter `leads.created_at` (inclusive, UTC start of day) |
| `dateTo` | No | `YYYY-MM-DD` — inclusive end of day (UTC) |
| `limit` | No | `10`, `20`, `50`, `100`, or `all` (default `all`) |

Results are scoped to the **authenticated user**, ordered by **score descending**.

**Success `200`** — `.xlsx` download (`leads_report_YYYY-MM-DD.xlsx`)

**Sheet columns (in order):** Name, Email, Company, Job Title, LinkedIn URL, Category, Score, Tier, Intent, AI Summary, Emails Sent, Opened, Replies, Booking Clicks, Last Event, Last Event Date

**Error `400`** — invalid dates, limit, or unknown category

---

## 8. Get lead by ID

```http
GET /api/leads/:id
```

**Path params**

| Param | Type | Description |
|-------|------|-------------|
| `id` | `string` (UUID) | Lead ID |

**Request body:** none

**Success `200` — with snapshot**

```json
{
  "lead": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "category_id": "223e4567-e89b-12d3-a456-426614174001",
    "first_name": "Jane",
    "last_name": "Doe",
    "email": "jane@acme.com",
    "company": "Acme Logistics",
    "job_title": "VP Sales",
    "phone": null,
    "source": "webinar",
    "initial_message": "Interested in a demo",
    "score": 45,
    "tier": "warm",
    "emails_sent": 0,
    "emails_opened": 0,
    "links_clicked": 0,
    "replies_received": 0,
    "booking_clicks": 0,
    "last_event_at": null,
    "last_event_type": null,
    "created_at": "2025-05-17T10:00:00.000Z",
    "updated_at": "2025-05-17T10:00:00.000Z"
  },
  "scoreBreakdown": {
    "total": 45,
    "tier": "warm",
    "breakdown": [
      { "signal": "Job title — executive level (VP, director, C-suite)", "points": 20, "met": true },
      { "signal": "Has company name", "points": 5, "met": true },
      { "signal": "Replied to email", "points": 20, "met": false }
    ]
  },
  "snapshot": {
    "leadId": "123e4567-e89b-12d3-a456-426614174000",
    "currentScore": 45,
    "summary": "Senior VP at a logistics company. Moderate engagement.",
    "currentIntent": "medium",
    "lastMeaningfulEvent": "none",
    "suggestedEmail": {
      "subject": "Quick question about Acme's sales workflow",
      "body": "Hi Jane,\n\nI noticed...",
      "sentAt": null
    },
    "llmModel": "gpt-4o-mini",
    "updatedAt": "2025-05-17T10:05:00.000Z"
  }
}
```

**Success `200` — no snapshot yet**

```json
{
  "lead": { "...": "same shape as above" },
  "scoreBreakdown": { "total": 45, "tier": "warm", "breakdown": [ "..."] },
  "snapshot": null
}
```

**Error `404`**

```json
{ "error": "Lead not found" }
```

---

## 8b. Score breakdown only

```http
GET /api/leads/:id/score
```

Returns `{ leadId, scoreBreakdown }` — recomputed on each request (deterministic, no LLM). Use for the lead detail **Score** tab.

**Error `404`**

```json
{
  "error": "Lead not found"
}
```

**Error `500`**

```json
{
  "error": "Failed to fetch lead"
}
```

**TypeScript — lead fields**

| Field | Type | Notes |
|-------|------|--------|
| `tier` | `"hot"` \| `"warm"` \| `"cold"` | |
| `currentIntent` (snapshot) | `"high"` \| `"medium"` \| `"low"` | |
| `suggestedEmail.sentAt` | `string` (ISO) \| `null` | Set after email send |

---

## 9. Update lead

```http
PATCH /api/leads/:id
```

**Request body** (any subset)

```json
{
  "category_id": "uuid-or-null",
  "first_name": "Jane",
  "last_name": "Doe",
  "email": "jane@acme.com",
  "company": "Acme",
  "job_title": "VP Sales",
  "phone": "+1...",
  "source": "webinar",
  "initial_message": "Interested in demo",
  "business_detail": "200-person logistics firm, evaluating CRM automation for outbound sales team."
}
```

`business_detail` — brief context about the lead's business; used by the LLM to assess fit against your category offering.

Recalculates **score** and **tier** after update.

**Success `200`** — same shape as get lead (`lead` + `snapshot`)  
**Error `404`** — lead not found  
**Error `409`** — email already used by another lead

---

## 10. Refresh lead snapshot (LLM profiling)

Runs OpenAI profiling and upserts snapshot including **suggested email** subject/body.

```http
PATCH /api/leads/:id/snapshot
```

**Path params**

| Param | Type | Description |
|-------|------|-------------|
| `id` | `string` (UUID) | Lead ID |

**Request body (optional)**

```json
{
  "metadata": {
    "eventType": "email_replied",
    "emailSubject": "Re: Quick question",
    "replySnippet": "Yes, we are evaluating tools like this..."
  }
}
```

Omit body or send `{}` for a standard refresh (e.g. after upload or manual “Refresh” button).

| Field | Required | Description |
|-------|----------|-------------|
| `metadata` | No | Extra context appended to the LLM prompt |
| `metadata.eventType` | No | e.g. `email_replied`, `booking_clicked` |
| `metadata.emailSubject` | No | |
| `metadata.replySnippet` | No | |

**Success `200`**

Same shape as [Get lead — with snapshot](#2-get-lead-by-id):

```json
{
  "lead": { "...": "updated lead row" },
  "snapshot": {
    "leadId": "...",
    "currentScore": 45,
    "summary": "...",
    "currentIntent": "medium",
    "lastMeaningfulEvent": "reply",
    "suggestedEmail": {
      "subject": "...",
      "body": "...",
      "sentAt": null
    },
    "llmModel": "gpt-4o-mini",
    "updatedAt": "..."
  }
}
```

**Error `404`**

```json
{
  "error": "Lead not found: <uuid>"
}
```

**Error `500`**

```json
{
  "error": "Snapshot refresh failed"
}
```

Or message containing `OPENAI` / missing API key if LLM is not configured.

**Frontend note:** This call can take several seconds (LLM). Show loading state; consider timeout ≥ 60s.

---

## 11. Send suggested email

Sends `snapshot.suggestedEmail` to the lead via **Resend**. Requires a snapshot with non-empty subject and body (run snapshot refresh first).

```http
POST /api/leads/:id/email/send
```

**Path params**

| Param | Type | Description |
|-------|------|-------------|
| `id` | `string` (UUID) | Lead ID |

**Request body:** none

**Success `200`**

```json
{
  "status": "sent",
  "leadId": "123e4567-e89b-12d3-a456-426614174000",
  "to": "jane@acme.com",
  "resendMessageId": "a1b2c3d4-....",
  "subject": "Quick question about Acme's sales workflow"
}
```

Side effects on success:

- `lead.emails_sent` incremented by 1
- `snapshot.suggestedEmail.sentAt` set (re-fetch lead to see)

**Error `400`**

```json
{
  "error": "No suggested email on snapshot. Refresh the snapshot via PATCH /api/leads/:id/snapshot first."
}
```

**Error `404`**

```json
{
  "error": "Lead not found: <uuid>"
}
```

**Error `502`**

```json
{
  "error": "Resend send failed: <provider message>"
}
```

(Also used when `RESEND_API_KEY` / `RESEND_FROM_EMAIL` are missing or invalid.)

**Error `500`**

```json
{
  "error": "Email send failed"
}
```

---

## Typical frontend flows

### Lead detail page (load)

```ts
const res = await fetch(`${API_BASE}/api/leads/${leadId}`);
const data = await res.json();
// data.lead, data.snapshot | null
```

### “Refresh snapshot” button

```ts
await fetch(`${API_BASE}/api/leads/${leadId}/snapshot`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({}), // or { metadata: { ... } } after an event
});
```

### “Send email” button

```ts
// Ensure snapshot exists and suggestedEmail.subject/body are set
await fetch(`${API_BASE}/api/leads/${leadId}/email/send`, {
  method: "POST",
});
```

Recommended order for a new lead: **PATCH snapshot** → review `suggestedEmail` in UI → **POST email/send**.

---

## Not implemented yet

Tracked in **[docs/NOT_IMPLEMENTED.md](./docs/NOT_IMPLEMENTED.md)** (living backlog — update when gaps are found).

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/uploads/:id/progress` | SSE upload/profiling progress |
| `POST` | `/api/events` | Generic engagement webhooks |

Also not in this repo: **frontend** Emails/Outreach UI, Pipeline Analytics charts, lead timeline UI. Backend APIs for those exist — see the backlog doc.

See `BACKEND_FLOW_UNDERSTANDING.md` for full product behavior.

---

## Environment (backend)

Frontend usually only needs:

```env
VITE_API_BASE_URL=https://lead-razor-backend.onrender.com
# local: http://localhost:5000
# or NEXT_PUBLIC_API_BASE_URL=...
```

Backend must have `DATABASE_URL`, `JWT_SECRET`, `APP_URL`, `OPENAI_API_KEY` (snapshot), and `RESEND_API_KEY` + `RESEND_FROM_EMAIL` (auth + lead emails) configured.
