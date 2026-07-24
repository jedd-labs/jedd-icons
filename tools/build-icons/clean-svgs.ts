#!/usr/bin/env node
/**
 * Strips inline presentation attributes from child elements in source SVGs
 * and normalizes the root <svg> attributes to match variant defaults.
 *
 * Auto-discovers variant subdirectories under icons/ (e.g. stroke/, fill/).
 *
 * Usage: tsx tools/build-icons/clean-svgs.ts
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const ICONS_DIR = join(ROOT, "icons");

const VARIANT_ROOT_ATTRS: Record<string, string> = {
  stroke: [
    'xmlns="http://www.w3.org/2000/svg"',
    'width="24"',
    'height="24"',
    'viewBox="0 0 24 24"',
    'fill="none"',
    'stroke="currentColor"',
    'stroke-width="2"',
    'stroke-linecap="butt"',
    'stroke-linejoin="miter"',
  ].join(" "),
  fill: [
    'xmlns="http://www.w3.org/2000/svg"',
    'width="24"',
    'height="24"',
    'viewBox="0 0 24 24"',
    'fill="currentColor"',
    'stroke="none"',
  ].join(" "),
};

// Presentation attributes stripped from child elements (they're set on the root
// and inherited). `stroke-linejoin` is intentionally NOT here — it's handled
// separately so a non-default join (e.g. bevel) can be kept per element.
const INHERITED_ATTRS =
  /\s+(?:stroke|fill|stroke-width|stroke-linecap|stroke-dasharray|stroke-dashoffset|stroke-miterlimit|stroke-opacity|fill-opacity|opacity|class)="[^"]*"/g;

// The default stroke-linejoin every icon inherits from the root. A child join
// equal to this is redundant and stripped; any other value is a deliberate
// per-element override and preserved (with a warning).
const DEFAULT_LINEJOIN = "miter";
const CHILD_LINEJOIN = /\s+stroke-linejoin="([^"]*)"/g;

/**
 * Flattens design-tool export artifacts: removes `<defs>` blocks (which hold
 * clip/mask/gradient definitions the flat icons never use) and unwraps
 * `<g clip-path="…">…</g>` groups, hoisting their children to the root. These
 * wrappers are functionally inert for a 24×24 flat icon but violate the
 * "no groups/defs" rule and confuse simple parsers. Idempotent.
 */
function unwrapGroups(inner: string): string {
  let out = inner;
  // Drop entire <defs>…</defs> blocks (clipPath/mask/gradient definitions).
  out = out.replace(/<defs\b[^>]*>[\s\S]*?<\/defs>/g, "");
  // Unwrap <g …>…</g>, repeatedly to handle nesting. The regex matches an
  // innermost group (no nested <g> inside) and replaces it with its children.
  let prev: string;
  do {
    prev = out;
    out = out.replace(/<g\b[^>]*>((?:(?!<\/?g\b)[\s\S])*?)<\/g>/g, "$1");
  } while (out !== prev);
  return out;
}

/**
 * Merges multiple sibling `<path>` elements into a single one by concatenating
 * their `d` attributes, but ONLY when every child element is a `<path>` (no
 * circle/rect/line/etc). Safe for stroke icons: separate subpaths render
 * identically whether in one element or many. Skips icons with non-path
 * primitives so we never lose geometry. Runs after attribute stripping so all
 * paths share the (empty) inherited presentation.
 */
function mergePaths(inner: string): string {
  const elements = inner.match(/<[a-zA-Z][\w-]*\b[^>]*\/?>/g) ?? [];
  const nonEmpty = elements.filter((el) => !el.startsWith("<?"));
  if (nonEmpty.length < 2) {
    return inner;
  }
  // Bail unless EVERY element is a self-contained <path …/>.
  const allPaths = nonEmpty.every((el) => /^<path\b/.test(el));
  if (!allPaths) {
    return inner;
  }
  const ds = nonEmpty
    .map((el) => el.match(/\bd="([^"]*)"/)?.[1]?.trim())
    .filter((d): d is string => Boolean(d));
  if (ds.length < 2) {
    return inner;
  }
  return `\n<path d="${ds.join(" ")}"/>\n`;
}

