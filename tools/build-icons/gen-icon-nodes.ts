#!/usr/bin/env node

// Emits the raw parsed geometry (IconNode tuples) of every source SVG so the
// docs app's "Jedd Lab" x-ray route can inspect path data at runtime. This is
// the same tuple shape the codegen bakes into each package file, but kept as an
// app-local artifact (nothing new is added to the published package surface).

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_VARIANT,
  type IconNode,
  mergePathNodes,
  parseSvg,
  stripInheritedAttrs,
} from "./build.lib";
import { kebabToPascal } from "./naming";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const ICONS_DIR = join(ROOT, "icons");

// Output dir is overridable via `--out <path>` (relative to repo root) so the
// same generator can feed any consuming app. Defaults to the Lab app.
const outArgIdx = process.argv.indexOf("--out");
const OUTPUT_DIR =
  outArgIdx !== -1 && process.argv[outArgIdx + 1]
    ? resolve(ROOT, process.argv[outArgIdx + 1])
    : join(ROOT, "apps", "lab", ".generated");
const OUTPUT = join(OUTPUT_DIR, "icon-nodes.json");

// The SVG parser and attribute-stripping rules are imported from build.lib so
// the Lab reflects exactly what the codegen parses. They were previously
// duplicated here and silently drifted. `node` is deliberately NOT merged: the
// Lab inspects the source's element structure. `shipped` is the merged form the
// stroke packages ship, for the Lab's "shipped SVG" view.

// ── Main ───────────────────────────────────────────────────────────────

/** The sidecar `.json` fields the Lab's metadata checks care about. */
interface IconMeta {
  categories?: unknown;
  contributors?: unknown;
  deprecated?: boolean;
  tags?: unknown;
}

interface IconNodeEntry {
  /** Raw sidecar metadata (present: true) or absence marker for the checks. */
  meta: IconMeta | null;
  /** Parsed IconNode tuples (kebab-cased attrs, as in the source SVG). */
  node: IconNode;
  /** PascalCase component name, e.g. "AlertCircle". */
  pascalName: string;
  /** The geometry the packages ship: `node` merged as the codegen does. */
  shipped: IconNode;
  /** Variant this geometry belongs to. */
  variant: string;
}

function readMeta(dir: string, name: string): IconMeta | null {
  const path = join(dir, `${name}.json`);
  if (!existsSync(path)) {
    return null;
  }
  try {
    const raw = JSON.parse(readFileSync(path, "utf8")) as IconMeta;
    return {
      contributors: raw.contributors,
      tags: raw.tags,
      categories: raw.categories,
      deprecated: raw.deprecated,
    };
  } catch {
    // A malformed sidecar surfaces as "invalid metadata" in the Lab rather
    // than crashing the whole generation.
    return {};
  }
}

function collectVariant(
  variant: string,
  byIcon: Record<string, Record<string, IconNodeEntry>>
): number {
  const dir = join(ICONS_DIR, variant);
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".svg"))
    .sort();

  for (const file of files) {
    const name = basename(file, ".svg");
    const svg = readFileSync(join(dir, file), "utf8");
    const node = stripInheritedAttrs(parseSvg(svg));
    if (node.length === 0) {
      console.warn(`[gen-icon-nodes] ${variant}/${file}: no geometry parsed`);
    }
    (byIcon[name] ??= {})[variant] = {
      pascalName: kebabToPascal(name),
      variant,
      node,
      shipped: variant === DEFAULT_VARIANT ? mergePathNodes(node) : node,
      meta: readMeta(dir, name),
    };
  }

  return files.length;
}

function main() {
  if (!existsSync(ICONS_DIR)) {
    throw new Error(`icons directory not found: ${ICONS_DIR}`);
  }

  // name (kebab) → variant → geometry. Keyed by kebab source name so the two
  // variants of one icon collapse together, mirroring the metadata gen scripts.
  const byIcon: Record<string, Record<string, IconNodeEntry>> = {};
  let total = 0;

  for (const variant of readdirSync(ICONS_DIR, { withFileTypes: true })) {
    if (variant.isDirectory()) {
      total += collectVariant(variant.name, byIcon);
    }
  }

  const sorted = Object.fromEntries(
    Object.entries(byIcon).sort(([a], [b]) => a.localeCompare(b))
  );

  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(OUTPUT, `${JSON.stringify(sorted, null, 2)}\n`, "utf-8");
  console.log(
    `[gen-icon-nodes] wrote geometry for ${Object.keys(sorted).length} icon(s), ${total} file(s) → ${OUTPUT.replace(`${ROOT}/`, "")}`
  );
}

main();
