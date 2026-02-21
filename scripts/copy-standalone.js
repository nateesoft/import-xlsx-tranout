/**
 * Post-build script: copy Next.js static assets into the standalone output
 * so electron-builder can package everything from .next/standalone/
 *
 * Run after: next build
 * Run before: electron-builder
 */

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");

function copyDir(src, dst) {
  if (!fs.existsSync(src)) {
    console.warn(`  skip (not found): ${src}`);
    return;
  }
  fs.cpSync(src, dst, { recursive: true, force: true });
  console.log(`  ✓ ${path.relative(root, src)}  →  ${path.relative(root, dst)}`);
}

console.log("\nCopying standalone assets...");

// .next/static → .next/standalone/.next/static
copyDir(
  path.join(root, ".next", "static"),
  path.join(root, ".next", "standalone", ".next", "static")
);

// public → .next/standalone/public
copyDir(
  path.join(root, "public"),
  path.join(root, ".next", "standalone", "public")
);

console.log("Done.\n");
