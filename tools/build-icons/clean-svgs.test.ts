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
  const label = "stroke/test.svg";

  it("strips inherited attrs from children and sets canonical stroke root", () => {
    const svg = `<svg foo="bar"><path d="M5 12h14" stroke="red" stroke-width="2"/></svg>`;
    const out = cleanSvg(svg, stroke, label);
    expect(out).toBe(`<svg ${stroke}>\n<path d="M5 12h14"/>\n</svg>\n`);
  });

  it("applies the fill variant root attrs", () => {
    const svg = `<svg><path d="M1 1" fill="red"/></svg>`;
    const out = cleanSvg(svg, fill, label);
    expect(out).toBe(`<svg ${fill}>\n<path d="M1 1"/>\n</svg>\n`);
  });

  it("drops a redundant default (miter) stroke-linejoin from a child", () => {
    const svg = `<svg><path d="M1 1" stroke-linejoin="miter"/></svg>`;
    const out = cleanSvg(svg, stroke, label);
    expect(out).toBe(`<svg ${stroke}>\n<path d="M1 1"/>\n</svg>\n`);
  });

  it("keeps a non-default (bevel) stroke-linejoin override on a child", () => {
    const svg = `<svg><path d="M1 1" stroke-linejoin="bevel"/></svg>`;
    const out = cleanSvg(svg, stroke, label);
    expect(out).toContain(`stroke-linejoin="bevel"`);
  });

  it("hoists a non-default root stroke-linejoin onto children before templating", () => {
    const svg = `<svg stroke-linejoin="round"><path d="M1 1"/></svg>`;
    const out = cleanSvg(svg, stroke, label);
    // The canonical root is miter; the round join survives as a child override.
    expect(out).toContain(`stroke-linejoin="round"`);
    expect(out).toContain(`<svg ${stroke}>`);
  });

  it("drops a redundant default (butt) stroke-linecap from a child", () => {
    const svg = `<svg><path d="M1 1" stroke-linecap="butt"/></svg>`;
    const out = cleanSvg(svg, stroke, label);
    expect(out).toBe(`<svg ${stroke}>\n<path d="M1 1"/>\n</svg>\n`);
  });

  it("keeps a non-default (square) stroke-linecap override on a child", () => {
    // Zero-length "dot" segments only render under a square/round cap; losing
    // the override makes them disappear entirely.
    const svg = `<svg><path d="M3 5H3.01" stroke-linecap="square"/></svg>`;
    const out = cleanSvg(svg, stroke, label);
    expect(out).toContain(`stroke-linecap="square"`);
  });

  it("hoists a non-default root stroke-linecap onto children before templating", () => {
    const svg = `<svg stroke-linecap="round"><path d="M1 1"/></svg>`;
    const out = cleanSvg(svg, stroke, label);
    // The canonical root is butt; the round cap survives as a child override.
    expect(out).toContain(`stroke-linecap="round"`);
    expect(out).toContain(`<svg ${stroke}>`);
  });

  it("does not merge paths when one carries a linecap override", () => {
    // Merging keeps only `d`, so it must bail rather than drop the override.
    const svg = `<svg><path d="M3 5H3.01" stroke-linecap="square"/><path d="M8 5H21"/></svg>`;
    const out = cleanSvg(svg, stroke, label);
    expect(out).toContain(`stroke-linecap="square"`);
    expect(out.match(/<path/g)).toHaveLength(2);
  });

  it("is idempotent", () => {
    const svg = `<svg foo="bar"><path d="M5 12h14" stroke="red"/></svg>`;
    const once = cleanSvg(svg, stroke, label);
    expect(cleanSvg(once, stroke, label)).toBe(once);
  });

  it("returns the input unchanged when there is no <svg> wrapper", () => {
    const input = "<div>nope</div>";
    expect(cleanSvg(input, stroke, label)).toBe(input);
  });
});
