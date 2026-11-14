// The selected icon, variant, list filters and mode live in the URL
// (`?icon=clock-9&variant=rounded&check=margin&animated=1&mode=motion`), so a
// reload keeps them and a link opens the Lab on the same icon and view.

import { CHECKS, type CheckId } from "@/lib/checks";
import { ICON_NODE_NAMES } from "@/lib/icon-nodes";
import { VARIANTS, type Variant } from "@/lib/icons";

/** What the Lab's centre shows: the x-ray canvas or the animated stage. */
const MODES = ["geometry", "motion"] as const;

export type Mode = (typeof MODES)[number];

export interface Selection {
  /** Only list icons with an animation file. */
  animated: boolean;
  checks: Set<CheckId>;
  icon: string;
  mode: Mode;
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
    variant: VARIANTS.find((v) => v === params.get("variant")) ?? "stroke",
    checks: new Set(params.getAll("check").filter(isCheckId)),
    animated: params.has("animated"),
    mode: MODES.find((m) => m === params.get("mode")) ?? "geometry",
  };
}

/** Mirror the selection into the URL without adding a history entry. */
export function writeSelection({
  icon,
  variant,
  checks,
  animated,
  mode,
}: Selection) {
  const params = new URLSearchParams({ icon });
  if (variant !== "stroke") {
    params.set("variant", variant);
  }
  for (const id of checks) {
    params.append("check", id);
  }
  if (animated) {
    params.set("animated", "1");
  }
  if (mode !== "geometry") {
    params.set("mode", mode);
  }
  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}?${params}${window.location.hash}`
  );
}
