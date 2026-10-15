// Pure, side-effect-free SVG normalization for the source-of-truth icons. Kept
// separate from `clean-icons.ts` (the CLI entry) so these transforms can be
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
// per-element override and preserved.
export const DEFAULT_LINEJOIN = "miter";
export const CHILD_LINEJOIN = /\s+stroke-linejoin="([^"]*)"/g;

// Same contract for stroke-linecap. `butt` is the inherited default; `square`
// and `round` are deliberate overrides that must survive cleaning — dropping
// them collapses zero-length segments (dots) to nothing at render time.
export const DEFAULT_LINECAP = "butt";
export const CHILD_LINECAP = /\s+stroke-linecap="([^"]*)"/g;

// Design-tool layer names (Figma's "Include 'id' attribute"). Stripped because
// an icon rendered twice would put duplicate ids in the page; the source keeps
// structure through separate elements, not names.
const LAYER_IDS = /\s+id="[^"]*"/g;

// Design-tool bookkeeping such as Figma's `data-figma-trr`. Never rendered.
const DATA_ATTRS = /\s+data-[\w-]+="[^"]*"/g;

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
 * default; keeps any other value (a deliberate override, e.g. the square cap
 * that makes a dot visible).
 */
function stripDefaultAttr(
  inner: string,
  pattern: RegExp,
  defaultValue: string
): string {
  return inner.replace(pattern, (full, value: string) =>
    value === defaultValue ? "" : full
  );
}

// Dash patterns that draw a solid line anyway, so stripping them is harmless.
const NO_DASHES = new Set(["", "none", "0"]);

/**
 * What cleaning would drop from one element that changes how it renders, as
 * messages naming the element and the fix in the design tool.
 */
function elementDroppedFeatures(tag: string, attrs: string): string[] {
  const attr = (name: string) =>
    attrs.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];
  const id = attr("id");
  const element = id ? `<${tag} id="${id}">` : `<${tag}>`;
  const layer = id
    ? `the layer "${id}"`
    : `this ${tag === "g" ? "group" : "layer"}`;
  const dropped: string[] = [];

  const transform = attr("transform");
  if (tag === "g" && transform !== undefined) {
    dropped.push(
      `${element} has transform="${transform}". Cleaning unwraps groups and would drop it, so the shapes inside would ship without that rotation/move. Fix in the design tool: flatten ${layer} (⌘E) or reset its rotation/position, then re-export.`
    );
  }

  const dashes = attr("stroke-dasharray");
  if (dashes !== undefined && !NO_DASHES.has(dashes.trim())) {
    const root = tag === "svg";
    dropped.push(
      `${element} has stroke-dasharray="${dashes}"${root ? " (on the root, so every stroke)" : ""}. Icons can't use dash patterns, so cleaning would strip it and the dashed line would ship solid. Fix in the design tool: draw each dash of ${root ? "the icon" : layer} as its own stroke, then re-export.`
    );
  }
  return dropped;
}

/**
 * Describes what cleaning discards that changes how the icon renders, so it's
 * fixed in the design tool rather than silently shipping a different icon.
 * These can't be checked afterwards: the cleaned file no longer has them, so
 * `clean-icons` leaves an icon with any of them uncleaned. One message per
 * problem, naming its line, tag, layer (the exported `id`) and value.
 */
export function droppedFeatures(svg: string): string[] {
  // <defs> (clip paths) are export artifacts whose contents never render.
  const defs = [...svg.matchAll(/<defs\b[^>]*>[\s\S]*?<\/defs>/g)].map(
    (m) => [m.index, m.index + m[0].length] as const
  );
  return [...svg.matchAll(/<([a-zA-Z][\w:-]*)\b([^>]*)>/g)]
    .filter(
      (m) => !defs.some(([start, end]) => m.index >= start && m.index < end)
    )
    .flatMap((m) => {
      const line = svg.slice(0, m.index).split("\n").length;
      return elementDroppedFeatures(m[1], m[2]).map(
        (message) => `line ${line}: ${message}`
      );
    });
}

export function cleanSvg(svg: string, rootAttrs: string): string {
  const openMatch = svg.match(/^<svg[^>]*>/);
  if (!openMatch) {
    return svg;
  }
  const closeIdx = svg.lastIndexOf("</svg>");
  if (closeIdx === -1) {
    return svg;
  }

  let inner = svg.slice(openMatch[0].length, closeIdx);

  // Flatten export artifacts (defs/clip-path groups).
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

  // Strip inherited presentation attributes, layer ids and design-tool data
  // attributes from child elements
  inner = inner.replace(/<([a-zA-Z][\w-]*)\s+([^>]*?)\s*\/?>/g, (match) =>
    match
      .replace(INHERITED_ATTRS, "")
      .replace(LAYER_IDS, "")
      .replace(DATA_ATTRS, "")
  );

  // Handle stroke-linejoin/stroke-linecap on children: drop the redundant
  // default and keep any deliberate override (bevel/round, square/round).
  inner = stripDefaultAttr(inner, CHILD_LINEJOIN, DEFAULT_LINEJOIN);
  inner = stripDefaultAttr(inner, CHILD_LINECAP, DEFAULT_LINECAP);

  // Separate elements are kept as authored: they carry the designer's part
  // structure. The static packages merge them at build time (`mergePathNodes`).

  // Clean up any double spaces left behind
  inner = inner
    .replace(/ {2,}/g, " ")
    .replace(/ >/g, ">")
    .replace(/ \/>/g, "/>");

  // Collapse blank lines left by unwrapping so each element sits on its own
  // line with a single leading/trailing newline.
  inner = `\n${inner
    .replace(/>\s*</g, ">\n<")
    .replace(/[ \t]*\n\s*\n/g, "\n")
    .trim()}\n`;

  return `<svg ${rootAttrs}>${inner}</svg>\n`;
}
