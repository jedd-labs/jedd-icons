import { getIconNode } from "@/lib/icon-nodes";
import type { Variant } from "@/lib/icons";
import {
  type BBox,
  boundingBox,
  flattenPieces,
  type IconPiece,
} from "@/lib/svg-path";

/** The icon canvas is 24×24 and artwork must keep a 1px margin on every side. */
const VIEW = 24;
const MARGIN = 1;
/** Coordinates within this of the boundary count as touching, not crossing. */
const EPS = 0.01;

export interface MarginReport {
  bbox: BBox | null;
  /** Per-side overflow amounts in user units (0 when within margin). */
  sides: { left: number; top: number; right: number; bottom: number };
  /** True when geometry crosses outside the 1px safe box on any side. */
  violates: boolean;
  /** The single largest overflow across all sides, in user units. */
  worst: number;
}

const CLEAN: MarginReport = {
  bbox: null,
  violates: false,
  sides: { left: 0, top: 0, right: 0, bottom: 0 },
  worst: 0,
};

/** Measure how far an icon's geometry overflows the 1px safe margin. */
export function marginReport(pieces: IconPiece[]): MarginReport {
  const bbox = boundingBox(pieces);
  if (!bbox) {
    return CLEAN;
  }

  const sides = {
    left: Math.max(0, MARGIN - bbox.minX),
    top: Math.max(0, MARGIN - bbox.minY),
    right: Math.max(0, bbox.maxX - (VIEW - MARGIN)),
    bottom: Math.max(0, bbox.maxY - (VIEW - MARGIN)),
  };
  const worst = Math.max(sides.left, sides.top, sides.right, sides.bottom);

  return { bbox, violates: worst > EPS, sides, worst };
}

/** Convenience: report for an icon looked up by name + variant. */
export function marginReportFor(name: string, variant: Variant): MarginReport {
  const node = getIconNode(name, variant);
  return node ? marginReport(flattenPieces(node)) : CLEAN;
}
