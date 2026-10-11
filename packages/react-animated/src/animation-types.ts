// The animation data format, shared by the runtime, the generated icon files
// and the hand-written animation files in `animations/` (re-exported from
// `animations/types.ts`). Import-free and plain data only — no functions — so
// the codegen can copy it verbatim into each icon and a future vanilla runtime
// can play the same data.

export type Value = string | number;

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

/** An icon's animations by name. `default` is what plays unless one is picked. */
export type Animations = Record<string, Animation>;
