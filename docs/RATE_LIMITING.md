# Rate limiting

Uses [`express-rate-limit`](https://github.com/express-rate-limit/express-rate-limit) with tiered limits per route group.

## Defaults (15-minute window)

| Limiter | Scope | Default max |
|---------|--------|-------------|
| Auth | `/api/auth/*` | 30 / IP |
| API | All authenticated routes | 300 / user |
| Send | Email send + identity test | 40 / user |
| Tracking | `/api/track/*` | 2000 / IP |
| Webhook | `/api/webhooks/resend/*` | 120 / IP |

## Environment

```env
RATE_LIMIT_ENABLED=true          # set false to disable (local dev)
RATE_LIMIT_WINDOW_MS=900000      # 15 minutes
RATE_LIMIT_MAX_AUTH=30
RATE_LIMIT_MAX_API=300
RATE_LIMIT_MAX_SEND=40
RATE_LIMIT_MAX_TRACKING=2000
RATE_LIMIT_MAX_WEBHOOK=120
```

## Response when limited

`429 Too Many Requests`

```json
{
  "error": "Too many requests. Try again later.",
  "retryAfter": 842
}
```

Standard `RateLimit-*` headers are included when supported.

## Deploy note

`trust proxy` is enabled in `src/index.ts` so limits work correctly behind Render’s load balancer.
