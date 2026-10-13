import type { Animation } from "./animation-types";

/**
 * Animations every icon has, whatever its geometry. An icon's own animations
 * (from `animations/<variant>/<icon>.ts`) take precedence over these by name,
 * and an icon without its own `default` plays `draw`.
 */
export const presets = {
  /** Draws each stroke in. */
  draw: {
    "*": {
      animate: { pathLength: [0, 1] },
      transition: { duration: 0.8, ease: "easeInOut" },
    },
  },
  /** Undraws each stroke and draws it back, ending as it started. */
  "draw-loop": {
    "*": {
      animate: { pathLength: [1, 0.05, 1] },
      transition: { duration: 1.6, ease: "easeInOut" },
    },
  },
  pulse: {
    icon: {
      animate: { scale: [1, 0.85, 1.08, 1] },
      transition: { duration: 0.6, ease: "easeInOut" },
    },
  },
  wiggle: {
    icon: {
      animate: { rotate: [0, -12, 10, -6, 4, 0] },
      transition: { duration: 0.7, ease: "easeInOut" },
    },
  },
} satisfies Record<string, Animation>;

export type PresetName = keyof typeof presets;
