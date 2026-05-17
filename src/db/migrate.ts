import fs from "fs";
import path from "path";
import { getPool } from "./pool";
import { assertDatabaseConfigured } from "../config/env";

async function migrate(): Promise<void> {
  assertDatabaseConfigured();
  const pool = getPool();
  const sqlPath = path.join(__dirname, "migrations", "001_schema.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");
  await pool.query(sql);
  console.log("Migration complete.");
  await pool.end();
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
