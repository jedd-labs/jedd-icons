// The icon checks, as the Lab shows them. The rules themselves live in
// tools/build-icons (`pnpm icons:check`): `gen-icon-nodes` runs them and writes
// each icon's issues into the Lab's data, so the Lab only groups and badges
// them and can't drift from what CI enforces.

import {
  getIconIssues,
  getVariantsWithGeometry,
  ICON_NODE_NAMES,
} from "@/lib/icon-nodes";
import {
  type Issue,
  RULES,
  type Rule,
} from "../../../../tools/build-icons/check-rules";

export type CheckId = Rule;

export type Accent =
  | "sky"
  | "violet"
  | "indigo"
  | "rose"
  | "amber"
  | "teal"
  | "orange";

export interface CheckDef {
  /** Tailwind accent used for the pill + badge dot. */
  accent: Accent;
  /** One-line explanation of the rule for tooltips/legend. */
  hint: string;
  id: CheckId;
  /** Short label for the filter pill. */
  label: string;
}

// Typed by rule, so adding a rule to `icons:check` fails the Lab's typecheck
// until it gets an accent here.
const ACCENTS: Record<Rule, Accent> = {
  "not-normalized": "sky",
  unsupported: "violet",
  transform: "indigo",
  margin: "rose",
  "short-dot": "amber",
  unmergeable: "teal",
  metadata: "orange",
};

export const CHECKS: CheckDef[] = (Object.keys(RULES) as Rule[]).map((id) => ({
  id,
  ...RULES[id],
  accent: ACCENTS[id],
}));

/** Every rule an icon fails, across its variants. */
function failedRules(name: string): Set<CheckId> {
  return new Set(
    getVariantsWithGeometry(name).flatMap((variant) =>
      getIconIssues(name, variant).map((issue: Issue) => issue.rule)
    )
  );
}

// Memoized flag map: icon name → set of failing check ids. Built once per
// session so filtering/badging never re-walks the issues.
let flagCache: Map<string, Set<CheckId>> | null = null;

function buildFlags(): Map<string, Set<CheckId>> {
  if (flagCache) {
    return flagCache;
  }
  flagCache = new Map();
  for (const name of ICON_NODE_NAMES) {
    const failed = failedRules(name);
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
  const counts = Object.fromEntries(CHECKS.map((c) => [c.id, 0])) as Record<
    CheckId,
    number
  >;
  for (const failed of buildFlags().values()) {
    for (const id of failed) {
      counts[id] += 1;
    }
  }
  return counts;
}
