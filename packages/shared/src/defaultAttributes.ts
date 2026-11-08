// One entry per icon set under `icons/<variant>/`. Only the default stroke set
// exists today; a rounded set would be added here with its own defaults.
export type Variant = "stroke";

const kebabToCamel = (s: string) =>
  s.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());

function toCamel<T extends Record<string, unknown>>(attrs: T) {
  return Object.fromEntries(
    Object.entries(attrs).map(([k, v]) => [kebabToCamel(k), v])
  );
}

// ── Stroke defaults ──────────────────────────────────────────────────

export const strokeDefaults = {
  xmlns: "http://www.w3.org/2000/svg",
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": 2,
  "stroke-linecap": "butt",
  "stroke-linejoin": "miter",
} as const;

export const strokeDefaultsCamel = toCamel(strokeDefaults) as {
  xmlns: string;
  width: number;
  height: number;
  viewBox: string;
  fill: string;
  stroke: string;
  strokeWidth: number;
  strokeLinecap: string;
  strokeLinejoin: string;
};

// ── Variant lookup ───────────────────────────────────────────────────

export const variantDefaults: Record<
  Variant,
  Record<string, string | number>
> = {
  stroke: strokeDefaults,
};

export const variantDefaultsCamel: Record<
  Variant,
  Record<string, string | number>
> = {
  stroke: strokeDefaultsCamel,
};

// Backward compat
const defaultAttributes = strokeDefaults;
export default defaultAttributes;
