// The format of an animation file, `animations/<variant>/<icon>.ts`: motion
// only, for the icon drawn in `icons/<variant>/<icon>.svg`. `pnpm icons:check`
// checks it against the SVG and the animated codegen
// (`tools/build-icons/build-animated.ts`) bakes it into
// `@jedd-icons/react-animated`. Plain data: no functions, no imports beside
// this type.
//
// Elements are targeted by their position in the cleaned SVG ("0" is the first
// element), so re-exporting an animated icon must keep its elements in order:
// `pnpm icons:compare` flags animated icons whose elements moved.

export type { IconAnimations } from "../packages/shared/src/animation";
