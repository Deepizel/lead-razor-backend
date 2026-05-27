# Email identities (per-user senders)

Each user configures **one or more** sending identities (SMTP / Gmail / Resend / Brevo). Credentials are **AES-256-GCM encrypted** in `email_identities.credentials_encrypted` — reversible encryption (not a hash), because the server must decrypt to send mail.

**Platform env (required for this feature):**

```env
EMAIL_CREDENTIALS_ENCRYPTION_KEY=<64-char-hex-or-strong-passphrase>
APP_URL=https://your-api.com
```

Generate a 32-byte hex key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Legacy server-wide outreach** (`EMAIL_PROVIDER`, `SMTP_*`, `RESEND_*`) is no longer used for `POST /api/emails/send` — users must configure identities.

Auth emails (signup / reset) still use platform Resend when configured.

---

## API (authenticated)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/settings/email-identities` | List all identities (masked credentials) |
| `GET` | `/api/settings/email-identities/default` | Default identity only |
| `GET` | `/api/settings/email-identity` | Alias → default identity |
| `GET` | `/api/settings/email-identities/:id` | One identity |
| `POST` | `/api/settings/email-identities` | Create identity |
| `PATCH` | `/api/settings/email-identities/:id` | Update (omit `credentials` to keep existing) |
| `DELETE` | `/api/settings/email-identities/:id` | Delete; promotes another to default if needed |
| `POST` | `/api/settings/email-identities/:id/default` | Set default ⭐ |
| `POST` | `/api/settings/email-identities/:id/test` | Test send (`{ "to": "optional@email.com" }`) |

### Create body example (Gmail)

```json
{
  "label": "Sales Inbox",
  "fromName": "Alex — Sales",
  "fromEmail": "sales@company.com",
  "replyTo": "sales@company.com",
  "providerType": "gmail",
  "isDefault": true,
  "trackingEnabled": true,
  "replyHandlingMode": "webhook",
  "credentials": {
    "host": "smtp.gmail.com",
    "port": 587,
    "secure": false,
    "user": "you@gmail.com",
    "pass": "app-password"
  }
}
```

### Create body example (Resend)

```json
{
  "label": "Resend Domain",
  "fromName": "Care Team",
  "fromEmail": "info@care.com",
  "providerType": "resend",
  "credentials": { "apiKey": "re_..." }
}
```

### Masked GET response

```json
{
  "identity": {
    "id": "uuid",
    "label": "Sales Inbox",
    "fromEmail": "sales@company.com",
    "providerType": "gmail",
    "isDefault": true,
    "credentialsMasked": {
      "host": "smtp.gmail.com",
      "user": "(configured)",
      "pass": "********"
    }
  }
}
```

---

## Sending with an identity

**Default (90% of sends):** omit `emailIdentityId`.

**Override:** pass `emailIdentityId` on:

- `POST /api/emails/send`
- `POST /api/leads/:id/email/send`

```json
{
  "leadId": "uuid",
  "subject": "Hello",
  "body": "…",
  "emailIdentityId": "optional-identity-uuid"
}
```

Bulk send uses the same identity for all leads in that request.

---

## Outbox filter

`GET /api/emails?emailIdentityId=<uuid>`

Each list/detail item includes `emailIdentity: { id, label, fromName, fromEmail, providerType }`.

---

## Migration

```bash
npx prisma migrate deploy
```

Migration: `20250523120000_add_email_identities`

---

# Frontend integration checklist

Use this as the single FE task list for the email-identity feature.

## 1. Settings — Email identities page

- [ ] **List identities** on load: `GET /api/settings/email-identities` → render cards (label, from email, provider badge, ⭐ default).
- [ ] **Empty state** when `identities.length === 0` with CTA “Add sending identity”.
- [ ] **Add identity form** with `providerType` selector: `gmail` | `smtp` | `resend` | `brevo`.
  - Gmail: prefill `host=smtp.gmail.com`, `port=587`, `secure=false`; fields `user`, `pass` (app password).
  - SMTP: `host`, `port`, `secure`, `user`, `pass`.
  - Resend / Brevo: `apiKey` only.
- [ ] **From fields** on every identity: `label`, `fromName`, `fromEmail`, optional `replyTo`.
- [ ] **Toggles:** `trackingEnabled` (default on), `domainVerified` (manual/UI after DNS check), `replyHandlingMode` (dropdown: webhook / gmail / manual — store only for now).
- [ ] **Save:** `POST /api/settings/email-identities` with full `credentials` object (only on create or when user clicks “Update password/API key”).
- [ ] **Edit:** `PATCH /api/settings/email-identities/:id` — omit `credentials` unless user re-enters secrets.
- [ ] **Set default:** `POST /api/settings/email-identities/:id/default` or `isDefault: true` on create.
- [ ] **Delete** with confirm: `DELETE /api/settings/email-identities/:id`.
- [ ] **Test send** button: `POST /api/settings/email-identities/:id/test` → toast success/failure.
- [ ] Never display raw `credentials` from API — only `credentialsMasked`.

## 2. Onboarding / gate before outreach

- [ ] After login, if no default identity (`GET /api/settings/email-identity` → 404), redirect or modal to **Settings → Email identities**.
- [ ] Block or warn on Outreach compose if user has no default (send returns 400 with hint).

## 3. Compose & send UI (Outreach + lead detail)

- [ ] **Sender dropdown** populated from `GET /api/settings/email-identities`.
- [ ] Pre-select identity where `isDefault === true`.
- [ ] Optional: remember last selected identity in `localStorage` (override default for session only).
- [ ] On send, include `emailIdentityId` in body **only when** user picked a non-default sender (or always send explicit id — both work).
- [ ] Endpoints to wire:
  - `POST /api/emails/send` (single + bulk)
  - `POST /api/leads/:id/email/send` (snapshot send)
- [ ] Show **from preview** under dropdown: `fromName <fromEmail>`.

## 4. Outbox & lead email timeline

- [ ] **Filter by sender:** `GET /api/emails?emailIdentityId=...` when user picks a filter in outbox.
- [ ] Show **sender column** using `emailIdentity.label` or `emailIdentity.fromEmail` on each row.
- [ ] Lead detail timeline: display `emailIdentity` on each history item when present.

## 5. Health / deploy

- [ ] Ops: set `EMAIL_CREDENTIALS_ENCRYPTION_KEY` on Render (same value across instances).
- [ ] Optional: `GET /api/health/config` → `emailCredentialsEncryption: true` before enabling settings UI.

## 6. Error handling (map API messages)

| Status | Meaning | FE action |
|--------|---------|-----------|
| `400` | No default identity | Link to settings |
| `503` | Missing encryption key | Show “platform misconfigured” |
| `502` | SMTP/Resend/Brevo rejected send | Show provider error, suggest test send |

## 7. Not in v1 (backend backlog)

- Per-identity Resend inbound webhooks (replies still use platform webhook when configured).
- Gmail reply polling per identity.
- Do not build “pick identity every time” without a default — always preselect default.

---

See also: [EMAIL_OUTREACH.md](./EMAIL_OUTREACH.md), [FEATURES_INTEGRATED.md](./FEATURES_INTEGRATED.md), [API_REFERENCE.md](../API_REFERENCE.md).
