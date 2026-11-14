// The `@jedd-icons/react-animated` components, as the Lab looks them up: by
// kebab name + variant, like `PackageRender` does for `@jedd-icons/react`.

import * as StrokeLib from "@jedd-icons/react-animated";
import { type AnimatedJeddIcon, presets } from "@jedd-icons/react-animated";
import { getPascalName, ICON_NODE_NAMES } from "@/lib/icon-nodes";
import type { Variant } from "@/lib/icons";

// One entry point per variant.
const LIBS: Record<Variant, Record<string, unknown>> = {
  stroke: StrokeLib as unknown as Record<string, unknown>,
};

/** The animated component for an icon name + variant, or null. */
export function getAnimatedComponent(
  name: string,
  variant: Variant
): AnimatedJeddIcon | null {
  const pascal = getPascalName(name, variant);
  return ((pascal ? LIBS[variant][pascal] : undefined) ??
    null) as AnimatedJeddIcon | null;
}

/** The icon's own animations, from its animation file: not `default` or a preset. */
export function ownAnimations(component: AnimatedJeddIcon): string[] {
  return component.animations.filter((a) => a !== "default" && !(a in presets));
}

// Icons with an animation file: their own animations, or a declared default.
// Built once per session, like the check flags.
let animatedCache: Set<string> | null = null;

/** True when the icon has an animation file, so it moves beyond the presets. */
export function isAnimated(name: string): boolean {
  animatedCache ??= new Set(
    ICON_NODE_NAMES.filter((n) => {
      const component = getAnimatedComponent(n, "stroke");
      return (
        component !== null &&
        (ownAnimations(component).length > 0 ||
          component.defaultAnimation !== undefined)
      );
    })
  );
  return animatedCache.has(name);
}
