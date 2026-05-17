/**
 * Fallback entry when the host runs `node src/index.js` (e.g. misconfigured Render start).
 * Prefer: npm start  →  node dist/index.js
 */
require("../dist/index.js");
