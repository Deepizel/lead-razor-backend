"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const pool_1 = require("./pool");
const env_1 = require("../config/env");
async function migrate() {
    (0, env_1.assertDatabaseConfigured)();
    const connectionString = (0, pool_1.getMigrateConnectionString)();
    if (!connectionString) {
        throw new Error("DATABASE_URL or DATABASE_URL_DIRECT must be set");
    }
    const pool = (0, pool_1.createPool)(connectionString);
    const sqlPath = path_1.default.join(__dirname, "migrations", "001_schema.sql");
    const sql = fs_1.default.readFileSync(sqlPath, "utf8");
    try {
        await pool.query(sql);
        console.log("Migration complete (categories, leads, lead_snapshots).");
    }
    finally {
        await pool.end();
    }
}
migrate().catch((err) => {
    console.error(err);
    process.exit(1);
});
