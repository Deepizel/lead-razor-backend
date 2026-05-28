# Waitlist onboarding

Parallel to open signup (`POST /api/auth/signup`). Users apply on the waitlist; **admins** approve and trigger a **24-hour password-setup email**.

## Flow

1. `POST /api/waitlist` — user submits firstName, lastName, email, businessIndustry → `pending`
2. Admin `POST /api/admin/waitlist/:id/approve` → waitlist `active`, user row created (`pending`, no password), email sent
3. User `POST /api/waitlist/set-password` — sets password → user `active`, can log in
4. Admin can `POST /api/admin/users/:id/deactivate` to block login

Duplicate emails on waitlist are rejected. Existing user emails are rejected on waitlist join.

## Public routes

| Method | Path | Body |
|--------|------|------|
| `POST` | `/api/waitlist` | `{ firstName, lastName, email, businessIndustry }` |
| `GET` | `/api/waitlist/set-password?token=` | Validates token, returns `{ email, firstName, lastName }` |
| `POST` | `/api/waitlist/set-password` | `{ token, password }` |

## Admin routes (`role === 'admin'`)

| Method | Path | Action |
|--------|------|--------|
| `GET` | `/api/admin/waitlist` | List waitlist (tab 1) |
| `POST` | `/api/admin/waitlist/:id/approve` | Approve + send email |
| `POST` | `/api/admin/waitlist/:id/reject` | Mark rejected |
| `GET` | `/api/admin/users` | List users (tab 2) |
| `POST` | `/api/admin/users/:id/approve` | Set user `active` (e.g. re-enable) |
| `POST` | `/api/admin/users/:id/deactivate` | Set user `deactivated` |
| `PATCH` | `/api/admin/users/:id/role` | `{ "role": "admin" \| "user" }` |

Requires `Authorization: Bearer <admin access token>`.

## User fields

| Field | Values |
|-------|--------|
| `role` | `admin`, `user` |
| `status` | `pending`, `active`, `deactivated` |

## First admin (manual)

After migration, promote your account in SQL:

```sql
UPDATE users SET role = 'admin', status = 'active' WHERE email = 'you@company.com';
```

## Env

Uses the same Resend auth mail config as signup: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, optional `FRONTEND_URL` for setup links.

## Migration

`20250527120000_waitlist_and_user_roles`

```bash
npx prisma migrate deploy
```

## Frontend checklist

- [ ] Waitlist form → `POST /api/waitlist`
- [ ] Admin waitlist tab → `GET /api/admin/waitlist`, approve/reject buttons
- [ ] Admin users tab → `GET /api/admin/users`, approve/deactivate
- [ ] Page `/waitlist/set-password?token=` → `GET` then `POST /api/waitlist/set-password`
- [ ] Keep existing signup/login screens unchanged
- [ ] Hide admin routes unless `user.role === 'admin'`
