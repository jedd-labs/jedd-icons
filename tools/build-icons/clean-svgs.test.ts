import { describe, expect, it, vi } from "vitest";
import { cleanSvg, unwrapGroups, VARIANT_ROOT_ATTRS } from "./clean-svgs.lib";

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

  it("keeps separate paths as authored (merging happens at build time)", () => {
    const svg = `<svg><path d="M1 1H5"/><path d="M8 5H21"/></svg>`;
    const out = cleanSvg(svg, stroke, label);
    expect(out).toBe(
      `<svg ${stroke}>\n<path d="M1 1H5"/>\n<path d="M8 5H21"/>\n</svg>\n`
    );
  });

  it("strips layer ids and the frame group from a Figma export", () => {
    const svg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<g id="file_cog">
<path id="document" d="M14 2H4V22" stroke="black" stroke-width="2"/>
<path id="gear" d="M16 15H14" stroke="black" stroke-width="2"/>
</g>
</svg>`;
    const out = cleanSvg(svg, stroke, label);
    expect(out).toBe(
      `<svg ${stroke}>\n<path d="M14 2H4V22"/>\n<path d="M16 15H14"/>\n</svg>\n`
    );
  });

  it("strips design-tool data attributes", () => {
    const svg = `<svg><path d="M1 1" data-figma-trr="r6u6-0f"/></svg>`;
    expect(cleanSvg(svg, stroke, label)).toBe(
      `<svg ${stroke}>\n<path d="M1 1"/>\n</svg>\n`
    );
  });

  it("warns about <use>, transforms and dashes, which can't be kept", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    cleanSvg(
      `<svg><g transform="rotate(90)"><path d="M1 1" stroke-dasharray="4 2"/></g><use href="#a"/></svg>`,
      stroke,
      label
    );
    const messages = warn.mock.calls.map(([m]) => String(m)).join("\n");
    expect(messages).toContain("unsupported <use>");
    expect(messages).toContain("transform");
    expect(messages).toContain("stroke-dasharray");
    warn.mockRestore();
  });

  it("warns only when layers can't merge into one path", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    // A bevelled circle merges with plain hands: the circle has no corners.
    cleanSvg(
      `<svg><circle cx="12" cy="12" r="9"/><path d="M12 7V12H16" stroke-linejoin="bevel"/></svg>`,
      stroke,
      label
    );
    expect(warn).not.toHaveBeenCalled();
    // Two cornered strokes, one round and one miter, can't.
    cleanSvg(
      `<svg><path d="M3 3H21V21" stroke-linejoin="round"/><path d="M12 7V12H16"/></svg>`,
      stroke,
      label
    );
    expect(warn).toHaveBeenCalledOnce();
    expect(String(warn.mock.calls[0][0])).toContain(
      "ships as 2 paths, not one"
    );
    warn.mockRestore();
  });

  it("warns about dots too short to render in Safari", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    cleanSvg(
      `<svg><path d="M12 8V12M12 16V16.0001M11 20V20.01M10 21V21.08" stroke-linecap="square"/></svg>`,
      stroke,
      label
    );
    expect(warn).toHaveBeenCalledOnce();
    expect(String(warn.mock.calls[0][0])).toContain(
      "dot at (12, 16) is only 0.0001 long"
    );
    warn.mockRestore();
  });

  it("doesn't warn about the clip-path frame Figma wraps exports in", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    cleanSvg(
      `<svg><g clip-path="url(#c)"><path d="M1 1"/></g><defs><clipPath id="c"><rect width="24" height="24"/></clipPath></defs></svg>`,
      stroke,
      label
    );
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
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
