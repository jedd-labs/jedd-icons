#!/usr/bin/env node
// Collects each icon's contributors (GitHub usernames) from its `.json`
// sidecars, per variant, into apps/www-docs/.generated/icon-contributors.json.

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { kebabToPascal } from "./naming";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const ICONS_DIR = join(ROOT, "icons");

const OUTPUT_DIR = join(ROOT, "apps", "www-docs", ".generated");
const OUTPUT = join(OUTPUT_DIR, "icon-contributors.json");

/** Read an icon `.json` sidecar's contributors array, or [] if absent/invalid. */
function readContributors(file: string): string[] {
  try {
    const meta = JSON.parse(readFileSync(file, "utf-8")) as {
      contributors?: unknown;
    };
    if (!Array.isArray(meta.contributors)) {
      return [];
    }
    return meta.contributors.filter(
      (c): c is string => typeof c === "string" && c.length > 0
    );
  } catch {
    return [];
  }
}

// name → variant → ordered, de-duplicated contributors for that variant.
type ByIcon = Record<string, Record<string, string[]>>;

/** Record one variant dir's `.json` contributors, keyed by icon then variant. */
function collectVariantDir(dir: string, variant: string, byIcon: ByIcon) {
  for (const file of readdirSync(dir)) {
    if (!file.endsWith(".json")) {
      continue;
    }
    const name = basename(file, ".json");
    const contributors = readContributors(join(dir, file));
    if (contributors.length === 0) {
      continue;
    }
    const perVariant = (byIcon[name] ??= {});
    const seen = (perVariant[variant] ??= []);
    for (const contributor of contributors) {
      if (!seen.includes(contributor)) {
        seen.push(contributor);
      }
    }
  }
}

function main() {
  const byIcon: ByIcon = {};

  if (existsSync(ICONS_DIR)) {
    for (const variant of readdirSync(ICONS_DIR, { withFileTypes: true })) {
      if (variant.isDirectory()) {
        collectVariantDir(join(ICONS_DIR, variant.name), variant.name, byIcon);
      }
    }
  }

  // Keyed by component name, as the docs site looks icons up. Aliases aren't
  // keyed (no sidecar defines any yet).
  const sorted = Object.fromEntries(
    Object.entries(byIcon)
      .map(([name, variants]) => [kebabToPascal(name), variants] as const)
      .sort(([a], [b]) => a.localeCompare(b))
  );

  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(OUTPUT, `${JSON.stringify(sorted, null, 2)}\n`, "utf-8");
  console.log(
    `Wrote contributors for ${Object.keys(sorted).length} icon(s) → ${OUTPUT.replace(`${ROOT}/`, "")}`
  );
}

main();
