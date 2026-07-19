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

type IconAttrs = Record<string, string | number>;
type IconNodeChild = [
  tag: string,
  attrs: IconAttrs,
  children?: IconNodeChild[],
];
type IconNode = IconNodeChild[];

// ── SVG parser (kept in lockstep with tools/build-icons/build.ts) ──────

function parseAttrs(attrsStr: string): IconAttrs {
  const attrs: IconAttrs = {};
  const attrRe = /([a-zA-Z:][\w:-]*)\s*=\s*"([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = attrRe.exec(attrsStr)) !== null) {
    attrs[m[1]] = m[2];
  }
  return attrs;
}

function parseChildren(xml: string, pos: number): [IconNode, number] {
  const nodes: IconNode = [];

  while (pos < xml.length) {
    const nextTag = xml.indexOf("<", pos);
    if (nextTag === -1) {
      break;
    }
    pos = nextTag;

    if (xml[pos + 1] === "/") {
      return [nodes, xml.indexOf(">", pos) + 1];
    }

    const tagMatch = xml
      .slice(pos)
      .match(/^<([a-zA-Z][\w-]*)\s*([^>]*?)(\/)?>/);
    if (!tagMatch) {
      pos++;
      continue;
    }

    const [fullMatch, tag, attrsStr, selfClose] = tagMatch;
    const attrs = parseAttrs(attrsStr);
    pos += fullMatch.length;

    if (selfClose) {
      nodes.push([tag, attrs]);
    } else {
      const [children, newPos] = parseChildren(xml, pos);
      pos = newPos;
      if (children.length > 0) {
        nodes.push([tag, attrs, children]);
      } else {
        nodes.push([tag, attrs]);
      }
    }
  }

  return [nodes, pos];
}

function parseSvg(svg: string): IconNode {
  const cleaned = svg
    .replace(/<\?xml[^?]*\?>/g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .trim();

  const svgOpen = cleaned.match(/^<svg[^>]*>/);
  if (!svgOpen) {
    return [];
  }
  const svgClose = cleaned.lastIndexOf("</svg>");
  if (svgClose === -1) {
    return [];
  }

  const inner = cleaned.slice(svgOpen[0].length, svgClose);
  const [nodes] = parseChildren(inner, 0);
  return nodes;
}

const INHERITED_ATTRS = new Set([
  "stroke",
  "fill",
  "stroke-width",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stroke-miterlimit",
  "stroke-opacity",
  "fill-opacity",
  "opacity",
]);

function stripInheritedAttrs(nodes: IconNode): IconNode {
  return nodes.map(([tag, attrs, children]) => {
    const cleaned = Object.fromEntries(
      Object.entries(attrs).filter(([k]) => !INHERITED_ATTRS.has(k))
    );
    if (children) {
      return [tag, cleaned, stripInheritedAttrs(children)];
    }
    return [tag, cleaned];
  });
}

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
