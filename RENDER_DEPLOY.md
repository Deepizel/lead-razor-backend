# Deploy on Render

For a full postmortem of errors we hit and why each fix worked, see **[`docs/DEPLOYMENT_ERRORS.md`](docs/DEPLOYMENT_ERRORS.md)**.

## Required dashboard settings

If you are **not** using the Blueprint (`render.yaml`), set these in the Render web service **Settings**:

| Setting | Value |
|---------|--------|
| **Root Directory** | *(leave empty — repo root)* |
| **Build Command** | `NPM_CONFIG_PRODUCTION=false npm install && npm run build && npm run db:deploy:render` |
| **Start Command** | `npm start` |

### Do not use

- `node src/index.js` — TypeScript source is not runnable in production
- `node index.js` without a prior build — use `npm start` instead

`npm start` runs `node dist/index.js` after `npm run build` compiles TypeScript.

## Environment variables

Set in Render → **Environment** (then **Save** and wait for redeploy).  
**Local `.env` is not used on Render** — if the frontend calls `https://lead-razor-backend.onrender.com`, you must set every variable below on Render.

| Variable | Required for | Notes |
|----------|----------------|-------|
| `DATABASE_URL` | All API | Neon connection string (`?sslmode=require`) |
| `JWT_SECRET` | Login, refresh, protected routes | Long random string |
| `JWT_ACCESS_EXPIRES` | Auth | e.g. `5m` |
| `JWT_REFRESH_EXPIRES_DAYS` | Auth | e.g. `7` |
| `APP_URL` | Email links | e.g. `https://lead-razor-backend.onrender.com` |
| `FRONTEND_URL` | Optional | Your SPA URL for verify/reset links |
| `RESEND_API_KEY` | Signup, forgot password, lead emails | From [resend.com/api-keys](https://resend.com/api-keys) |
| `RESEND_FROM_EMAIL` | Same | **Verified sender** in Resend — not your personal inbox. Dev: `onboarding@resend.dev` (only sends to the email on your Resend account). Production: `noreply@yourdomain.com` after domain verification. |
| `OPENAI_API_KEY` | Lead profiling | |
| `PORT` | — | Set automatically by Render |

### Check what the live server sees

After deploy:

```http
GET https://lead-razor-backend.onrender.com/api/health/config
```

Example when Resend is missing on Render:

```json
{ "database": true, "auth": true, "resend": false }
```

If `resend` is `false`, add `RESEND_API_KEY` and `RESEND_FROM_EMAIL` in Render Environment and redeploy.

### Common mistake

| Symptom | Cause |
|---------|--------|
| `Missing required environment variable: RESEND_FROM_EMAIL` on signup | Variable missing **on Render**, while only present in local `.env` |
| Works in Postman against `localhost:5000` but fails from the app | App points at Render; set env on Render |

## Git

Ensure these are committed and pushed:

- `prisma/schema.prisma` and `prisma/migrations/`
- `scripts/deploy-migrations.mjs`
- `index.js`, `src/index.js` (production entry shims)
- `render.yaml` (optional, if using Blueprint)

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `Cannot find module .../src/index.js` | Set **Start Command** to `npm start` |
| `Cannot find module .../dist/index.js` | Build failed — check build logs for `tsc` / Prisma errors |
| Prisma P3005 | Push latest `scripts/deploy-migrations.mjs`; build uses `db:deploy:render` |
| `prisma/schema.prisma` not found | Commit and push the `prisma/` folder |
