#!/usr/bin/env node
/**
 * Strips inline presentation attributes from child elements in source SVGs
 * and normalizes the root <svg> attributes to match variant defaults. Only
 * rewrites files; `check-icons.ts` checks them. Warns about what cleaning
 * discards that changes how an icon renders, since that's gone afterwards.
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

  for (const file of files) {
    const path = join(variantDir, file);
    const original = readFileSync(path, "utf8");
    const cleaned = cleanSvg(original, rootAttrs);

    for (const message of droppedFeatures(original)) {
      console.warn(`[clean-icons] ${variant}/${file}: ${message}`);
    }

    if (cleaned !== original) {
      writeFileSync(path, cleaned);
      changed++;
      console.log(`[clean-icons] ${variant}/${file}: cleaned`);
    }
  }

  const clean = files.length - changed;
  totalChanged += changed;
  totalClean += clean;
  console.log(
    `[clean-icons] ${variant}: ${changed} updated, ${clean} already clean`
  );
}

console.log(
  `[clean-icons] done — ${totalChanged} file${totalChanged === 1 ? "" : "s"} updated, ${totalClean} already clean`
);
