# Not implemented / backlog

**Living document** — add items here whenever we identify spec gaps, deferred work, or “out of scope for now” features. Update status as things ship.

**Last updated:** 2026-05-22

---

## How to use this file

- **Add** a row when discovery, review, or user feedback surfaces missing work.
- **Move** items to “Recently completed” when shipped (with date + PR/commit if helpful).
- **Do not** delete historical items without a note — strike through or move to completed instead.
- Cross-link from `API_REFERENCE.md` and feature docs when relevant.

---

## Frontend (separate repo / UI)

| Item | Spec / intent | Backend today | Notes |
|------|----------------|---------------|--------|
| **Score breakdown tab UI** | Checklist of scoring signals on lead detail | `GET /api/leads/:id` → `scoreBreakdown`, or `GET /api/leads/:id/score` | React UI not in this repo |
| **Emails / Outreach view** | Compose tab, sent outbox, drill-down | APIs ready: `POST /api/emails/*`, `GET /api/emails` | React UI not in this repo |
| **Lead email timeline UI** | Event timeline on lead detail | `GET /api/leads/:id/emails` | UI not built |
| **Report modal UI** | Category, date range, limit, blob download | `GET /api/reports/export` | React UI not in this repo |
| **Bulk compose UX** | Pick hot leads by category, preview count | `POST /api/emails/recipients/preview` | UI not built |

---

## Email & outreach

| Item | Spec / intent | Backend today | Notes |
|------|----------------|---------------|--------|
| **Gmail reply polling** | Auto-detect replies when using SMTP | Open/click via pixel + wrap only | Needs Gmail API (or IMAP) + background job + thread match |
| **`POST /api/events`** | Generic engagement webhook | Trackers + Resend inbound only | Could delegate to `eventIngestionService` |
| **Per-lead merge fields in bulk send** | Same template, personalized names | Bulk send uses one subject/body for all | v1 limitation |
| **Auth mail via SMTP** | Signup/reset through Gmail | Auth still uses Resend in `authEmailService.ts` | Outreach uses SMTP/Resend switch; auth separate |
| **Resend delivery/bounce webhooks** | Bounce handling | Inbound reply webhook only | Optional hardening |
| **Simulate reply (dev)** | Test reply KPI without ESP | Manual DB or future `/api/events` | — |

See also: [EMAIL_OUTREACH.md](./EMAIL_OUTREACH.md)

---

## Upload & LLM profiling

| Item | Spec / intent | Backend today | Notes |
|------|----------------|---------------|--------|
| **`GET /api/uploads/:id/progress`** | SSE upload + profiling progress | Upload returns `profilingQueued`; no progress stream | Needs job state per upload |
| **Dedicated job queue** | BullMQ / Redis workers | In-process `setImmediate` per lead | Lost on process restart; no backpressure |
| **Category auto-assignment** | LLM picks category when Excel omits `category_id` | Default category or generic LLM fallback | Spec § upload flow |
| **Profiling failure reporting** | Surface LLM errors to client | Errors logged to server console only | — |
| **Token cost on snapshot** | Persist `token_cost` | Field exists; chain does not populate | — |

---

## Auth & account

| Item | Spec / intent | Backend today | Notes |
|------|----------------|---------------|--------|
| **Email verification gate** | Block login until verified | `AUTO_VERIFY_EMAIL = true`; middleware removed | Re-enable when Resend auth mail is configured |
| **`requireVerifiedEmail` on API routes** | Protect app until verified | Not mounted on protected router | See `AUTH_UNDERSTANDING.md` |

---

## Analytics & events

| Item | Spec / intent | Backend today | Notes |
|------|----------------|---------------|--------|
| **Historical tier movement backfill** | Charts for old leads | Only new `tier_change` events | Re-upload or PATCH leads to generate |
| **`openai` flag on `/api/health/config`** | Know if profiling will run | Not exposed | Infer from `profilingQueued === 0` |

See also: [PIPELINE_ANALYTICS.md](./PIPELINE_ANALYTICS.md)

---

## Infrastructure & DX

| Item | Spec / intent | Backend today | Notes |
|------|----------------|---------------|--------|
| **Prisma config migration** | `prisma.config.ts` (Prisma 7) | `package.json#prisma` deprecated warning | Cosmetic until Prisma 7 |
| **Windows EPERM on `prisma generate`** | Smooth local builds | Dev server locks query engine DLL | Stop `npm run dev` before build; use `npm run build:compile` |

---

## Recently completed (for context)

| Item | Completed | Notes |
|------|-----------|--------|
| **Deterministic score breakdown** | 2026-05-22 | `calculateScoreWithBreakdown`, `scoreBreakdown` on lead detail, `GET /api/leads/:id/score` |
| **Filtered report export** | 2026-05-22 | `GET /api/reports/export`, `linkedin_url` on leads |
| Pipeline analytics API | 2026-05-20 | `GET /api/analytics/pipeline`, uploads + events tables |
| Outreach send + tracking | 2026-05-21 | `sent_emails`, SMTP/Resend, pixel, click, read APIs |
| Auth bypass (auto-verify) | 2026-05-21 | Temporary until Resend auth configured |
| LangChain profiling chain | Pre-backlog | Upload → async snapshot; see `profilingChain.ts` |

---

## API quick reference (still missing)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/uploads/:id/progress` | SSE upload/profiling progress |
| `POST` | `/api/events` | Generic engagement webhooks |

Everything else listed in [API_REFERENCE.md](../API_REFERENCE.md) **Implemented endpoints** is intended to be live after migrations + env are set.
