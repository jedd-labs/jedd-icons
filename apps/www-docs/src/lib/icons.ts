import type { JeddIcon, Variant } from "@jedd-icons/react";
import * as StrokeLib from "@jedd-icons/react";
import iconCategories from "generated/icon-categories.json";
import iconContributors from "generated/icon-contributors.json";
import iconReleases from "generated/icon-releases.json";
import iconTags from "generated/icon-tags.json";

export type { Variant } from "@jedd-icons/react";

/** Every icon set, in canonical order (the default stroke set first). */
export const VARIANTS: readonly Variant[] = ["stroke"];

function extractIcons(lib: Record<string, unknown>) {
  // Icons are forwardRef objects; this drops the package's other runtime
  // export, `JeddProvider` (a function).
  return Object.entries(lib)
    .filter(([, value]) => typeof value === "object" && value !== null)
    .map(([name, Component]) => ({ name, Component: Component as JeddIcon }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Sorted icon list per variant. */
export const VARIANT_ICONS: Record<
  Variant,
  { name: string; Component: JeddIcon }[]
> = {
  stroke: extractIcons(StrokeLib as unknown as Record<string, unknown>),
};

/** Name → component lookup per variant. */
export const VARIANT_MAPS: Record<Variant, Record<string, JeddIcon>> = {
  stroke: Object.fromEntries(
    VARIANT_ICONS.stroke.map(({ name, Component }) => [name, Component])
  ),
};

/** Every unique icon name across the variants — used to enumerate /icons/* routes. */
export const ALL_ICON_NAMES = Array.from(
  new Set(VARIANTS.flatMap((v) => VARIANT_ICONS[v].map((i) => i.name)))
).sort((a, b) => a.localeCompare(b));

/** Variants an icon exists in, in canonical order. */
export function getAvailableVariants(name: string): Variant[] {
  return VARIANTS.filter((v) => name in VARIANT_MAPS[v]);
}

/** PascalCase component name → spaced words: "ChevronRight" → "Chevron Right". */
export function humanizeIconName(name: string) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
}

export interface IconRelease {
  changedRelease: { version: string; date: string };
  createdRelease: { version: string; date: string };
  /** True when the icon exists in source but isn't in a tagged release yet. */
  unreleased?: boolean;
}

// Generated from git tag history by `pnpm gen-releases`. Keyed by PascalCase
// component name; values describe the icon's first/last release.
const releases = iconReleases as Record<string, IconRelease>;

/**
 * Release info for an icon by its PascalCase component name (e.g. "ChevronRight").
 * Returns null when no release metadata exists for the icon.
 */
export function getIconRelease(name: string): IconRelease | null {
  return releases[name] ?? null;
}

// Generated from the icon `.json` sidecars by `pnpm gen-contributors`. Keyed by
// PascalCase component name → variant → ordered, de-duplicated GitHub usernames.
const contributors = iconContributors as Record<
  string,
  Partial<Record<Variant, string[]>>
>;

/**
 * GitHub usernames who contributed a specific variant of an icon
 */
export function getIconContributors(name: string, variant: Variant): string[] {
  return contributors[name]?.[variant] ?? [];
}

// Generated from the icon `.json` sidecars by `pnpm gen-categories`. Categories
// are a closed enum (see icon.schema.json). `byIcon` maps a PascalCase component
// name → its categories; `byCategory` is the inverted category → names index.
const iconCategoriesData = iconCategories as {
  byCategory: Record<string, string[]>;
  byIcon: Record<string, string[]>;
};
const categoriesByIcon = iconCategoriesData.byIcon;

export function getIconCategories(name: string): string[] {
  return categoriesByIcon[name] ?? [];
}

/** Every category with at least one icon, sorted, with its icon count. */
export const CATEGORIES: { count: number; name: string }[] = Object.entries(
  iconCategoriesData.byCategory
)
  .map(([name, names]) => ({ name, count: names.length }))
  .sort((a, b) => a.name.localeCompare(b.name));

// Generated from the icon `.json` sidecars by `pnpm gen-tags`. Free-text search
// keywords, keyed by PascalCase component name, plus an inverted tag → names index.
const iconTagsData = iconTags as {
  byIcon: Record<string, string[]>;
  byTag: Record<string, string[]>;
};

export function getIconTags(name: string): string[] {
  return iconTagsData.byIcon[name] ?? [];
}

export function humanizeCategory(category: string): string {
  return category
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export interface SnippetOptions {
  absolute: boolean;
  color: string | null;
  name: string;
  size: number;
  strokeWidth: number;
  variant: Variant;
}

export function buildReactSnippet({
  name,
  variant,
  size,
  strokeWidth,
  absolute,
  color,
}: SnippetOptions): string {
  if (!name) {
    return "";
  }

  const importPath =
    variant === "stroke" ? "@jedd-icons/react" : `@jedd-icons/react/${variant}`;
  const importLine = `import { ${name} } from "${importPath}"`;
  const colorProp = color ? ` color="${color}"` : "";
  const absoluteProp = absolute ? " absoluteStrokeWidth" : "";
  return `${importLine}\n\n<${name} size={${size}} strokeWidth={${strokeWidth}}${absoluteProp}${colorProp} />`;
}

/** Vanilla (`@jedd-icons/core`) usage snippet using the `createElement` helper. */
export function buildVanillaSnippet({
  name,
  variant,
  size,
  strokeWidth,
  absolute,
  color,
}: SnippetOptions): string {
  if (!name) {
    return "";
  }

  // The core (vanilla) package exposes each icon as plain data plus a
  // `createElement(iconData, options)` helper. Other variants' icons live on
  // `/core/<variant>`, but `createElement` always comes from the root.
  const importLine =
    variant === "stroke"
      ? `import { ${name}, createElement } from "@jedd-icons/core"`
      : `import { createElement } from "@jedd-icons/core"\nimport { ${name} } from "@jedd-icons/core/${variant}"`;

  const options: string[] = [`size: ${size}`, `strokeWidth: ${strokeWidth}`];
  if (absolute) {
    options.push("absoluteStrokeWidth: true");
  }
  if (color) {
    options.push(`color: "${color}"`);
  }

  const optionsBlock = options.map((o) => `  ${o},`).join("\n");
  return `${importLine}\n\nconst svg = createElement(${name}, {\n${optionsBlock}\n})\n\ndocument.body.appendChild(svg)`;
}
