// The rules `icons:check` reports issues under, with a short label and hint
// for each, and the shapes of what it reports. No imports, so the Lab can
// import this too: it shows the issues `gen-icon-nodes` computed with these
// rules instead of re-implementing them.
export const RULES = {
  "not-normalized": {
    label: "Not cleaned",
    hint: "The source SVG isn't normalized yet — run `pnpm icons:clean`, or first fix what it reports in the design tool",
  },
  unsupported: {
    label: "Unsupported elements",
    hint: "Groups, <use>, masks or other elements that aren't flat geometry",
  },
  transform: {
    label: "Transforms",
    hint: "A transform the design tool should bake into the coordinates",
  },
  margin: {
    label: "Margin",
    hint: "Geometry crosses the 1px safe margin, or leaves the 24×24 viewBox",
  },
  "short-dot": {
    label: "Dots too short",
    hint: "Dots too short for Safari to draw once merged into one path",
  },
  unmergeable: {
    label: "Several paths",
    hint: "Layers need different line caps/joins, so they ship as more than one path",
  },
  metadata: {
    label: "Metadata",
    hint: "The sidecar .json is missing or doesn't match icon.schema.json",
  },
} as const;

export type Rule = keyof typeof RULES;

export interface Issue {
  message: string;
  /** Which rule found it, so the Lab can group and filter issues. */
  rule: Rule;
  /** Errors fail `icons:check`; warnings flag something that may be intended. */
  severity: "error" | "warning";
}

export interface MarginReport {
  /** Bounding box of the geometry's centerline, or null when nothing draws. */
  bbox: { minX: number; minY: number; maxX: number; maxY: number } | null;
  /** How far the geometry crosses the margin on each side (0 when inside). */
  sides: { left: number; top: number; right: number; bottom: number };
  /** True when it crosses the margin by more than a rounding error. */
  violates: boolean;
  /** The largest of `sides`. */
  worst: number;
}
