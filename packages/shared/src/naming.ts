/**
 * `ArrowDownLeft` → `arrow-down-left`: the inverse of the build's
 * `kebabToPascal` (tested against every icon name in `tools/build-icons`).
 */
export const pascalToKebab = (s: string) =>
  s
    // A word starting after a lowercase letter or digit: `ArrowDown`.
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    // A single-letter word followed by another word: `UDown`.
    .replace(/([A-Z])(?=[A-Z])/g, "$1-")
    // A number after a word, but not inside one: `Layers2`, not the 2 in `2x2`.
    .replace(/(^|[^0-9])([a-zA-Z])(?=[0-9])/g, "$1$2-")
    .toLowerCase();
