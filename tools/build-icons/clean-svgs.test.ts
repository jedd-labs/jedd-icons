import { describe, expect, it } from "vitest";
import {
  cleanSvg,
  mergePaths,
  unwrapGroups,
  VARIANT_ROOT_ATTRS,
} from "./clean-svgs.lib";

describe("unwrapGroups", () => {
  it("drops <defs> blocks", () => {
    const inner = `<defs><clipPath id="c"><rect/></clipPath></defs><path d="M1 1"/>`;
    expect(unwrapGroups(inner)).toBe(`<path d="M1 1"/>`);
  });

  it("unwraps a group, hoisting its children", () => {
    const inner = `<g clip-path="url(#c)"><path d="M1 1"/></g>`;
    expect(unwrapGroups(inner)).toBe(`<path d="M1 1"/>`);
  });

  it("unwraps nested groups", () => {
    const inner = `<g><g><path d="M1 1"/></g></g>`;
    expect(unwrapGroups(inner)).toBe(`<path d="M1 1"/>`);
  });

  it("is idempotent", () => {
    const inner = `<g><path d="M1 1"/></g>`;
    const once = unwrapGroups(inner);
    expect(unwrapGroups(once)).toBe(once);
  });
});

describe("mergePaths", () => {
  it("merges sibling <path> d attributes into one", () => {
    const inner = `<path d="M1 1"/><path d="M2 2"/>`;
    expect(mergePaths(inner)).toBe(`\n<path d="M1 1 M2 2"/>\n`);
  });

  it("bails when a non-path element is present", () => {
    const inner = `<path d="M1 1"/><circle cx="1" cy="1" r="1"/>`;
    expect(mergePaths(inner)).toBe(inner);
  });

  it("bails when there is fewer than one mergeable pair", () => {
    const inner = `<path d="M1 1"/>`;
    expect(mergePaths(inner)).toBe(inner);
  });
});

describe("cleanSvg", () => {
  const stroke = VARIANT_ROOT_ATTRS.stroke;
  const fill = VARIANT_ROOT_ATTRS.fill;

  it("strips inherited attrs from children and sets canonical stroke root", () => {
    const svg = `<svg foo="bar"><path d="M5 12h14" stroke="red" stroke-width="2"/></svg>`;
    const out = cleanSvg(svg, stroke);
    expect(out).toBe(`<svg ${stroke}>\n<path d="M5 12h14"/>\n</svg>\n`);
  });

  it("applies the fill variant root attrs", () => {
    const svg = `<svg><path d="M1 1" fill="red"/></svg>`;
    const out = cleanSvg(svg, fill);
    expect(out).toBe(`<svg ${fill}>\n<path d="M1 1"/>\n</svg>\n`);
  });

  it("is idempotent", () => {
    const svg = `<svg foo="bar"><path d="M5 12h14" stroke="red"/></svg>`;
    const once = cleanSvg(svg, stroke);
    expect(cleanSvg(once, stroke)).toBe(once);
  });

  it("returns the input unchanged when there is no <svg> wrapper", () => {
    const input = "<div>nope</div>";
    expect(cleanSvg(input, stroke)).toBe(input);
  });
});
