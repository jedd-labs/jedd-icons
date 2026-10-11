// The selected icon, variant and check filters live in the URL
// (`?icon=clock-9&variant=fill&check=margin`), so a reload keeps them and a
// link opens the Lab on the same icon.

import { CHECKS, type CheckId } from "@/lib/checks";
import { ICON_NODE_NAMES } from "@/lib/icon-nodes";
import type { Variant } from "@/lib/icons";

export interface Selection {
  checks: Set<CheckId>;
  icon: string;
  variant: Variant;
}

const CHECK_IDS = new Set<string>(CHECKS.map((c) => c.id));

function isCheckId(id: string): id is CheckId {
  return CHECK_IDS.has(id);
}

/** The selection in the current URL; unknown values fall back to defaults. */
export function readSelection(fallbackIcon: string): Selection {
  const params = new URLSearchParams(window.location.search);
  const icon = params.get("icon");
  return {
    icon: icon && ICON_NODE_NAMES.includes(icon) ? icon : fallbackIcon,
    variant: params.get("variant") === "fill" ? "fill" : "stroke",
    checks: new Set(params.getAll("check").filter(isCheckId)),
  };
}

/** Mirror the selection into the URL without adding a history entry. */
export function writeSelection({ icon, variant, checks }: Selection) {
  const params = new URLSearchParams({ icon });
  if (variant !== "stroke") {
    params.set("variant", variant);
  }
  for (const id of checks) {
    params.append("check", id);
  }
  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}?${params}${window.location.hash}`
  );
}
