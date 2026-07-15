// Spec checks for the icon set, mirroring the "Adding icons" guidelines. Each
// check turns one documented rule into an automated per-icon flag so the Lab can
// filter and badge non-conformant icons.

import {
  getIconMeta,
  getIconNode,
  getVariantsWithGeometry,
  ICON_NODE_NAMES,
} from "@/lib/icon-nodes";
import type { Variant } from "@/lib/icons";
import { marginReportFor } from "@/lib/margin";
import { flattenPieces, type IconNodeChild } from "@/lib/svg-path";

export type CheckId =
  | "margin"
  | "multiElement"
  | "forbiddenElements"
  | "offGrid"
  | "metadata";

export interface CheckDef {
  /** Tailwind accent used for the pill + badge dot. */
  accent: "rose" | "amber" | "violet" | "sky" | "orange";
  /** One-line explanation of the rule for tooltips/legend. */
  hint: string;
  id: CheckId;
  /** Short label for the filter pill. */
  label: string;
}

export const CHECKS: CheckDef[] = [
  {
    id: "margin",
    label: "Margin issues",
    hint: "Geometry crosses the 1px safe margin",
    accent: "rose",
  },
  {
    id: "multiElement",
    label: "Multi-element",
    hint: "Made of more than one top-level SVG element",
    accent: "amber",
  },
  {
    id: "forbiddenElements",
    label: "Non-flat (g/defs/mask)",
    hint: "Contains groups, defs, masks, or other non-flat elements",
    accent: "violet",
  },
  {
    id: "offGrid",
    label: "Off-grid / out of bounds",
    hint: "Coordinates fall outside the 0–24 viewBox",
    accent: "sky",
  },
  {
    id: "metadata",
    label: "Metadata issues",
    hint: "Missing required fields or invalid category",
    accent: "orange",
  },
];

// Elements the "keep geometry flat" rule forbids (no grouping/masking/refs).
const FORBIDDEN_TAGS = new Set([
  "g",
  "defs",
  "mask",
  "clippath",
  "use",
  "symbol",
  "image",
  "text",
  "filter",
]);

const VALID_CATEGORIES = new Set([
  "account",
  "actions",
  "arrows",
  "development",
  "charts",
  "communication",
  "design",
  "devices",
  "files",
  "layout",
  "media",
  "navigation",
  "security",
  "shapes",
  "social",
  "text",
  "time",
  "tools",
  "weather",
]);

const VIEW = 24;
const EPS = 0.01;

function hasForbiddenElement(node: IconNodeChild[]): boolean {
  return node.some(
    ([tag, , children]) =>
      FORBIDDEN_TAGS.has(tag.toLowerCase()) ||
      (children ? hasForbiddenElement(children) : false)
  );
}

/** True when any geometry coordinate falls outside the 0–24 viewBox. */
function isOffGrid(node: IconNodeChild[]): boolean {
  const pieces = flattenPieces(node);
  for (const piece of pieces) {
    for (const p of [...piece.parsed.anchors, ...piece.parsed.controls]) {
      if (p.x < -EPS || p.x > VIEW + EPS || p.y < -EPS || p.y > VIEW + EPS) {
        return true;
      }
    }
  }
  return false;
}

function hasMetadataIssue(name: string, variant: Variant): boolean {
  const meta = getIconMeta(name, variant);
  if (!meta) {
    return true; // sidecar missing entirely
  }
  const contributors = meta.contributors;
  const tags = meta.tags;
  const categories = meta.categories;
  if (!(Array.isArray(contributors) && contributors.length > 0)) {
    return true;
  }
  if (!(Array.isArray(tags) && tags.length > 0)) {
    return true;
  }
  if (!(Array.isArray(categories) && categories.length > 0)) {
    return true;
  }
  return categories.some(
    (c) => typeof c !== "string" || !VALID_CATEGORIES.has(c)
  );
}

/** Run all checks for one icon across its variants; returns the set that fail. */
export function checkIcon(name: string): Set<CheckId> {
  const failed = new Set<CheckId>();
  const variants = getVariantsWithGeometry(name);

  for (const variant of variants) {
    const node = getIconNode(name, variant);
    if (!node) {
      continue;
    }
    if (marginReportFor(name, variant).violates) {
      failed.add("margin");
    }
    if (node.length > 1) {
      failed.add("multiElement");
    }
    if (hasForbiddenElement(node)) {
      failed.add("forbiddenElements");
    }
    if (isOffGrid(node)) {
      failed.add("offGrid");
    }
    if (hasMetadataIssue(name, variant)) {
      failed.add("metadata");
    }
  }

  return failed;
}

// Memoized flag map: icon name → set of failing check ids. Built once per
// session so filtering/badging never recomputes geometry.
let flagCache: Map<string, Set<CheckId>> | null = null;

function buildFlags(): Map<string, Set<CheckId>> {
  if (flagCache) {
    return flagCache;
  }
  flagCache = new Map();
  for (const name of ICON_NODE_NAMES) {
    const failed = checkIcon(name);
    if (failed.size > 0) {
      flagCache.set(name, failed);
    }
  }
  return flagCache;
}

/** Failing checks for one icon (empty set if clean). */
export function getIconFlags(name: string): Set<CheckId> {
  return buildFlags().get(name) ?? new Set();
}

/** Count of icons failing each check, for filter pills and the health panel. */
export function getCheckCounts(): Record<CheckId, number> {
  const counts = {
    margin: 0,
    multiElement: 0,
    forbiddenElements: 0,
    offGrid: 0,
    metadata: 0,
  } as Record<CheckId, number>;
  for (const failed of buildFlags().values()) {
    for (const id of failed) {
      counts[id] += 1;
    }
  }
  return counts;
}
