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

const INHERITED_ATTRS =
  /\s+(?:stroke|fill|stroke-width|stroke-linecap|stroke-linejoin|stroke-dasharray|stroke-dashoffset|stroke-miterlimit|stroke-opacity|fill-opacity|opacity|class)="[^"]*"/g;

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

function cleanSvg(svg: string, rootAttrs: string): string {
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

  // Strip inherited presentation attributes from child elements
  inner = inner.replace(/<([a-zA-Z][\w-]*)\s+([^>]*?)\s*\/?>/g, (match) =>
    match.replace(INHERITED_ATTRS, "")
  );

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
    const cleaned = cleanSvg(original, rootAttrs);

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
