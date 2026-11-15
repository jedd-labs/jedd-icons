// Pure SVG normalization for the source icons, separate from the
// `clean-icons.ts` CLI so it can be unit-tested.
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
};

// Presentation attributes stripped from child elements (inherited from the
// root). Line join/cap aren't here: a non-default one is kept per element.
export const INHERITED_ATTRS =
  /\s+(?:stroke|fill|stroke-width|stroke-dasharray|stroke-dashoffset|stroke-miterlimit|stroke-opacity|fill-opacity|opacity|class)="[^"]*"/g;

// A child join/cap equal to the root's default is stripped; any other value is
// a deliberate override (a square cap is what makes a zero-length dot visible).
export const DEFAULT_LINEJOIN = "miter";
export const CHILD_LINEJOIN = /\s+stroke-linejoin="([^"]*)"/g;
export const DEFAULT_LINECAP = "butt";
export const CHILD_LINECAP = /\s+stroke-linecap="([^"]*)"/g;

// Design-tool layer names (Figma's "Include 'id' attribute"). Stripped because
// an icon rendered twice would put duplicate ids in the page; the source keeps
// structure through separate elements, not names.
const LAYER_IDS = /\s+id="[^"]*"/g;

// Design-tool bookkeeping such as Figma's `data-figma-trr`. Never rendered.
const DATA_ATTRS = /\s+data-[\w-]+="[^"]*"/g;

/**
 * Flattens design-tool export artifacts: drops `<defs>` blocks and unwraps
 * `<g>` groups (e.g. `clip-path` wrappers), hoisting their children. Idempotent.
 */
export function unwrapGroups(inner: string): string {
  let out = inner;
  out = out.replace(/<defs\b[^>]*>[\s\S]*?<\/defs>/g, "");
  // Unwraps innermost groups, repeatedly to handle nesting.
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

  inner = unwrapGroups(inner);

  // The root is replaced by the canonical one: keep a non-default join/cap
  // declared on it by moving it onto the children.
  inner = hoistRootAttr(
    inner,
    openMatch[0],
    "stroke-linejoin",
    DEFAULT_LINEJOIN
  );
  inner = hoistRootAttr(inner, openMatch[0], "stroke-linecap", DEFAULT_LINECAP);

  inner = inner.replace(/<([a-zA-Z][\w-]*)\s+([^>]*?)\s*\/?>/g, (match) =>
    match
      .replace(INHERITED_ATTRS, "")
      .replace(LAYER_IDS, "")
      .replace(DATA_ATTRS, "")
  );

  inner = stripDefaultAttr(inner, CHILD_LINEJOIN, DEFAULT_LINEJOIN);
  inner = stripDefaultAttr(inner, CHILD_LINECAP, DEFAULT_LINECAP);

  // Elements stay separate, as authored; the static build merges them.

  inner = inner
    .replace(/ {2,}/g, " ")
    .replace(/ >/g, ">")
    .replace(/ \/>/g, "/>");

  // One element per line.
  inner = `\n${inner
    .replace(/>\s*</g, ">\n<")
    .replace(/[ \t]*\n\s*\n/g, "\n")
    .trim()}\n`;

  return `<svg ${rootAttrs}>${inner}</svg>\n`;
}
