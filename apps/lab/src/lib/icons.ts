// Minimal subset of the docs app's icon helpers that the Lab actually needs.
// The Lab is geometry-only, so it doesn't pull in the component maps.

import type { Variant } from "@jedd-icons/shared";

export type { Variant } from "@jedd-icons/shared";

/** Every icon set, in canonical order (the default stroke set first). */
export const VARIANTS: readonly Variant[] = ["stroke"];

/** PascalCase / kebab name → spaced words: "ChevronRight" → "Chevron Right". */
export function humanizeIconName(name: string): string {
  return name
    .replace(/[-_]/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
}
