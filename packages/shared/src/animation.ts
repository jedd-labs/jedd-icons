// The animation data format: what an icon's animation file
// (`animations/<variant>/<icon>.ts`) declares, what the codegen bakes into each
// animated icon, and what the runtime plays. Plain data only — no functions —
// so any runtime (React today, vanilla later) can play the same data.

type Value = string | number;

/** Values the runtime knows how to animate, beside the element's attributes. */
export interface AnimatableValues {
  /** Circle center and radius (`<circle>` only). */
  cx?: number;
  cy?: number;
  /** Path data (`<path>` only): keyframes need the source's command structure. */
  d?: string;
  opacity?: number;
  /** Fraction of the stroke drawn, 0–1 (Motion's `pathLength`). */
  pathLength?: number;
  pathOffset?: number;
  r?: number;
  /** Degrees. */
  rotate?: number;
  scale?: number;
  scaleX?: number;
  scaleY?: number;
  /** Translation in viewBox units (numbers) or relative to the target's box ("25%"). */
  x?: Value;
  y?: Value;
}

export type Keyframes = {
  [K in keyof AnimatableValues]?:
    | AnimatableValues[K]
    | readonly AnimatableValues[K][];
};

export type Easing =
  | "linear"
  | "easeIn"
  | "easeOut"
  | "easeInOut"
  | "circIn"
  | "circOut"
  | "circInOut"
  | "backIn"
  | "backOut"
  | "backInOut"
  | "anticipate"
  | readonly [number, number, number, number];

export interface Transition {
  /** Seconds before this target starts. */
  delay?: number;
  /** Seconds. */
  duration?: number;
  /** One easing, or one per keyframe segment. */
  ease?: Easing | readonly Easing[];
  /** Where each keyframe falls, 0–1, one per keyframe. */
  times?: readonly number[];
}

export interface PartAnimation {
  /** Keyframes to play. A single value animates from wherever the target is. */
  animate: Keyframes;
  /**
   * CSS `transform-origin` for rotate/scale, relative to the target's own
   * bounding box: "center" (default), "top center", "50% 0%"…
   */
  origin?: string;
  transition?: Transition;
}

/**
 * One animation: what each target does. A target is a source element by its
 * position in the SVG ("0", "1"…), a group from the icon's `groups`, `"icon"`
 * (all elements as one) or `"*"` (each element on its own).
 */
export type Animation = Record<string, PartAnimation>;

/** An icon's animations by name. */
export type Animations = Record<string, Animation>;

/** The format of an animation file, `animations/<variant>/<icon>.ts`. */
export interface IconAnimations {
  /**
   * The icon's animations, each named for the motion it shows ("nudge",
   * "spin"…; "default" and the preset names are reserved).
   */
  animations: Animations;
  /**
   * Which animation plays when none is picked: one of `animations` or a
   * preset. Without it, the icon plays the fallback (`draw` unless the
   * runtime is told otherwise).
   */
  default?: string;
  /**
   * Elements that move together, by position. Each group becomes a `<g>`
   * placed where its first element was.
   */
  groups?: Record<string, readonly number[]>;
}

/**
 * Animations every icon has, whatever its geometry. An icon's own animations
 * can't reuse these names, and an icon without its own `default` plays `draw`.
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
} satisfies Animations;

export type PresetName = keyof typeof presets;
