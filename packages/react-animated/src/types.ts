import type { ForwardRefExoticComponent, RefAttributes, SVGProps } from "react";
import type { PresetName } from "./presets";

export type { IconNode, IconNodeChild } from "@jedd-icons/shared";
export type {
  AnimatableValues,
  Animation,
  Animations,
  Easing,
  Keyframes,
  PartAnimation,
  Transition,
} from "./animation-types";
export type { PresetName } from "./presets";

/** The styling props, as in `@jedd-icons/react`. */
export interface IconProps extends Omit<SVGProps<SVGSVGElement>, "ref"> {
  absoluteStrokeWidth?: boolean;
  color?: string;
  size?: number | string;
  strokeWidth?: number | string;
}

/** What starts an animation. A string trigger also picks which animation plays. */
export interface AnimationTriggers<N extends string = string> {
  /** Plays while true (controlled). */
  animate?: boolean | N;
  /** Plays while hovered. */
  animateOnHover?: boolean | N;
  /** Plays once per press, to the end. */
  animateOnTap?: boolean | N;
  /** Plays while in the viewport. */
  animateOnView?: boolean | N;
  /** IntersectionObserver root margin, e.g. "0px 0px -20% 0px". */
  animateOnViewMargin?: string;
  /** Plays the first time it's in view only. Default true. */
  animateOnViewOnce?: boolean;
  /** Which animation plays. Default "default". */
  animation?: N;
}

/** How an animation plays over time. */
export interface AnimationOptions {
  /** Finish the current run before returning to rest when stopped. */
  completeOnStop?: boolean;
  /** Milliseconds before it starts. */
  delay?: number;
  /** Snap back to rest, without a transition, when a run ends. */
  initialOnAnimateEnd?: boolean;
  /** Repeat while active. */
  loop?: boolean;
  /** Milliseconds between loops. */
  loopDelay?: number;
  /** Stay where the animation ended instead of returning to rest when stopped. */
  persistOnAnimateEnd?: boolean;
}

export interface AnimatedIconProps<N extends string = string>
  extends IconProps,
    AnimationTriggers<N>,
    AnimationOptions {}

/**
 * An icon's animation names, suggested by the editor. Any other string is
 * accepted too (it plays `default`), so every icon fits `AnimatedJeddIcon` —
 * e.g. in an array of icons or an `icon` prop.
 */
export type AnimationName<N extends string> =
  | N
  | "default"
  | PresetName
  | (string & Record<never, never>);

export type AnimatedJeddIcon<N extends string = string> =
  ForwardRefExoticComponent<
    AnimatedIconProps<AnimationName<N>> & RefAttributes<SVGSVGElement>
  > & {
    /** Every animation this icon can play: its own, then the presets. */
    readonly animations: readonly AnimationName<N>[];
  };
