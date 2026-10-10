#!/usr/bin/env node

// Emits the raw parsed geometry (IconNode tuples) of every source SVG so the
// docs app's "Jedd Lab" x-ray route can inspect path data at runtime. This is
// the same tuple shape the codegen bakes into each package file, but kept as an
// app-local artifact (nothing new is added to the published package surface).
// Each icon also carries the issues `icons:check` reports for it, so the Lab
// shows the same checks rather than re-implementing them.

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
import { checkIcon, checkMetadata, marginReport } from "./check-icons.lib";
import type { Issue, MarginReport } from "./check-rules";
import { VARIANT_ROOT_ATTRS } from "./clean-icons.lib";
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

interface IconNodeEntry {
  /** What `icons:check` reports for this icon, sidecar `.json` included. */
  issues: Issue[];
  /** How far the geometry crosses the 1px margin; null if it can't be read. */
  margin: MarginReport | null;
  /** Parsed sidecar `.json`, or null when it's missing or isn't valid JSON. */
  meta: unknown;
  /** Parsed IconNode tuples (kebab-cased attrs, as in the source SVG). */
  node: IconNode;
  /** PascalCase component name, e.g. "AlertCircle". */
  pascalName: string;
  /** The geometry the packages ship: `node` merged as the codegen does. */
  shipped: IconNode;
  /** Variant this geometry belongs to. */
  variant: string;
}

// A malformed sidecar shows as a metadata issue in the Lab rather than
// crashing the whole generation.
function parseMeta(json: string | undefined): unknown {
  try {
    return json === undefined ? null : JSON.parse(json);
  } catch {
    return null;
  }
}

function measureMargin(node: IconNode): MarginReport | null {
  try {
    return marginReport(node);
  } catch {
    // Geometry the build can't read; `checkIcon` reports why.
    return null;
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
    const metaPath = join(dir, `${name}.json`);
    const json = existsSync(metaPath)
      ? readFileSync(metaPath, "utf8")
      : undefined;
    const node = stripInheritedAttrs(parseSvg(svg));
    if (node.length === 0) {
      console.warn(`[gen-icon-nodes] ${variant}/${file}: no geometry parsed`);
    }
    (byIcon[name] ??= {})[variant] = {
      pascalName: kebabToPascal(name),
      variant,
      node,
      shipped: variant === DEFAULT_VARIANT ? mergePathNodes(node) : node,
      meta: parseMeta(json),
      issues: [
        ...(VARIANT_ROOT_ATTRS[variant] ? checkIcon(svg, variant) : []),
        ...checkMetadata(json),
      ],
      margin: measureMargin(node),
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
