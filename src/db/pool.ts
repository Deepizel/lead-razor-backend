import { Pool } from "pg";
import { env } from "../config/env";

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!env.databaseUrl) {
    throw new Error("DATABASE_URL is not configured");
  }
  if (!pool) {
    pool = new Pool({ connectionString: env.databaseUrl });
  }
  return pool;
}
