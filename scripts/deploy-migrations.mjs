/**
 * Render / CI: apply Prisma migrations.
 * If the DB already has tables but no _prisma_migrations (P3005), baseline init once.
 */
import { spawnSync } from "node:child_process";

const SCHEMA = "prisma/schema.prisma";
const INIT_MIGRATION = "20250517120000_init";

function run(args) {
  const cmd = ["prisma", ...args, "--schema", SCHEMA];
  console.log(">", "npx", cmd.join(" "));
  return spawnSync("npx", cmd, {
    encoding: "utf8",
    env: process.env,
    shell: process.platform === "win32",
  });
}

function output(result) {
  return `${result.stdout ?? ""}${result.stderr ?? ""}`;
}

const deploy = run(["migrate", "deploy"]);

if (deploy.status === 0) {
  console.log("Migrations applied.");
  process.exit(0);
}

const log = output(deploy);

if (!log.includes("P3005")) {
  console.error(log);
  process.exit(deploy.status || 1);
}

console.log("P3005: database already has schema — baselining", INIT_MIGRATION);

const resolve = run(["migrate", "resolve", "--applied", INIT_MIGRATION]);
if (resolve.status !== 0) {
  console.error(output(resolve));
  process.exit(resolve.status || 1);
}

const redeploy = run(["migrate", "deploy"]);
if (redeploy.status !== 0) {
  console.error(output(redeploy));
  process.exit(redeploy.status || 1);
}

console.log("Baseline complete; migrations in sync.");
