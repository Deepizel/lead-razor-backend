# Neon PostgreSQL + Prisma setup

## 1. Create database

1. Sign in at [Neon Console](https://console.neon.tech).
2. **New Project** → pick a region close to your app.
3. Open **Dashboard** → **Connection details**.

## 2. Copy connection string into `.env`

Only **`DATABASE_URL`** is required. Include `?sslmode=require`.

```env
DATABASE_URL=postgresql://...@ep-xxx....neon.tech/neondb?sslmode=require
```

| Neon URL type | Best for |
|---------------|----------|
| **Pooled** (`-pooler` in host) | `npm run dev` (API runtime) |
| **Direct** (no `-pooler`) | `npm run db:migrate` |

If migrations fail with a pooled URL, temporarily set `DATABASE_URL` to the **direct** string, run `npm run db:migrate`, then switch back to pooled for the app.

## 3. Install and generate Prisma client

```bash
npm install
npm run db:generate
```

## 4. Apply schema

**First time / local dev:**

```bash
npm run db:check
npm run db:migrate
```

Name the migration when prompted (e.g. `init`).

**CI / production:**

```bash
npm run db:deploy
```

**Quick sync without migration history** (prototyping only):

```bash
npm run db:push
```

## 5. Start API

```bash
npm run dev
```

## Prisma commands

| Script | Command |
|--------|---------|
| `npm run db:generate` | Regenerate client after `schema.prisma` changes |
| `npm run db:migrate` | Create/apply migrations (dev) |
| `npm run db:deploy` | Apply migrations (production) |
| `npm run db:push` | Push schema without migration files |
| `npm run db:check` | Test DB connection |

Schema lives in `prisma/schema.prisma`. Models: `Category`, `Lead`, `LeadSnapshot`.

## Troubleshooting

| Error | Fix |
|-------|-----|
| `Environment variable not found: DATABASE_URL` | Add both URLs to `.env` |
| Migration fails with pooled URL | Use Neon **direct** connection string in `DATABASE_URL` for migrate |
| `relation "leads" does not exist` | Run `npm run db:migrate` or `npm run db:push` |
| `@prisma/client did not initialize` | Run `npm run db:generate` |
| Neon project sleeping | Wake project in Neon console, retry |

## P3005: “database schema is not empty” (Render / existing Neon DB)

This means tables already exist (e.g. from an earlier SQL setup or `db push`) but Prisma has no migration history.

**One-time fix (local, using production `DATABASE_URL`):**

```bash
npx prisma migrate resolve --applied 20250517120000_init --schema=prisma/schema.prisma
npx prisma migrate deploy --schema=prisma/schema.prisma
```

**On Render:** the build runs `npm run db:deploy:render`, which detects P3005 and baselines automatically.

If baseline fails, confirm existing tables match `prisma/schema.prisma`, or reset the Neon branch and redeploy fresh.
