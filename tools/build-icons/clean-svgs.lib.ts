// Pure, side-effect-free SVG normalization for the source-of-truth icons. Kept
// separate from `clean-svgs.ts` (the CLI entry) so these transforms can be
// imported and unit-tested without walking the filesystem.

export const VARIANT_ROOT_ATTRS: Record<string, string> = {
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
// and inherited). `stroke-linejoin` and `stroke-linecap` are intentionally NOT
// here — they're handled separately so a non-default join (e.g. bevel) or cap
// (e.g. square, which is what makes zero-length "dot" segments visible) can be
// kept per element.
export const INHERITED_ATTRS =
  /\s+(?:stroke|fill|stroke-width|stroke-dasharray|stroke-dashoffset|stroke-miterlimit|stroke-opacity|fill-opacity|opacity|class)="[^"]*"/g;

// The default stroke-linejoin every icon inherits from the root. A child join
// equal to this is redundant and stripped; any other value is a deliberate
// per-element override and preserved (with a warning).
export const DEFAULT_LINEJOIN = "miter";
export const CHILD_LINEJOIN = /\s+stroke-linejoin="([^"]*)"/g;

// Same contract for stroke-linecap. `butt` is the inherited default; `square`
// and `round` are deliberate overrides that must survive cleaning — dropping
// them collapses zero-length segments (dots) to nothing at render time.
export const DEFAULT_LINECAP = "butt";
export const CHILD_LINECAP = /\s+stroke-linecap="([^"]*)"/g;

// Presentation attributes that may legitimately remain on a child element after
// cleaning. Used by `mergePaths` to detect paths it must not merge away.
const SURVIVING_ATTRS = /\s(?:stroke-linejoin|stroke-linecap)="/;

/**
 * Flattens design-tool export artifacts: removes `<defs>` blocks (which hold
 * clip/mask/gradient definitions the flat icons never use) and unwraps
 * `<g clip-path="…">…</g>` groups, hoisting their children to the root. These
 * wrappers are functionally inert for a 24×24 flat icon but violate the
 * "no groups/defs" rule and confuse simple parsers. Idempotent.
 */
export function unwrapGroups(inner: string): string {
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
 *
 * Also bails when any path still carries a per-element presentation attribute
 * (a non-default linecap/linejoin): merging keeps only `d`, so that override
 * would be silently discarded.
 */
export function mergePaths(inner: string): string {
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
  // Bail if any path carries an override that merging would drop.
  if (nonEmpty.some((el) => SURVIVING_ATTRS.test(el))) {
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

const CHILD_ELEMENT =
  /<(path|circle|rect|line|polygon|polyline|ellipse)\b((?:(?!\/?>)[\s\S])*?)(\/?>)/g;

/**
 * Pushes a non-default presentation attribute from the source root onto every
 * child element that doesn't already set it. Called before the root is replaced
 * by the canonical template, so the override survives as a per-element value.
 */
function hoistRootAttr(
  inner: string,
  openTag: string,
  attr: string,
  defaultValue: string
): string {
  const rootValue = openTag.match(new RegExp(`${attr}="([^"]*)"`))?.[1];
  if (!rootValue || rootValue === defaultValue) {
    return inner;
  }
  return inner.replace(
    CHILD_ELEMENT,
    (full, tag: string, attrs: string, close: string) =>
      attrs.includes(attr)
        ? full
        : `<${tag}${attrs} ${attr}="${rootValue}"${close}`
  );
}

/**
 * Drops a child presentation attribute when it merely repeats the inherited
 * default; keeps any other value (a deliberate override) and warns so an
 * accidental design-tool export is surfaced rather than silently shipped.
 */
function stripDefaultAttr(
  inner: string,
  pattern: RegExp,
  defaultValue: string,
  attr: string,
  label: string
): string {
  return inner.replace(pattern, (full, value: string) => {
    if (value === defaultValue) {
      return "";
    }
    console.warn(
      `[clean-svgs] ${label}: kept non-default ${attr}="${value}" — verify this is intentional`
    );
    return full;
  });
}

export function cleanSvg(
  svg: string,
  rootAttrs: string,
  label: string
): string {
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

  // The root is about to be replaced by the canonical template (miter/butt). If
  // the source declared a non-default join or cap on the root, hoist it onto
  // child elements first so it survives as a per-element override rather than
  // being lost.
  inner = hoistRootAttr(
    inner,
    openMatch[0],
    "stroke-linejoin",
    DEFAULT_LINEJOIN
  );
  inner = hoistRootAttr(inner, openMatch[0], "stroke-linecap", DEFAULT_LINECAP);

  // Strip inherited presentation attributes from child elements
  inner = inner.replace(/<([a-zA-Z][\w-]*)\s+([^>]*?)\s*\/?>/g, (match) =>
    match.replace(INHERITED_ATTRS, "")
  );

  // Handle stroke-linejoin/stroke-linecap on children: drop the redundant
  // default, keep any deliberate override (bevel/round, square/round) and warn
  // so accidental exports are surfaced rather than silently shipped.
  inner = stripDefaultAttr(
    inner,
    CHILD_LINEJOIN,
    DEFAULT_LINEJOIN,
    "stroke-linejoin",
    label
  );
  inner = stripDefaultAttr(
    inner,
    CHILD_LINECAP,
    DEFAULT_LINECAP,
    "stroke-linecap",
    label
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
