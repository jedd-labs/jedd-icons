// Pure, side-effect-free transforms for the icon codegen. Kept separate from
// `build.ts` (the CLI entry) so they can be imported and unit-tested without
// triggering a filesystem run.
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
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stroke-miterlimit",
  "stroke-opacity",
  "fill-opacity",
  "opacity",
]);

export function stripInheritedAttrs(nodes: IconNode): IconNode {
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
