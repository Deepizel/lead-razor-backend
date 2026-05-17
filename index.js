/**
 * Production entry when the host runs `node index.js` from the repo root.
 * Compiled output lives in dist/ (see npm run build).
 */
const path = require("path");
const fs = require("fs");

const entry = path.join(__dirname, "dist", "index.js");

if (!fs.existsSync(entry)) {
  console.error(
    "Missing dist/index.js — run `npm run build` before starting the server."
  );
  process.exit(1);
}

require(entry);
