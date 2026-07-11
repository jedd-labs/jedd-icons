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
const OUTPUT_DIR = join(ROOT, "apps", "www-docs", ".generated");
const OUTPUT = join(OUTPUT_DIR, "icon-tags.json");

function readTags(file: string): string[] {
  try {
    const meta = JSON.parse(readFileSync(file, "utf-8")) as {
      tags?: unknown;
    };
    if (!Array.isArray(meta.tags)) {
      return [];
    }
    return meta.tags.filter(
      (t): t is string => typeof t === "string" && t.length > 0
    );
  } catch {
    return [];
  }
}

type ByIcon = Record<string, string[]>;

function collectVariantDir(dir: string, byIcon: ByIcon) {
  for (const file of readdirSync(dir)) {
    if (!file.endsWith(".json")) {
      continue;
    }
    const name = basename(file, ".json");
    const tags = readTags(join(dir, file));
    if (tags.length === 0) {
      continue;
    }
    const seen = (byIcon[name] ??= []);
    for (const tag of tags) {
      if (!seen.includes(tag)) {
        seen.push(tag);
      }
    }
  }
}

function main() {
  const byIconKebab: ByIcon = {};

  if (existsSync(ICONS_DIR)) {
    for (const variant of readdirSync(ICONS_DIR, { withFileTypes: true })) {
      if (variant.isDirectory()) {
        collectVariantDir(join(ICONS_DIR, variant.name), byIconKebab);
      }
    }
  }

  // Convert kebab → PascalCase only here, at the serialization boundary, so the
  // kebab-keyed stroke/fill merge above stays intact.
  const byIcon: ByIcon = Object.fromEntries(
    Object.entries(byIconKebab)
      .map(([name, tags]) => [kebabToPascal(name), [...tags].sort()] as const)
      .sort(([a], [b]) => a.localeCompare(b))
  );

  // Inverted index derived from byIcon so the two stay consistent.
  const byTag: Record<string, string[]> = {};
  for (const [name, tags] of Object.entries(byIcon)) {
    for (const tag of tags) {
      (byTag[tag] ??= []).push(name);
    }
  }
  const sortedByTag = Object.fromEntries(
    Object.entries(byTag)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([tag, names]) => [tag, names.sort()])
  );

  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(
    OUTPUT,
    `${JSON.stringify({ byIcon, byTag: sortedByTag }, null, 2)}\n`,
    "utf-8"
  );
  console.log(
    `Wrote tags for ${Object.keys(byIcon).length} icon(s), ${Object.keys(sortedByTag).length} tag(s) → ${OUTPUT.replace(`${ROOT}/`, "")}`
  );
}

main();
