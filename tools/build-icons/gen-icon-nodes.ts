#!/usr/bin/env node

// Emits every source SVG's parsed geometry (IconNode tuples) for the Lab
// (`apps/lab`), unmerged as in the source and merged as shipped, with the
// issues `icons:check` reports for it so the Lab doesn't re-implement them.

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { animationIssues } from "./animation-files";
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

// `--out <path>` (relative to the repo root) overrides the output dir.
const outArgIdx = process.argv.indexOf("--out");
const OUTPUT_DIR =
  outArgIdx !== -1 && process.argv[outArgIdx + 1]
    ? resolve(ROOT, process.argv[outArgIdx + 1])
    : join(ROOT, "apps", "lab", ".generated");
const OUTPUT = join(OUTPUT_DIR, "icon-nodes.json");

// ── Main ───────────────────────────────────────────────────────────────

interface IconNodeEntry {
  /**
   * What `icons:check` reports for this icon, sidecar `.json` and animation
   * file included.
   */
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

// A malformed sidecar shows as a metadata issue rather than crashing.
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

async function collectVariant(
  variant: string,
  byIcon: Record<string, Record<string, IconNodeEntry>>
): Promise<number> {
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
        ...(await animationIssues(svg, variant, name)),
      ],
      margin: measureMargin(node),
    };
  }

  return files.length;
}

async function main() {
  if (!existsSync(ICONS_DIR)) {
    throw new Error(`icons directory not found: ${ICONS_DIR}`);
  }

  // name (kebab) → variant → geometry. Keyed by kebab source name so the two
  // variants of one icon collapse together, mirroring the metadata gen scripts.
  const byIcon: Record<string, Record<string, IconNodeEntry>> = {};
  let total = 0;

  for (const variant of readdirSync(ICONS_DIR, { withFileTypes: true })) {
    if (variant.isDirectory()) {
      total += await collectVariant(variant.name, byIcon);
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

await main();
