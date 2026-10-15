#!/usr/bin/env node
/**
 * Strips inline presentation attributes from child elements in source SVGs
 * and normalizes the root <svg> attributes to match variant defaults. Only
 * rewrites files; `check-icons.ts` checks them. An icon whose cleaning would
 * change how it renders (a group's transform, a dash pattern) is left as
 * exported and reported, with exit code 1: once cleaned, nothing would be
 * left for `icons:check` to catch.
 *
 * Auto-discovers variant subdirectories under icons/ (e.g. stroke/, fill/).
 *
 * Usage: tsx tools/build-icons/clean-icons.ts
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  cleanSvg,
  droppedFeatures,
  VARIANT_ROOT_ATTRS,
} from "./clean-icons.lib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const ICONS_DIR = join(ROOT, "icons");

// Discover variant subdirectories
const variants = readdirSync(ICONS_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

if (variants.length === 0) {
  console.warn("[clean-icons] no variant directories found under icons/");
  process.exit(0);
}

let totalChanged = 0;
let totalClean = 0;
const refused: string[] = [];

for (const variant of variants) {
  const variantDir = join(ICONS_DIR, variant);
  const rootAttrs = VARIANT_ROOT_ATTRS[variant];

  if (!rootAttrs) {
    console.warn(`[clean-icons] unknown variant "${variant}", skipping`);
    continue;
  }

  const files = readdirSync(variantDir)
    .filter((f) => f.endsWith(".svg"))
    .sort();

  let changed = 0;
  let skipped = 0;

  for (const file of files) {
    const path = join(variantDir, file);
    const original = readFileSync(path, "utf8");
    const cleaned = cleanSvg(original, rootAttrs);

    // Cleaning this one would change how it looks, and leave nothing for
    // `icons:check` to catch, so it's left as exported until it's fixed.
    const dropped = droppedFeatures(original);
    if (dropped.length > 0) {
      for (const message of dropped) {
        console.error(`[clean-icons] ${variant}/${file}: error: ${message}`);
      }
      refused.push(`${variant}/${file}`);
      skipped++;
      continue;
    }

    if (cleaned !== original) {
      writeFileSync(path, cleaned);
      changed++;
      console.log(`[clean-icons] ${variant}/${file}: cleaned`);
    }
  }

  const clean = files.length - changed - skipped;
  totalChanged += changed;
  totalClean += clean;
  console.log(
    `[clean-icons] ${variant}: ${changed} updated, ${clean} already clean${skipped ? `, ${skipped} left uncleaned` : ""}`
  );
}

console.log(
  `[clean-icons] done — ${totalChanged} file${totalChanged === 1 ? "" : "s"} updated, ${totalClean} already clean`
);

if (refused.length > 0) {
  console.error(
    `[clean-icons] ${refused.length} icon${refused.length === 1 ? "" : "s"} left uncleaned: ${refused.join(", ")}\n` +
      "[clean-icons] Cleaning them would change how they look (see the errors above), so they're left as exported. Fix them in the design tool, re-export, and run `pnpm icons:clean` again."
  );
  process.exitCode = 1;
}
