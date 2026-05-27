# Email outreach & tracking

Outreach **sends through per-user email identities** (see [EMAIL_IDENTITIES.md](./EMAIL_IDENTITIES.md)). First-party open/click tracking uses `APP_URL`. Auth emails (verify/reset) still use `authEmailService` + Resend.

## Environment

```env
EMAIL_CREDENTIALS_ENCRYPTION_KEY=<64-char-hex>  # required for identity storage
APP_URL=https://your-api.com                    # tracking pixel & click URLs

# Auth mail only (optional)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@yourdomain.com
RESEND_WEBHOOK_SECRET=optional-shared-secret
```

Users configure SMTP/Resend/Brevo credentials via `POST /api/settings/email-identities` (encrypted in DB).

Check flags: `GET /api/health/config` → `emailCredentialsEncryption`.

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

**Backlog:** see [NOT_IMPLEMENTED.md](./NOT_IMPLEMENTED.md) for deferred items (Gmail reply polling, generic `/api/events`, frontend UI, etc.).
