// Pure, side-effect-free SVG normalization for the source-of-truth icons. Kept
// separate from `clean-svgs.ts` (the CLI entry) so these transforms can be
// imported and unit-tested without walking the filesystem.
import { mergePathNodes, parseSvg, stripInheritedAttrs } from "./build.lib";
import { findDots } from "./geometry";

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

// The only elements a source icon may contain once cleaned.
const GEOMETRY_TAGS = new Set([
  "path",
  "circle",
  "rect",
  "line",
  "polygon",
  "polyline",
  "ellipse",
]);

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
 * Warns about export features the pipeline can't keep, so they're fixed in the
 * design tool instead of silently shipping a different icon.
 */
function warnUnsupported(raw: string, label: string): void {
  // <defs> (clip paths) and <g> wrappers are export artifacts that get removed.
  const inner = raw.replace(/<defs\b[^>]*>[\s\S]*?<\/defs>/g, "");
  const tags = new Set(
    [...inner.matchAll(/<([a-zA-Z][\w:-]*)\b/g)].map((m) => m[1])
  );
  const unsupported = [...tags].filter(
    (t) => t !== "g" && !GEOMETRY_TAGS.has(t)
  );
  if (unsupported.length > 0) {
    console.warn(
      `[clean-svgs] ${label}: unsupported <${unsupported.join(">, <")}> — flatten it in the design tool (e.g. a Repeat exports as <use>); it won't render as designed`
    );
  }
  if (/\stransform="/.test(inner)) {
    console.warn(
      `[clean-svgs] ${label}: transform="…" found — reset the rotation/position in the design tool (or flatten the shape) so the exported coordinates are final`
    );
  }
  if (/\sstroke-dasharray="/.test(inner)) {
    console.warn(
      `[clean-svgs] ${label}: stroke-dasharray is stripped, so dashes will render as a solid line — draw the dashes as separate strokes`
    );
  }
}

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

/**
 * Warns when the static build couldn't merge an icon into one path: some
 * layers need a different line cap or join where it shows (e.g. two cornered
 * strokes, one bevelled and one not). Uses the build's own merge, so the
 * warning matches what ships.
 */
function warnUnmergeable(svg: string, label: string): void {
  const paths = mergePathNodes(stripInheritedAttrs(parseSvg(svg)));
  if (paths.length < 2) {
    return;
  }
  const describe = ([, attrs]: (typeof paths)[number]) =>
    `${attrs["stroke-linecap"] ?? DEFAULT_LINECAP} cap + ${attrs["stroke-linejoin"] ?? DEFAULT_LINEJOIN} join`;
  console.warn(
    `[clean-svgs] ${label}: ships as ${paths.length} paths, not one — layers need different line styles where they show (${paths.map(describe).join(" / ")}); make them match in the design tool if that's not intended`
  );
}

// Dots shorter than this are flagged. Tested in desktop Safari, merged into
// one path with other strokes: 0.0001 is dropped, 0.001 and longer render
// (the icons' 0.01–0.0156 dots included). 0.005 leaves a 5× margin.
const MIN_DOT_LENGTH = 0.005;

// Dot length to aim for in the design tool, as in search-alert (0.0805).
const RECOMMENDED_DOT_LENGTH = 0.08;

/**
 * Warns about dots (tiny square/round-capped strokes) too short to render
 * reliably. Safari drops them once they're merged into one path with the rest
 * of the icon, which the static build does; Chrome draws them. Fixed in the
 * design tool by making the dot longer, which still looks square.
 */
function warnShortDots(svg: string, label: string): void {
  const f = (v: number) => String(Number(v.toFixed(4)));
  for (const [tag, attrs] of stripInheritedAttrs(parseSvg(svg))) {
    for (const { at, length } of findDots(tag, attrs, MIN_DOT_LENGTH)) {
      console.warn(
        `[clean-svgs] ${label}: dot at (${f(at[0])}, ${f(at[1])}) is only ${f(length)} long — Safari drops dots this short once merged; make it about ${RECOMMENDED_DOT_LENGTH} long in the design tool`
      );
    }
  }
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

  // Flag export features the pipeline can't keep (checked before unwrapping,
  // which would silently drop a group's transform), then flatten export
  // artifacts (defs/clip-path groups).
  warnUnsupported(inner, label);
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

  const cleaned = `<svg ${rootAttrs}>${inner}</svg>\n`;
  if (rootAttrs === VARIANT_ROOT_ATTRS.stroke) {
    warnUnmergeable(cleaned, label);
    warnShortDots(cleaned, label);
  }
  return cleaned;
}
