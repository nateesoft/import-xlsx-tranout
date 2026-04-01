/**
 * pack-prod.js
 * Assembles a minimal production folder at dist-prod/ that can be run with:
 *   electron .
 *
 * dist-prod/
 *   electron/          ← main.js + preload.js
 *   .next/standalone/  ← Next.js standalone server (with static + public)
 *   node_modules/      ← runtime deps only (mysql2, xlsx)
 *   package.json       ← minimal (name, version, main)
 */

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const out = path.join(root, "dist-prod");

function copyDir(src, dst) {
  if (!fs.existsSync(src)) {
    console.warn(`  skip (not found): ${src}`);
    return;
  }
  fs.cpSync(src, dst, { recursive: true, force: true });
  console.log(`  ✓ ${path.relative(root, src)}  →  ${path.relative(root, dst)}`);
}

function copyFile(src, dst) {
  if (!fs.existsSync(src)) {
    console.warn(`  skip (not found): ${src}`);
    return;
  }
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
  console.log(`  ✓ ${path.relative(root, src)}  →  ${path.relative(root, dst)}`);
}

console.log("\nCleaning dist-prod...");
if (fs.existsSync(out)) fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

console.log("\nCopying electron/...");
copyDir(path.join(root, "electron"), path.join(out, "electron"));

console.log("\nCopying .next/standalone/...");
copyDir(
  path.join(root, ".next", "standalone"),
  path.join(out, ".next", "standalone")
);

console.log("\nCopying static assets into standalone...");
// .next/static → .next/standalone/.next/static
copyDir(
  path.join(root, ".next", "static"),
  path.join(out, ".next", "standalone", ".next", "static")
);
// public → .next/standalone/public
copyDir(
  path.join(root, "public"),
  path.join(out, ".next", "standalone", "public")
);

console.log("\nCopying runtime node_modules...");
const runtimeDeps = ["mysql2", "xlsx"];
for (const dep of runtimeDeps) {
  copyDir(
    path.join(root, "node_modules", dep),
    path.join(out, "node_modules", dep)
  );
}

// mysql2 peer deps
const mysqlPeers = ["iconv-lite", "long", "lru-cache", "named-placeholders", "seq-queue", "sqlstring", "denque"];
for (const dep of mysqlPeers) {
  copyDir(
    path.join(root, "node_modules", dep),
    path.join(out, "node_modules", dep)
  );
}

console.log("\nWriting package.json...");
const srcPkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const minPkg = {
  name: srcPkg.name,
  version: srcPkg.version,
  main: "electron/main.js",
};
fs.writeFileSync(
  path.join(out, "package.json"),
  JSON.stringify(minPkg, null, 2),
  "utf8"
);
console.log("  ✓ package.json");

console.log("\nDone. Run with:");
console.log(`  cd dist-prod && npx electron@$(node -e "require('./node_modules/electron/package.json').version ||(require('fs').existsSync('../node_modules/electron') && require('../node_modules/electron/package.json').version)" 2>/dev/null || echo "latest") .`);
console.log("  or: electron . (if electron is installed globally)\n");
