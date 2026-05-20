"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPool = createPool;
exports.getPool = getPool;
exports.getMigrateConnectionString = getMigrateConnectionString;
const pg_1 = require("pg");
const env_1 = require("../config/env");
let pool = null;
/** Neon and other cloud Postgres hosts require SSL. */
function buildPoolConfig(connectionString) {
    const config = { connectionString };
    const needsSsl = connectionString.includes("neon.tech") ||
        /sslmode=require/i.test(connectionString) ||
        /ssl=true/i.test(connectionString);
    if (needsSsl) {
        config.ssl = { rejectUnauthorized: false };
    }
    return config;
}
function createPool(connectionString) {
    return new pg_1.Pool(buildPoolConfig(connectionString));
}
function getPool() {
    if (!env_1.env.databaseUrl) {
        throw new Error("DATABASE_URL is not configured");
    }
    if (!pool) {
        pool = createPool(env_1.env.databaseUrl);
    }
    return pool;
}
/** Direct URL for migrations when Neon provides separate pooled vs direct strings. */
function getMigrateConnectionString() {
    return env_1.env.databaseUrlDirect || env_1.env.databaseUrl;
}
