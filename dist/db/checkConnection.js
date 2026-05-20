"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("./prisma");
const env_1 = require("../config/env");
async function checkConnection() {
    (0, env_1.assertDatabaseConfigured)();
    try {
        const rows = await prisma_1.prisma.$queryRaw `SELECT current_database() AS db, version() AS version`;
        console.log("Connected to Postgres (Prisma) successfully.");
        console.log("  database:", rows[0].db);
        console.log("  version:", String(rows[0].version).split("\n")[0]);
    }
    finally {
        await prisma_1.prisma.$disconnect();
    }
}
checkConnection().catch((err) => {
    console.error("Connection failed:", err.message);
    process.exit(1);
});
