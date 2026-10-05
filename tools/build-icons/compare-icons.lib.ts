// Pure geometry comparison between two versions of a source SVG, used to check
// that a re-exported icon still ships the same shape. Kept separate from
// `compare-icons.ts` (the CLI entry) so it can be unit-tested without git.
import {
  DEFAULT_VARIANT,
  type IconNode,
  mergePathNodes,
  parseSvg,
  stripInheritedAttrs,
} from "./build.lib";
import { cleanSvg, VARIANT_ROOT_ATTRS } from "./clean-svgs.lib";

export type Verdict =
  /** The packages ship byte-identical geometry. */
  | "identical"
  /** Same strokes, but reordered or with different number formatting. */
  | "same-geometry"
  /** At least one stroke was added, removed or redrawn. */
  | "changed";

export interface Comparison {
  /** Subpaths (or non-path elements) only present in the new version. */
  added: string[];
  /** Top-level element count before → after cleaning (source structure). */
  elements: [before: number, after: number];
  /** Subpaths (or non-path elements) only present in the old version. */
  removed: string[];
  verdict: Verdict;
}

/**
 * The icon node exactly as the static packages ship it. `clean` runs the
 * `clean-svgs` normalization first, for raw design-tool exports.
 */
function shipped(
  svg: string,
  variant: string,
  clean: boolean
): { node: IconNode; source: IconNode } {
  const cleaned = clean
    ? cleanSvg(svg, VARIANT_ROOT_ATTRS[variant] ?? "", variant)
    : svg;
  const source = stripInheritedAttrs(parseSvg(cleaned));
  const node = variant === DEFAULT_VARIANT ? mergePathNodes(source) : source;
  return { node, source };
}

const TOKEN = /[A-Za-z]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/g;

/** Re-serialize path data with rounded numbers so formatting can't differ. */
function normalizePathData(d: string): string {
  return (d.match(TOKEN) ?? [])
    .map((t) => (/[A-Za-z]/.test(t) ? t : String(Number(Number(t).toFixed(3)))))
    .join(" ")
    .replace(/ ?([A-Za-z]) ?/g, "$1");
}

/**
 * One key per stroke: each absolute-`M` subpath of every path, prefixed with
 * the element's other attributes (a square-capped dot differs from a butt one).
 * Non-path elements are keyed whole.
 */
function strokeKeys(node: IconNode): string[] {
  return node.flatMap(([tag, { d, ...rest }]) => {
    const attrs = Object.entries(rest)
      .sort()
      .map(([k, v]) => `${k}=${v}`)
      .join(" ");
    const prefix = attrs ? `[${attrs}] ` : "";
    if (tag !== "path" || typeof d !== "string") {
      return [`${prefix}<${tag}>`];
    }
    return normalizePathData(d)
      .split(/(?=M)/)
      .map((sub) => `${prefix}${sub}`);
  });
}

/** Multiset difference: items of `a` not matched one-for-one in `b`. */
function minus(a: string[], b: string[]): string[] {
  const pool = [...b];
  return a.filter((item) => {
    const i = pool.indexOf(item);
    if (i === -1) {
      return true;
    }
    pool.splice(i, 1);
    return false;
  });
}

/**
 * Compares a committed (already cleaned) source SVG with a new version, which
 * may be a raw export: it's cleaned in memory first.
 */
export function compareIcon(
  oldSvg: string,
  newSvg: string,
  variant: string
): Comparison {
  const before = shipped(oldSvg, variant, false);
  const after = shipped(newSvg, variant, true);
  const oldKeys = strokeKeys(before.node);
  const newKeys = strokeKeys(after.node);
  const added = minus(newKeys, oldKeys);
  const removed = minus(oldKeys, newKeys);

  let verdict: Verdict = "changed";
  if (JSON.stringify(before.node) === JSON.stringify(after.node)) {
    verdict = "identical";
  } else if (added.length === 0 && removed.length === 0) {
    verdict = "same-geometry";
  }

  return {
    verdict,
    added,
    removed,
    elements: [before.source.length, after.source.length],
  };
}
