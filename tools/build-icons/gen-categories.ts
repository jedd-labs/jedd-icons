#!/usr/bin/env node

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

// Generated artifact — lives in the app's `.generated/` dir (gitignored),
const OUTPUT_DIR = join(ROOT, "apps", "www-docs", ".generated");
const OUTPUT = join(OUTPUT_DIR, "icon-categories.json");

/** Read an icon `.json` sidecar's categories array, or [] if absent/invalid. */
function readCategories(file: string): string[] {
  try {
    const meta = JSON.parse(readFileSync(file, "utf-8")) as {
      categories?: unknown;
    };
    if (!Array.isArray(meta.categories)) {
      return [];
    }
    return meta.categories.filter(
      (c): c is string => typeof c === "string" && c.length > 0
    );
  } catch {
    return [];
  }
}

type ByIcon = Record<string, string[]>;

/** Record one variant dir's `.json` categories, merged into the by-icon map. */
function collectVariantDir(dir: string, byIcon: ByIcon) {
  for (const file of readdirSync(dir)) {
    if (!file.endsWith(".json")) {
      continue;
    }
    const name = basename(file, ".json");
    const categories = readCategories(join(dir, file));
    if (categories.length === 0) {
      continue;
    }
    const seen = (byIcon[name] ??= []);
    for (const category of categories) {
      if (!seen.includes(category)) {
        seen.push(category);
      }
    }
  }
}

function main() {
  const byIcon: ByIcon = {};

  if (existsSync(ICONS_DIR)) {
    for (const variant of readdirSync(ICONS_DIR, { withFileTypes: true })) {
      if (variant.isDirectory()) {
        collectVariantDir(join(ICONS_DIR, variant.name), byIcon);
      }
    }
  }

  const sortedByIcon: ByIcon = Object.fromEntries(
    Object.entries(byIcon)
      .map(
        ([name, categories]) =>
          [kebabToPascal(name), [...categories].sort()] as const
      )
      .sort(([a], [b]) => a.localeCompare(b))
  );

  // Inverted index: category → sorted icon names
  const byCategory: Record<string, string[]> = {};
  for (const [name, categories] of Object.entries(sortedByIcon)) {
    for (const category of categories) {
      (byCategory[category] ??= []).push(name);
    }
  }
  const sortedByCategory = Object.fromEntries(
    Object.entries(byCategory)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([category, names]) => [category, names.sort()])
  );

  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(
    OUTPUT,
    `${JSON.stringify({ byIcon: sortedByIcon, byCategory: sortedByCategory }, null, 2)}\n`,
    "utf-8"
  );
  console.log(
    `Wrote categories for ${Object.keys(sortedByIcon).length} icon(s), ${Object.keys(sortedByCategory).length} category(ies) → ${OUTPUT.replace(`${ROOT}/`, "")}`
  );
}

main();
