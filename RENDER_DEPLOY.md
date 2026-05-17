# Deploy on Render

## Required dashboard settings

If you are **not** using the Blueprint (`render.yaml`), set these in the Render web service **Settings**:

| Setting | Value |
|---------|--------|
| **Root Directory** | *(leave empty — repo root)* |
| **Build Command** | `npm install && npm run build && npm run db:deploy:render` |
| **Start Command** | `npm start` |

### Do not use

- `node src/index.js` — TypeScript source is not runnable in production
- `node index.js` without a prior build — use `npm start` instead

`npm start` runs `node dist/index.js` after `npm run build` compiles TypeScript.

## Environment variables

Set in Render → **Environment**:

- `DATABASE_URL` — Neon connection string (`?sslmode=require`)
- `OPENAI_API_KEY`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `PORT` — set automatically by Render (do not override unless needed)

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