function cleanSvg(svg: string, rootAttrs: string, label: string): string {
  const openMatch = svg.match(/^<svg[^>]*>/);
  if (!openMatch) {
    return svg;
  }
  const closeIdx = svg.lastIndexOf("</svg>");
  if (closeIdx === -1) {
    return svg;
  }

  let inner = svg.slice(openMatch[0].length, closeIdx);

  // Flatten export artifacts (defs/clip-path groups) before anything else.
  inner = unwrapGroups(inner);

  // The root is about to be replaced by the canonical template (miter). If the
  // source declared a non-default join on the root hoist it onto child elements first so it survives as a
  // per-element override rather than being lost.
  const rootJoin = openMatch[0].match(/stroke-linejoin="([^"]*)"/)?.[1];
  if (rootJoin && rootJoin !== DEFAULT_LINEJOIN) {
    inner = inner.replace(
      /<(path|circle|rect|line|polygon|polyline|ellipse)\b((?:(?!\/?>)[\s\S])*?)(\/?>)/g,
      (full, tag: string, attrs: string, close: string) =>
        attrs.includes("stroke-linejoin")
          ? full
          : `<${tag}${attrs} stroke-linejoin="${rootJoin}"${close}`
    );
  }

  // Strip inherited presentation attributes from child elements
  inner = inner.replace(/<([a-zA-Z][\w-]*)\s+([^>]*?)\s*\/?>/g, (match) =>
    match.replace(INHERITED_ATTRS, "")
  );

  // Handle stroke-linejoin on children: drop the redundant default (miter),
  // keep any deliberate override (bevel/round) and warn so accidental exports
  // are surfaced rather than silently shipped.
  inner = inner.replace(CHILD_LINEJOIN, (full, value: string) => {
    if (value === DEFAULT_LINEJOIN) {
      return "";
    }
    console.warn(
      `[clean-svgs] ${label}: kept non-default stroke-linejoin="${value}" — verify this is intentional`
    );
    return full;
  });

  // Merge sibling <path>s into one (only when nothing but paths remain).
  inner = mergePaths(inner);

  // Clean up any double spaces left behind
  inner = inner
    .replace(/ {2,}/g, " ")
    .replace(/ >/g, ">")
    .replace(/ \/>/g, "/>");

  // Collapse blank lines left by unwrapping so each element sits on its own
  // line with a single leading/trailing newline.
  inner = `\n${inner.replace(/[ \t]*\n\s*\n/g, "\n").trim()}\n`;

  return `<svg ${rootAttrs}>${inner}</svg>\n`;
}

// Discover variant subdirectories
const variants = readdirSync(ICONS_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

if (variants.length === 0) {
  console.warn("[clean-svgs] no variant directories found under icons/");
  process.exit(0);
}

let totalChanged = 0;
let totalClean = 0;

for (const variant of variants) {
  const variantDir = join(ICONS_DIR, variant);
  const rootAttrs = VARIANT_ROOT_ATTRS[variant];

  if (!rootAttrs) {
    console.warn(`[clean-svgs] unknown variant "${variant}", skipping`);
    continue;
  }

  const files = readdirSync(variantDir)
    .filter((f) => f.endsWith(".svg"))
    .sort();

  let changed = 0;

  for (const file of files) {
    const path = join(variantDir, file);
    const original = readFileSync(path, "utf8");
    const cleaned = cleanSvg(original, rootAttrs, `${variant}/${file}`);

    if (cleaned !== original) {
      writeFileSync(path, cleaned);
      changed++;
      console.log(`[clean-svgs] ${variant}/${file}: cleaned`);
    }
  }

  const clean = files.length - changed;
  totalChanged += changed;
  totalClean += clean;
  console.log(
    `[clean-svgs] ${variant}: ${changed} updated, ${clean} already clean`
  );
}

console.log(
  `[clean-svgs] done — ${totalChanged} file${totalChanged === 1 ? "" : "s"} updated, ${totalClean} already clean`
);
