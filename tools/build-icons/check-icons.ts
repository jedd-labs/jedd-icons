#!/usr/bin/env node
/**
 * Checks the source SVGs without changing them: each must already be
 * normalized (`pnpm icons:clean`) and free of export problems that change what
 * the packages ship. Exits 1 on any error; warnings flag what may be intended.
 *
 * Auto-discovers variant subdirectories under icons/ (e.g. stroke/, fill/).
 *
 * Usage: tsx tools/build-icons/check-icons.ts
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { checkIcon } from "./check-icons.lib";
import { VARIANT_ROOT_ATTRS } from "./clean-icons.lib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const ICONS_DIR = join(ROOT, "icons");

// Discover variant subdirectories
const variants = readdirSync(ICONS_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

let checked = 0;
let errors = 0;
let warnings = 0;

for (const variant of variants) {
  if (!VARIANT_ROOT_ATTRS[variant]) {
    console.warn(`[check-icons] unknown variant "${variant}", skipping`);
    continue;
  }

  const variantDir = join(ICONS_DIR, variant);
  const files = readdirSync(variantDir)
    .filter((f) => f.endsWith(".svg"))
    .sort();

  for (const file of files) {
    const svg = readFileSync(join(variantDir, file), "utf8");
    for (const { severity, message } of checkIcon(svg, variant)) {
      if (severity === "error") {
        errors++;
        console.error(`[check-icons] ${variant}/${file}: error: ${message}`);
      } else {
        warnings++;
        console.warn(`[check-icons] ${variant}/${file}: warning: ${message}`);
      }
    }
  }
  checked += files.length;
}

console.log(
  `[check-icons] checked ${checked} icon${checked === 1 ? "" : "s"} — ${errors} error${errors === 1 ? "" : "s"}, ${warnings} warning${warnings === 1 ? "" : "s"}`
);

if (errors > 0) {
  process.exitCode = 1;
}
