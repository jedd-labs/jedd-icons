// Read-only checks for the source icons: everything that can be verified on a
// committed SVG and affects what the packages ship. Kept separate from
// `check-icons.ts` (the CLI entry) so the rules can be unit-tested without
// walking the filesystem.
import {
  DEFAULT_VARIANT,
  mergePathNodes,
  parseSvg,
  stripInheritedAttrs,
} from "./build.lib";
import {
  cleanSvg,
  DEFAULT_LINECAP,
  DEFAULT_LINEJOIN,
  droppedFeatures,
  VARIANT_ROOT_ATTRS,
} from "./clean-icons.lib";
import { findDots } from "./geometry";

export interface Issue {
  message: string;
  /** Errors fail `icons:check`; warnings flag something that may be intended. */
  severity: "error" | "warning";
}

// The only elements a source icon may contain once cleaned.
const GEOMETRY_TAGS = new Set([
  "svg",
  "path",
  "circle",
  "rect",
  "line",
  "polygon",
  "polyline",
  "ellipse",
]);

/**
 * Export features that survive cleaning but won't render as designed, so
 * they're fixed in the design tool.
 */
function unsupportedFeatures(svg: string): Issue[] {
  const tags = new Set(
    [...svg.matchAll(/<([a-zA-Z][\w:-]*)\b/g)].map((m) => m[1])
  );
  const unsupported = [...tags].filter((t) => !GEOMETRY_TAGS.has(t));
  const issues: Issue[] = [];
  if (unsupported.length > 0) {
    issues.push({
      severity: "error",
      message: `unsupported <${unsupported.join(">, <")}> — flatten it in the design tool (e.g. a Repeat exports as <use>); it won't render as designed`,
    });
  }
  if (/\stransform="/.test(svg)) {
    issues.push({
      severity: "error",
      message:
        'transform="…" found — reset the rotation/position in the design tool (or flatten the shape) so the exported coordinates are final',
    });
  }
  return issues;
}

/**
 * Flags an icon the static build can't merge into one path: some layers need
 * a different line cap or join where it shows (e.g. two cornered strokes, one
 * bevelled and one not). Uses the build's own merge, so it matches what ships.
 * A warning, since it can be intended.
 */
function unmergeable(svg: string): Issue[] {
  const paths = mergePathNodes(stripInheritedAttrs(parseSvg(svg)));
  if (paths.length < 2) {
    return [];
  }
  const describe = ([, attrs]: (typeof paths)[number]) =>
    `${attrs["stroke-linecap"] ?? DEFAULT_LINECAP} cap + ${attrs["stroke-linejoin"] ?? DEFAULT_LINEJOIN} join`;
  return [
    {
      severity: "warning",
      message: `ships as ${paths.length} paths, not one — layers need different line styles where they show (${paths.map(describe).join(" / ")}); make them match in the design tool if that's not intended`,
    },
  ];
}

// Dots shorter than this are flagged. Tested in desktop Safari, merged into
// one path with other strokes: 0.0001 is dropped, 0.001 and longer render
// (the icons' 0.01–0.0156 dots included). 0.005 leaves a 5× margin.
const MIN_DOT_LENGTH = 0.005;

// Dot length to aim for in the design tool, as in search-alert (0.0805).
const RECOMMENDED_DOT_LENGTH = 0.08;

/**
 * Flags dots (tiny square/round-capped strokes) too short to render reliably.
 * Safari drops them once they're merged into one path with the rest of the
 * icon, which the static build does; Chrome draws them. Fixed in the design
 * tool by making the dot longer, which still looks square.
 */
function shortDots(svg: string): Issue[] {
  const f = (v: number) => String(Number(v.toFixed(4)));
  return stripInheritedAttrs(parseSvg(svg)).flatMap(([tag, attrs]) =>
    findDots(tag, attrs, MIN_DOT_LENGTH).map(({ at, length }) => ({
      severity: "error" as const,
      message: `dot at (${f(at[0])}, ${f(at[1])}) is only ${f(length)} long — Safari drops dots this short once merged; make it about ${RECOMMENDED_DOT_LENGTH} long in the design tool`,
    }))
  );
}

/**
 * Checks one source SVG of a known variant. An icon that isn't normalized yet
 * is an error, and the rest is checked on the icon as cleaning would leave it,
 * i.e. on what the packages ship.
 */
export function checkIcon(svg: string, variant: string): Issue[] {
  const rootAttrs = VARIANT_ROOT_ATTRS[variant];
  if (!rootAttrs) {
    throw new Error(`unknown variant "${variant}"`);
  }
  const issues: Issue[] = [];
  const cleaned = cleanSvg(svg, rootAttrs);
  if (cleaned !== svg) {
    issues.push(
      { severity: "error", message: "not normalized — run `pnpm icons:clean`" },
      ...droppedFeatures(svg).map((message) => ({
        severity: "error" as const,
        message,
      }))
    );
  }
  issues.push(...unsupportedFeatures(cleaned));
  if (variant === DEFAULT_VARIANT) {
    issues.push(...unmergeable(cleaned), ...shortDots(cleaned));
  }
  return issues;
}
