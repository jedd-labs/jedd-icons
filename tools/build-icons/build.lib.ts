// Pure, side-effect-free transforms for the icon codegen. Kept separate from
// `build.ts` (the CLI entry) so they can be imported and unit-tested without
// triggering a filesystem run.
import { lineStyleRelevance, shapeToPathData } from "./geometry";
import { kebabToPascal } from "./naming";

export const DEFAULT_VARIANT = "stroke";

export type Target = "react" | "vanilla";

export type IconAttrs = Record<string, string | number>;
export type IconNodeChild = [
  tag: string,
  attrs: IconAttrs,
  children?: IconNodeChild[],
];
export type IconNode = IconNodeChild[];

export const kebabToCamel = (s: string) =>
  s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

// ── SVG Parser ────────────────────────────────────────────────────────

export function parseAttrs(attrsStr: string): IconAttrs {
  const attrs: IconAttrs = {};
  const attrRe = /([a-zA-Z:][\w:-]*)\s*=\s*"([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = attrRe.exec(attrsStr)) !== null) {
    attrs[m[1]] = m[2];
  }
  return attrs;
}

export function parseChildren(xml: string, pos: number): [IconNode, number] {
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

export function parseSvg(svg: string): IconNode {
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

export const INHERITED_ATTRS = new Set([
  "stroke",
  "fill",
  "stroke-width",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stroke-miterlimit",
  "stroke-opacity",
  "fill-opacity",
  "opacity",
]);

// stroke-linejoin/stroke-linecap are kept per element only when they override
// the root default. A dropped override changes rendering — notably, a zero-
// length "dot" segment paints nothing under the default `butt` cap.
export const DEFAULT_LINEJOIN = "miter";
export const DEFAULT_LINECAP = "butt";

const ATTR_DEFAULTS: Record<string, string> = {
  "stroke-linejoin": DEFAULT_LINEJOIN,
  "stroke-linecap": DEFAULT_LINECAP,
};

/** True when an attr should be dropped from a child (inherited from the root). */
export function isStripped(key: string, value: string | number): boolean {
  if (INHERITED_ATTRS.has(key)) {
    return true;
  }
  // A redundant default is stripped; a real override is kept.
  return key in ATTR_DEFAULTS && value === ATTR_DEFAULTS[key];
}

export function stripInheritedAttrs(nodes: IconNode): IconNode {
  return nodes.map(([tag, attrs, children]) => {
    const cleaned = Object.fromEntries(
      Object.entries(attrs).filter(([k, v]) => !isStripped(k, v))
    );
    if (children) {
      return [tag, cleaned, stripInheritedAttrs(children)];
    }
    return [tag, cleaned];
  });
}

export function toCamelAttrs(nodes: IconNode): IconNode {
  return nodes.map(([tag, attrs, children]) => {
    const camelAttrs = Object.fromEntries(
      Object.entries(attrs).map(([k, v]) => [
        k.includes("-") ? kebabToCamel(k) : k,
        v,
      ])
    );
    if (children) {
      return [tag, camelAttrs, toCamelAttrs(children)];
    }
    return [tag, camelAttrs];
  });
}

// Attributes that only describe a basic shape's geometry; once the shape is
// converted to path data they're replaced by `d`.
const SHAPE_ATTRS = new Set([
  "cx",
  "cy",
  "r",
  "rx",
  "ry",
  "x",
  "y",
  "width",
  "height",
  "x1",
  "y1",
  "x2",
  "y2",
  "points",
  "transform",
]);

/** A `<circle>`, `<rect>`, etc. as an equivalent `<path>`; others unchanged. */
function asPath(node: IconNodeChild): IconNodeChild {
  const [tag, attrs, children] = node;
  const d = children ? null : shapeToPathData(tag, attrs);
  if (d === null) {
    return node;
  }
  const rest = Object.entries(attrs).filter(([k]) => !SHAPE_ATTRS.has(k));
  return ["path", { d, ...Object.fromEntries(rest) }];
}

const LINE_STYLES = ["stroke-linecap", "stroke-linejoin"] as const;
type LineStyle = (typeof LINE_STYLES)[number];

/** A merged path being built, and the line styles its strokes require. */
interface MergeGroup {
  /** Every cap/join value the group's elements declare (defaults included). */
  declared: Record<LineStyle, Set<string>>;
  node: IconNodeChild;
  /** Attributes other than `d` and line styles; must match to merge. */
  other: string;
  /** Line style values that show on at least one stroke in the group. */
  requires: Partial<Record<LineStyle, string>>;
}

/** The cap/join values a path needs where they're visible (see relevance). */
function requiredLineStyles(
  d: string,
  attrs: IconAttrs
): MergeGroup["requires"] {
  const relevance = lineStyleRelevance(d);
  const requires: MergeGroup["requires"] = {};
  for (const key of LINE_STYLES) {
    if (relevance[key === "stroke-linecap" ? "cap" : "join"]) {
      requires[key] = String(attrs[key] ?? ATTR_DEFAULTS[key]);
    }
  }
  return requires;
}

const compatible = (a: MergeGroup["requires"], b: MergeGroup["requires"]) =>
  LINE_STYLES.every(
    (k) => a[k] === undefined || b[k] === undefined || a[k] === b[k]
  );

const isMergeablePath = ([tag, attrs, children]: IconNodeChild) =>
  tag === "path" &&
  !children &&
  typeof attrs.d === "string" &&
  attrs.d.trimStart().startsWith("M");

/**
 * Merges top-level elements into as few compound paths as possible, each
 * placed where its first element sat. Circles, rects and other basic shapes
 * are converted to path data first. Sources keep separate elements for their
 * part structure; the static packages ship the compact merged form, which also
 * paints overlapping strokes once (no darker joints with semi-transparent
 * colors). Stroke-only: for filled shapes, merging can turn overlaps into holes.
 *
 * Elements with different line caps/joins still merge when the difference
 * can't show: a join only matters at corners and a cap only on open ends, so a
 * circle without `stroke-linejoin="bevel"` merges with bevelled clock hands and
 * the merged path is bevelled. Where a value would show on both sides (two
 * cornered strokes, one bevel and one miter), they stay separate paths.
 *
 * `d`s are joined without a separator, so an icon re-exported unmerged from
 * the same geometry reproduces the design tool's merged path exactly. Paths
 * whose `d` doesn't start with an absolute `M` are left alone, since a
 * relative `m` would be offset by the path it's appended to.
 */
export function mergePathNodes(nodes: IconNode): IconNode {
  const merged: IconNode = [];
  const groups: MergeGroup[] = [];
  for (const node of nodes.map(asPath)) {
    if (!isMergeablePath(node)) {
      merged.push(node);
      continue;
    }
    const attrs = node[1];
    const d = String(attrs.d).trim();
    const other = JSON.stringify(
      Object.entries(attrs)
        .filter(
          ([k]) => k !== "d" && !(LINE_STYLES as readonly string[]).includes(k)
        )
        .sort()
    );
    const requires = requiredLineStyles(d, attrs);
    const group = groups.find(
      (g) => g.other === other && compatible(g.requires, requires)
    );
    const declare = (g: MergeGroup) => {
      for (const key of LINE_STYLES) {
        g.declared[key].add(String(attrs[key] ?? ATTR_DEFAULTS[key]));
      }
    };
    if (group) {
      group.node[1].d = `${group.node[1].d}${d}`;
      Object.assign(group.requires, requires);
      declare(group);
      continue;
    }
    const copy: IconNodeChild = ["path", { ...attrs, d }];
    const created: MergeGroup = {
      node: copy,
      other,
      requires: { ...requires },
      declared: { "stroke-linecap": new Set(), "stroke-linejoin": new Set() },
    };
    declare(created);
    groups.push(created);
    merged.push(copy);
  }
  // Set each merged path's cap/join to what its strokes require. A value that
  // shows nowhere is kept when its layers agree on it (so an unchanged icon
  // ships unchanged) and dropped otherwise.
  for (const { node, requires, declared } of groups) {
    for (const key of LINE_STYLES) {
      const value =
        requires[key] ??
        (declared[key].size === 1 ? [...declared[key]][0] : undefined);
      if (value === undefined || value === ATTR_DEFAULTS[key]) {
        delete node[1][key];
      } else {
        node[1][key] = value;
      }
    }
  }
  return merged;
}

// ── File renderers ───────────────────────────────────────────────────

export function renderReactIconFile(
  name: string,
  iconNode: IconNode,
  variant: string
): string {
  const componentName = kebabToPascal(name);
  const camelNode = toCamelAttrs(iconNode);
  const variantArg = variant === DEFAULT_VARIANT ? "" : `, "${variant}"`;
  return `import createJeddIcon from "../createJeddIcon"
import type { IconNode } from "../types"

const __iconNode: IconNode = ${JSON.stringify(camelNode)}

const ${componentName} = createJeddIcon("${name}", __iconNode${variantArg})

export default ${componentName}
export { __iconNode as ${componentName}Node }
`;
}

export function renderVanillaIconFile(
  name: string,
  iconNode: IconNode
): string {
  const pascalName = kebabToPascal(name);
  return `import type { IconNode } from "@jedd-icons/shared"

const ${pascalName}: IconNode = ${JSON.stringify(iconNode)}

export default ${pascalName}
export { ${pascalName} as ${pascalName}Node }
`;
}

export function indexExportLine(
  target: Target,
  componentName: string,
  name: string
): string {
  return target === "react"
    ? `export { default as ${componentName} } from "./${name}"`
    : `export { default as ${componentName}, ${componentName}Node } from "./${name}"`;
}
