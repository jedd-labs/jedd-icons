// The format of an animation file, `animations/<variant>/<icon>.ts`: motion
// only, for the icon drawn in `icons/<variant>/<icon>.svg`. The codegen
// (`tools/build-icons/build-animated.ts`) checks it against the SVG and bakes it
// into `@jedd-icons/react-animated`. Plain data: no functions, no imports beside
// these types.

import type { Animation } from "../packages/react-animated/src/animation-types";

export interface IconAnimations {
  /**
   * The icon's animations by name; `default` plays unless another is picked.
   * Targets are source elements by position ("0" is the SVG's first element),
   * a group below, `"icon"` (all elements as one) or `"*"` (each on its own).
   */
  animations: Record<string, Animation>;
  /**
   * Elements that move together, by position. Each group becomes a `<g>`
   * placed where its first element was.
   */
  groups?: Record<string, readonly number[]>;
}
