import { prisma } from "./prisma";
import { assertDatabaseConfigured } from "../config/env";

async function checkConnection(): Promise<void> {
  assertDatabaseConfigured();

  try {
    const rows = await prisma.$queryRaw<
      [{ db: string; version: string }]
    >`SELECT current_database() AS db, version() AS version`;

    console.log("Connected to Postgres (Prisma) successfully.");
    console.log("  database:", rows[0].db);
    console.log("  version:", String(rows[0].version).split("\n")[0]);
  } finally {
    await prisma.$disconnect();
  }
}

checkConnection().catch((err) => {
  console.error("Connection failed:", err.message);
  process.exit(1);
});
