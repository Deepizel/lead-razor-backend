# Email outreach & tracking

Provider-agnostic outreach with first-party open/click tracking. Auth emails (verify/reset) still use `authEmailService` + Resend.

## Environment

```env
EMAIL_PROVIDER=gmail          # gmail | resend
APP_URL=https://your-api.com  # required for tracking pixel & click URLs

# Gmail (demo)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=you@gmail.com
SMTP_PASS=app-password
SMTP_FROM=you@gmail.com

# Resend (custom domain)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=sales@yourdomain.com
RESEND_WEBHOOK_SECRET=optional-shared-secret
```

Check flags: `GET /api/health/config` → `outreachEmail`, `emailProvider`.

## API (authenticated unless noted)

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/emails/draft` | `{ leadId }` → snapshot subject/body |
| `POST` | `/api/emails/recipients/preview` | `{ tier?, categoryId? }` → lead list for bulk send |
| `POST` | `/api/emails/send` | `{ leadId, subject?, body?, useSnapshot? }` or `{ leadIds[], subject, body }` |
| `GET` | `/api/emails` | Outbox table (`?tier=&opened=&replied=&limit=&offset=`) |
| `GET` | `/api/emails/:id` | One send + tracking detail |
| `GET` | `/api/leads/:id/emails` | Lead timeline |
| `POST` | `/api/leads/:id/email/send` | Shortcut: `useSnapshot` send |
| `GET` | `/api/track/open/:id.png` | **Public** open pixel |
| `GET` | `/api/track/click/:id/:linkIndex` | **Public** click redirect |
| `POST` | `/api/webhooks/resend/inbound` | **Public** inbound reply (Resend) |

## Migration

```bash
npx prisma migrate deploy
```

## Reply tracking

- **Resend + custom domain:** configure inbound webhook → `POST /api/webhooks/resend/inbound`
- **Gmail SMTP:** open/click only in Phase 1; replies need manual events or future Gmail API poll
