#!/usr/bin/env node
/**
 * Checks the source SVGs without changing them: each must already be
 * normalized (`pnpm icons:clean`), free of export problems that change what
 * the packages ship, and have a sidecar `.json` matching `icon.schema.json`.
 * Exits 1 on any error; warnings flag what may be intended.
 *
 * Auto-discovers variant subdirectories under icons/ (e.g. stroke/, fill/).
 *
 * Usage: tsx tools/build-icons/check-icons.ts
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { checkIcon, checkMetadata } from "./check-icons.lib";
import type { Issue } from "./check-rules";
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

function report(file: string, { severity, message }: Issue) {
  if (severity === "error") {
    errors++;
    console.error(`[check-icons] ${file}: error: ${message}`);
  } else {
    warnings++;
    console.warn(`[check-icons] ${file}: warning: ${message}`);
  }
}

for (const variant of variants) {
  if (!VARIANT_ROOT_ATTRS[variant]) {
    console.warn(`[check-icons] unknown variant "${variant}", skipping`);
    continue;
  }

  const variantDir = join(ICONS_DIR, variant);
  const entries = readdirSync(variantDir);
  const files = entries.filter((f) => f.endsWith(".svg")).sort();

  for (const file of files) {
    const svg = readFileSync(join(variantDir, file), "utf8");
    const metaPath = join(variantDir, file.replace(/\.svg$/, ".json"));
    const meta = existsSync(metaPath)
      ? readFileSync(metaPath, "utf8")
      : undefined;
    for (const issue of [...checkIcon(svg, variant), ...checkMetadata(meta)]) {
      report(`${variant}/${file}`, issue);
    }
  }
  for (const file of entries.filter((f) => f.endsWith(".json")).sort()) {
    if (!entries.includes(file.replace(/\.json$/, ".svg"))) {
      report(`${variant}/${file}`, {
        rule: "metadata",
        severity: "error",
        message: "sidecar .json has no matching .svg — rename or delete it",
      });
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
