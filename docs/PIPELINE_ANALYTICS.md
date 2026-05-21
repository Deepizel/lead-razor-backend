# Pipeline Analytics

Read-only reporting API for the sales dashboard: tier mix, movement over time, engagement, category performance, and upload batches.

## Endpoint

`GET /api/analytics/pipeline?days=30` (authenticated)

See [API_REFERENCE.md](../API_REFERENCE.md) for the full response shape.

## Data model

| Table | Purpose |
|-------|---------|
| `lead_uploads` | One row per Excel upload (counts, optional `source_label`) |
| `lead_events` | Audit log: `tier_change`, `email_sent`, `lead_created`, … |
| `leads.upload_id` | Links leads to the batch that last touched them |

## Event recording (automatic)

- **Upload / PATCH lead** — After deterministic rescoring, a `tier_change` event is written when tier changes.
- **New lead on upload** — `lead_created` plus tier change from default → scored tier.
- **Send suggested email** — `email_sent` on `POST /api/leads/:id/email/send`.

Future webhook `POST /api/events` can append `email_opened`, `link_clicked`, etc., using the same `lead_events` table.

## Migration

```bash
npx prisma migrate deploy
```

## Frontend mapping

| UI widget | Response field |
|-----------|----------------|
| Tier donut/bar | `tierDistribution` |
| Movement chart | `tierMovement` |
| Engagement KPIs | `engagement` |
| Category leaderboard | `byCategory` |
| Upload history table | `uploads` |
| “Hot leads this week” headline | `hotLeadsWeekOverWeek` |


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
