import type { JeddIcon } from "@jedd-icons/react";
import * as StrokeLib from "@jedd-icons/react";
import * as FillLib from "@jedd-icons/react/fill";
import iconReleases from "generated/icon-releases.json";

export type Variant = "stroke" | "fill";

// Non-icon exports of the package that must be filtered out.
const RESERVED = new Set(["Icon", "createJeddIcon", "defaultAttributes"]);

function extractIcons(lib: Record<string, unknown>) {
  return Object.entries(lib)
    .filter(
      ([name, value]) =>
        !RESERVED.has(name) && typeof value === "object" && value !== null
    )
    .map(([name, Component]) => ({ name, Component: Component as JeddIcon }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Sorted icon list per variant. Single source of truth for the gallery,
 *  individual icon pages, and the sitemap. */
export const VARIANT_ICONS: Record<
  Variant,
  { name: string; Component: JeddIcon }[]
> = {
  stroke: extractIcons(StrokeLib as unknown as Record<string, unknown>),
  fill: extractIcons(FillLib as unknown as Record<string, unknown>),
};

/** Name → component lookup per variant. */
export const VARIANT_MAPS: Record<Variant, Record<string, JeddIcon>> = {
  stroke: Object.fromEntries(
    VARIANT_ICONS.stroke.map(({ name, Component }) => [name, Component])
  ),
  fill: Object.fromEntries(
    VARIANT_ICONS.fill.map(({ name, Component }) => [name, Component])
  ),
};

/** Every unique icon name across all variants — used to enumerate /icons/* routes. */
export const ALL_ICON_NAMES = Array.from(
  new Set([
    ...VARIANT_ICONS.stroke.map((i) => i.name),
    ...VARIANT_ICONS.fill.map((i) => i.name),
  ])
).sort((a, b) => a.localeCompare(b));

/** PascalCase component name → spaced words: "ChevronRight" → "Chevron Right". */
export function humanizeIconName(name: string) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
}

/** PascalCase component name → kebab-case source name: "ChevronRight" → "chevron-right". */
function pascalToKebab(name: string) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();
}

/** Which release an icon first appeared in (and was last changed in). */
export interface IconRelease {
  changedRelease: { version: string; date: string };
  createdRelease: { version: string; date: string };
  /** True when the icon exists in source but isn't in a tagged release yet. */
  unreleased?: boolean;
}

// Generated from git tag history by `pnpm gen-releases`. Keyed by kebab-case
// source name; values describe the icon's first/last release.
const releases = iconReleases as Record<string, IconRelease>;

/**
 * Release info for an icon by its PascalCase component name (e.g. "ChevronRight").
 * Returns null when no release metadata exists for the icon.
 */
export function getIconRelease(name: string): IconRelease | null {
  return releases[pascalToKebab(name)] ?? null;
}
