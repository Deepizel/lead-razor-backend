# Lead Qualifier API — Frontend Integration Reference

**Base URL (local default):** `http://localhost:5000`  
**Production:** `https://lead-razor-backend.onrender.com`

**Global headers (JSON routes):**

```http
Content-Type: application/json
```

CORS is enabled on all routes. No authentication in the current build.

---

## Implemented endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Health check |
| `GET` | `/api/categories` | List all categories |
| `POST` | `/api/categories` | Create a category |
| `GET` | `/api/leads/:id` | Lead detail + snapshot |
| `PATCH` | `/api/leads/:id/snapshot` | Regenerate LLM snapshot (incl. suggested email) |
| `POST` | `/api/leads/:id/email/send` | Send suggested email via Resend |

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

## 3. Create category

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

## 4. Get lead by ID

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
  "snapshot": null
}
```

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

## 5. Refresh lead snapshot (LLM profiling)

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

## 6. Send suggested email

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

## Not implemented yet (from product spec)

These paths are **not** available on the server today. Plan frontend against them only after backend adds them:

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/leads/upload` | Excel upload (`multipart/form-data`) |
| `GET` | `/api/uploads/:id/progress` | SSE upload/profiling progress |
| `GET` | `/api/leads` | List leads (`?tier=hot&sort=score`) |
| `POST` | `/api/events` | Engagement webhooks |
See `BACKEND_FLOW_UNDERSTANDING.md` for full product behavior.

---

## Environment (backend)

Frontend usually only needs:

```env
VITE_API_BASE_URL=https://lead-razor-backend.onrender.com
# local: http://localhost:5000
# or NEXT_PUBLIC_API_BASE_URL=...
```

Backend must have `DATABASE_URL` (Neon + Prisma — see `NEON_SETUP.md`), `OPENAI_API_KEY` (snapshot), and `RESEND_API_KEY` + `RESEND_FROM_EMAIL` (send email) configured.
