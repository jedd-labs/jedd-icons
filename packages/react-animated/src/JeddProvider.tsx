"use client";

import {
  createContext,
  createElement,
  type ReactNode,
  useContext,
  useMemo,
} from "react";
import type { AnimationOptions, IconProps, PresetName } from "./types";

/**
 * Whether to animate for visitors who ask their OS for reduced motion:
 * `"user"` follows that setting, `"always"` never animates (reduce always),
 * `"never"` always animates. The values match Motion's `MotionConfig`.
 */
export type ReducedMotion = "user" | "always" | "never";

type JeddDefaults = Pick<
  IconProps,
  "absoluteStrokeWidth" | "color" | "size" | "strokeWidth"
> &
  AnimationOptions & {
    /**
     * What `default` plays for icons that don't declare their own: a preset
     * (`draw`, `draw-loop`, `pulse`, `wiggle`), or a name some icons have
     * (those that don't play `draw`). Built-in: `draw`.
     */
    fallbackAnimation?: PresetName | (string & Record<never, never>);
    reducedMotion?: ReducedMotion;
  };

export interface JeddProviderProps extends JeddDefaults {
  children?: ReactNode;
}

const JeddContext = createContext<JeddDefaults>({});

/**
 * Sets defaults for every animated icon below it: the styling props of
 * `@jedd-icons/react`'s `JeddProvider` (`size`, `color`, `strokeWidth`,
 * `absoluteStrokeWidth`), the animation options, `fallbackAnimation` and
 * `reducedMotion`. Props on an icon (or an `<AnimateIcon>` around it) still
 * win; a nested provider only overrides the values it sets.
 */
export function JeddProvider({
  children,
  size,
  color,
  strokeWidth,
  absoluteStrokeWidth,
  completeOnStop,
  delay,
  initialOnAnimateEnd,
  loop,
  loopDelay,
  persistOnAnimateEnd,
  fallbackAnimation,
  reducedMotion,
}: JeddProviderProps) {
  const parent = useContext(JeddContext);
  const value = useMemo(
    () => ({
      size: size ?? parent.size,
      color: color ?? parent.color,
      strokeWidth: strokeWidth ?? parent.strokeWidth,
      absoluteStrokeWidth: absoluteStrokeWidth ?? parent.absoluteStrokeWidth,
      completeOnStop: completeOnStop ?? parent.completeOnStop,
      delay: delay ?? parent.delay,
      initialOnAnimateEnd: initialOnAnimateEnd ?? parent.initialOnAnimateEnd,
      loop: loop ?? parent.loop,
      loopDelay: loopDelay ?? parent.loopDelay,
      persistOnAnimateEnd: persistOnAnimateEnd ?? parent.persistOnAnimateEnd,
      fallbackAnimation: fallbackAnimation ?? parent.fallbackAnimation,
      reducedMotion: reducedMotion ?? parent.reducedMotion,
    }),
    [
      parent,
      size,
      color,
      strokeWidth,
      absoluteStrokeWidth,
      completeOnStop,
      delay,
      initialOnAnimateEnd,
      loop,
      loopDelay,
      persistOnAnimateEnd,
      fallbackAnimation,
      reducedMotion,
    ]
  );

  return createElement(JeddContext.Provider, { value }, children);
}

export const useJeddContext = () => useContext(JeddContext);
