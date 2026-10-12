"use client";

import {
  createContext,
  createElement,
  type ReactNode,
  useContext,
  useMemo,
} from "react";
import type { IconProps } from "./types";

type JeddDefaults = Pick<
  IconProps,
  "absoluteStrokeWidth" | "color" | "size" | "strokeWidth"
>;

export interface JeddProviderProps extends JeddDefaults {
  children?: ReactNode;
}

const JeddContext = createContext<JeddDefaults>({});

/**
 * Sets default `size`, `color`, `strokeWidth` and `absoluteStrokeWidth` for
 * every icon below it. Props on an icon still win; a nested provider only
 * overrides the values it sets.
 */
export function JeddProvider({
  children,
  size,
  color,
  strokeWidth,
  absoluteStrokeWidth,
}: JeddProviderProps) {
  const parent = useContext(JeddContext);
  const value = useMemo(
    () => ({
      size: size ?? parent.size,
      color: color ?? parent.color,
      strokeWidth: strokeWidth ?? parent.strokeWidth,
      absoluteStrokeWidth: absoluteStrokeWidth ?? parent.absoluteStrokeWidth,
    }),
    [parent, size, color, strokeWidth, absoluteStrokeWidth]
  );

  return createElement(JeddContext.Provider, { value }, children);
}

export const useJeddContext = () => useContext(JeddContext);
