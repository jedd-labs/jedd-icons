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
import {
  elementSubpaths,
  segmentDistance,
  segmentFromKey,
  segmentKeys,
  strokeKey,
} from "./geometry";

export type Verdict =
  /** The packages ship byte-identical geometry. */
  | "identical"
  /**
   * Every stroke is the same, but written differently: reordered, drawn in the
   * other direction, starting at another corner, a `<circle>` instead of its
   * path form, or different number formatting. Renders the same.
   */
  | "same-geometry"
  /**
   * The same segments, but split into strokes differently (e.g. two lines that
   * meet now drawn as one stroke with a corner). Can change how that meeting
   * point renders; usually invisible.
   */
  | "restructured"
  /** At least one segment was added, removed or moved. */
  | "changed";

export interface Comparison {
  /** Segments only present in the new version. */
  added: string[];
  /** Top-level element count before → after cleaning (source structure). */
  elements: [before: number, after: number];
  /**
   * For "changed": how far (px) the furthest-moved segment shifted, when every
   * removed segment has a moved counterpart of the same kind. Null when
   * segments were added, removed, or changed between line and curve.
   */
  maxShift: number | null;
  /** Segments only present in the old version. */
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

interface Keys {
  segments: string[];
  strokes: string[];
}

/** Stroke- and segment-level keys for every element of an icon. */
function geometryKeys(node: IconNode): Keys {
  const strokes: string[] = [];
  const unreadable: string[] = [];
  const items: Parameters<typeof segmentKeys>[0] = [];
  for (const [tag, attrs] of node) {
    const subpaths = elementSubpaths(tag, attrs);
    if (!subpaths) {
      // Not geometry the comparison understands (e.g. a leftover <use>):
      // keep it visible as its own "stroke" so it can't pass silently.
      unreadable.push(`<${tag} ${JSON.stringify(attrs)}>`);
      continue;
    }
    const style = {
      cap: attrs["stroke-linecap"] as string | undefined,
      join: attrs["stroke-linejoin"] as string | undefined,
    };
    for (const subpath of subpaths) {
      strokes.push(strokeKey(subpath, style));
      items.push({ subpath, style });
    }
  }
  return {
    strokes: [...strokes, ...unreadable],
    segments: [...segmentKeys(items), ...unreadable],
  };
}

const SHIFT_TOLERANCE = 0.02;

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

const sameMultiset = (a: string[], b: string[]) =>
  a.length === b.length && minus(a, b).length === 0;

/** Largest distance from a removed segment to its nearest added one. */
function maxShift(removed: string[], added: string[]): number | null {
  const unreadable = [...removed, ...added].some((k) => k.startsWith("<"));
  if (removed.length === 0 || removed.length !== added.length || unreadable) {
    return null;
  }
  // Only segments with the same style (cap) can count as "moved".
  const styleOf = (key: string) => key.match(/^\[[^\]]*\] /)?.[0] ?? "";
  const shift = Math.max(
    ...removed.map((key) => {
      const seg = segmentFromKey(key);
      return Math.min(
        ...added.map((a) =>
          styleOf(a) === styleOf(key)
            ? segmentDistance(seg, segmentFromKey(a))
            : Number.POSITIVE_INFINITY
        )
      );
    })
  );
  return Number.isFinite(shift) ? shift : null;
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
  const elements: Comparison["elements"] = [
    before.source.length,
    after.source.length,
  ];
  const none = { added: [], removed: [], maxShift: null, elements };

  if (JSON.stringify(before.node) === JSON.stringify(after.node)) {
    return { verdict: "identical", ...none };
  }
  const oldKeys = geometryKeys(before.node);
  const newKeys = geometryKeys(after.node);
  if (sameMultiset(oldKeys.strokes, newKeys.strokes)) {
    return { verdict: "same-geometry", ...none };
  }
  const added = minus(newKeys.segments, oldKeys.segments);
  const removed = minus(oldKeys.segments, newKeys.segments);
  if (added.length === 0 && removed.length === 0) {
    return { verdict: "restructured", ...none };
  }
  const shift = maxShift(removed, added);
  // Differences below this are rounding in the export (e.g. a curve's control
  // point at 9.97 vs 9.98), not a design change.
  if (shift !== null && shift < SHIFT_TOLERANCE) {
    return { verdict: "same-geometry", ...none };
  }
  return { verdict: "changed", added, removed, maxShift: shift, elements };
}
