import { variantDefaults } from "@jedd-icons/shared";
import { getIconNode } from "@/lib/icon-nodes";
import type { Variant } from "@/lib/icons";
import type { IconNodeChild } from "@/lib/svg-path";

// Reconstructs the SVG a consumer actually renders: the shipped IconNode
// geometry wrapped in the root <svg> attributes from @jedd-icons/shared's
// variantDefaults — the exact two things the npm package ships. This is NOT the
// repo source file (that's the authoring input); it's the runtime output.

// SVG attributes that stay camelCase in markup (most are kebab-case, these
// aren't). Anything else with an interior capital is kebab-cased.
const CAMEL_SVG_ATTRS = new Set([
  "viewBox",
  "preserveAspectRatio",
  "gradientUnits",
  "gradientTransform",
  "clipPathUnits",
  "patternUnits",
  "patternContentUnits",
]);

function attrName(k: string): string {
  if (CAMEL_SVG_ATTRS.has(k)) {
    return k;
  }
  return k.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

function serializeAttrs(attrs: Record<string, string | number>): string {
  return Object.entries(attrs)
    .map(([k, v]) => `${attrName(k)}="${v}"`)
    .join(" ");
}

function serializeNode(node: IconNodeChild[], indent: string): string {
  return node
    .map(([tag, attrs, children]) => {
      const attrStr = serializeAttrs(attrs);
      const open = attrStr ? `<${tag} ${attrStr}` : `<${tag}`;
      if (children && children.length > 0) {
        return `${indent}${open}>\n${serializeNode(children, `${indent}  `)}\n${indent}</${tag}>`;
      }
      return `${indent}${open}/>`;
    })
    .join("\n");
}

/**
 * The shipped SVG markup for an icon+variant, or null when it has no geometry.
 * Root attrs come from the shared variant defaults (what the runtime applies),
 * children from the shipped tuples.
 */
export function buildShippedSvg(name: string, variant: Variant): string | null {
  const node = getIconNode(name, variant);
  if (!node) {
    return null;
  }
  const root = serializeAttrs(variantDefaults[variant]);
  const body = serializeNode(node, "  ");
  return `<svg ${root}>\n${body}\n</svg>`;
}
