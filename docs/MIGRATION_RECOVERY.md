# Recovering from failed auth migration (P3018)

If `20250519120000_add_auth_and_user_scoping` failed with:

```text
cannot drop index leads_email_key because constraint leads_email_key on table leads requires it
```

The migration file is fixed to use `DROP CONSTRAINT` instead of `DROP INDEX`.

## Steps

From the repo root (with `DATABASE_URL` in `.env`):

```bash
# 1. Mark the failed migration as rolled back
npx prisma migrate resolve --rolled-back 20250519120000_add_auth_and_user_scoping --schema=prisma/schema.prisma

# 2. Apply migrations again
npm run db:migrate
```

On **Render**, push the fixed migration and redeploy (build runs `db:deploy:render`), or run the same `migrate resolve` + `migrate deploy` against production with the direct Neon URL.

## If step 2 still errors (partial apply)

Some objects from the failed run may already exist (`users`, `refresh_tokens`, `user_id` columns). The fixed migration uses `IF NOT EXISTS` / `IF EXISTS` so a second apply should be safe.

If you still see conflicts, run this in the **Neon SQL editor** then retry `npm run db:migrate`:

```sql
-- Only if migrate resolve + retry still fails
ALTER TABLE "leads" DROP CONSTRAINT IF EXISTS "leads_email_key";
CREATE UNIQUE INDEX IF NOT EXISTS "leads_user_id_email_key" ON "leads"("user_id", "email");
```

Then:

```bash
npx prisma migrate resolve --applied 20250519120000_add_auth_and_user_scoping --schema=prisma/schema.prisma
```

That tells Prisma the migration is already applied without re-running the SQL.

## P3008: "migration is already recorded as applied"

If you see:

```text
Error: P3008
The migration `20250519120000_add_auth_and_user_scoping` is already recorded as applied
```

**You are done.** Do not run `migrate resolve --applied` again. Confirm with:

```bash
npx prisma migrate status --schema=prisma/schema.prisma
```

You should see all migrations applied. Use `npm run dev` or deploy; no more migration steps needed for auth.

If `npm run db:migrate` (`migrate dev`) still asks to reset because the migration **file was edited** after apply, ignore that for Neon and use `npm run db:deploy` for production, or `prisma migrate deploy` locally instead of `migrate dev`.
