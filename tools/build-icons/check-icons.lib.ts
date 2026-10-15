// Read-only checks for the source icons: everything that can be verified on a
// committed SVG and its sidecar `.json`. Kept separate from `check-icons.ts`
// (the CLI entry) so the rules can be unit-tested without walking the
// filesystem. The Lab shows the same issues: `gen-icon-nodes` runs these
// checks and writes the results into its data.
import Ajv, { type ErrorObject } from "ajv";
import iconSchema from "../../icon.schema.json";
import {
  DEFAULT_VARIANT,
  type IconNode,
  mergePathNodes,
  parseSvg,
  stripInheritedAttrs,
} from "./build.lib";
import type { Issue, MarginReport } from "./check-rules";
import {
  cleanSvg,
  DEFAULT_LINECAP,
  DEFAULT_LINEJOIN,
  droppedFeatures,
  VARIANT_ROOT_ATTRS,
} from "./clean-icons.lib";
import { boundingBox, elementSubpaths, findDots } from "./geometry";

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
      rule: "unsupported",
      severity: "error",
      message: `unsupported <${unsupported.join(">, <")}> — flatten it in the design tool (e.g. a Repeat exports as <use>); it won't render as designed`,
    });
  }
  if (/\stransform="/.test(svg)) {
    issues.push({
      rule: "transform",
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
      rule: "unmergeable",
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
      rule: "short-dot" as const,
      severity: "error" as const,
      message: `dot at (${f(at[0])}, ${f(at[1])}) is only ${f(length)} long — Safari drops dots this short once merged; make it about ${RECOMMENDED_DOT_LENGTH} long in the design tool`,
    }))
  );
}

// The icon canvas is 24×24 and artwork keeps a 1px margin on every side.
const VIEW = 24;
const MARGIN = 1;
// Geometry within this of a boundary counts as touching it, not crossing it.
const EPS = 0.01;

/**
 * Measures how far an icon's geometry crosses the 1px safe margin, on the
 * stroke's centerline. Transforms are applied, so it measures what renders.
 */
export function marginReport(nodes: IconNode): MarginReport {
  const bbox = boundingBox(
    nodes.flatMap(([tag, attrs]) => elementSubpaths(tag, attrs) ?? [])
  );
  if (!bbox) {
    return {
      bbox,
      sides: { left: 0, top: 0, right: 0, bottom: 0 },
      violates: false,
      worst: 0,
    };
  }
  const sides = {
    left: Math.max(0, MARGIN - bbox.minX),
    top: Math.max(0, MARGIN - bbox.minY),
    right: Math.max(0, bbox.maxX - (VIEW - MARGIN)),
    bottom: Math.max(0, bbox.maxY - (VIEW - MARGIN)),
  };
  const worst = Math.max(...Object.values(sides));
  return { bbox, sides, violates: worst > EPS, worst };
}

const round = (v: number) => String(Number(v.toFixed(2)));

/** Flags geometry that crosses the 1px margin, or leaves the viewBox. */
function marginIssues(nodes: IconNode): Issue[] {
  const { sides, violates, worst } = marginReport(nodes);
  if (!violates) {
    return [];
  }
  const crossed = Object.entries(sides)
    .filter(([, v]) => v > EPS)
    .map(([side, v]) => `${side} ${round(v)}`)
    .join(", ");
  const outside = worst > MARGIN + EPS ? " and leaves the 24×24 viewBox" : "";
  return [
    {
      rule: "margin",
      severity: "error",
      message: `geometry crosses the 1px margin (${crossed})${outside} — keep it within 1–23 in the design tool`,
    },
  ];
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
    const dropped = droppedFeatures(svg);
    issues.push(
      {
        rule: "not-normalized",
        severity: "error",
        message:
          dropped.length > 0
            ? "not normalized, and `pnpm icons:clean` leaves it as exported until what's below is fixed in the design tool (cleaning would change how it looks)"
            : "not normalized — run `pnpm icons:clean`",
      },
      ...dropped.map((message) => ({
        rule: "not-normalized" as const,
        severity: "error" as const,
        message,
      }))
    );
  }
  issues.push(...unsupportedFeatures(cleaned));
  try {
    issues.push(...marginIssues(stripInheritedAttrs(parseSvg(cleaned))));
    if (variant === DEFAULT_VARIANT) {
      issues.push(...unmergeable(cleaned), ...shortDots(cleaned));
    }
  } catch (error) {
    // e.g. path data using arcs, which the build's geometry doesn't read.
    issues.push({
      rule: "unsupported",
      severity: "error",
      message: `can't read the geometry: ${(error as Error).message}`,
    });
  }
  return issues;
}

const validateMeta = new Ajv({ allErrors: true, verbose: true }).compile(
  iconSchema
);

/** `/aliases/0/name` → `aliases[0].name` */
const fieldName = (instancePath: string) =>
  instancePath
    .replace(/\/(\d+)/g, "[$1]")
    .replaceAll("/", ".")
    .replace(/^\./, "");

function describeSchemaError({
  instancePath,
  keyword,
  params,
  message,
  data,
}: ErrorObject): string {
  const field = fieldName(instancePath);
  const at = field ? `${field}: ` : "";
  switch (keyword) {
    case "required":
      return `${at}missing required field "${params.missingProperty}"`;
    case "additionalProperties":
      return `${at}unknown field "${params.additionalProperty}"`;
    case "enum":
      return `${at}${JSON.stringify(data)} isn't one of the allowed values`;
    case "minItems":
      return params.limit === 1 ? `${field} is empty` : `${field} ${message}`;
    default:
      return `${field || "metadata"} ${message}`;
  }
}

/**
 * Checks an icon's sidecar `.json` (its text, or undefined when the file is
 * missing) against `icon.schema.json`.
 */
export function checkMetadata(json: string | undefined): Issue[] {
  const issue = (message: string): Issue => ({
    rule: "metadata",
    severity: "error",
    message,
  });
  if (json === undefined) {
    return [issue("sidecar .json is missing")];
  }
  let meta: unknown;
  try {
    meta = JSON.parse(json);
  } catch (error) {
    return [
      issue(`sidecar .json isn't valid JSON: ${(error as Error).message}`),
    ];
  }
  if (validateMeta(meta)) {
    return [];
  }
  return (validateMeta.errors ?? []).map((e) => issue(describeSchemaError(e)));
}
