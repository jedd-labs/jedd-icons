import { describe, expect, it } from "vitest";
import { checkIcon } from "./check-icons.lib";
import { cleanSvg, VARIANT_ROOT_ATTRS } from "./clean-icons.lib";

const stroke = (inner: string) =>
  cleanSvg(`<svg>${inner}</svg>`, VARIANT_ROOT_ATTRS.stroke);

const messages = (svg: string, variant = "stroke") =>
  checkIcon(svg, variant).map((i) => `${i.severity}: ${i.message}`);

describe("checkIcon", () => {
  it("passes a clean icon", () => {
    expect(checkIcon(stroke(`<path d="M5 12h14"/>`), "stroke")).toEqual([]);
  });

  it("flags an icon that isn't normalized yet", () => {
    expect(messages(`<svg><path d="M5 12h14" stroke="red"/></svg>`)).toEqual([
      "error: not normalized — run `pnpm icons:clean`",
    ]);
  });

  it("explains what cleaning would drop from an uncleaned icon", () => {
    const out = messages(
      `<svg><g transform="rotate(90)"><path d="M1 1" stroke-dasharray="4 2"/></g></svg>`
    ).join("\n");
    expect(out).toContain("not normalized");
    expect(out).toContain("on a group is dropped");
    expect(out).toContain("stroke-dasharray");
  });

  it("flags <use> and transforms, which cleaning keeps", () => {
    const out = messages(
      stroke(`<path d="M1 1" transform="rotate(90)"/><use href="#a"/>`)
    ).join("\n");
    expect(out).toContain("error: unsupported <use>");
    expect(out).toContain('error: transform="…" found');
  });

  it("warns only when layers can't merge into one path", () => {
    // A bevelled circle merges with plain hands: the circle has no corners.
    expect(
      messages(
        stroke(
          `<circle cx="12" cy="12" r="9"/><path d="M12 7V12H16" stroke-linejoin="bevel"/>`
        )
      )
    ).toEqual([]);
    // Two cornered strokes, one round and one miter, can't.
    const out = messages(
      stroke(
        `<path d="M3 3H21V21" stroke-linejoin="round"/><path d="M12 7V12H16"/>`
      )
    );
    expect(out).toHaveLength(1);
    expect(out[0]).toContain("warning: ships as 2 paths, not one");
  });

  it("flags dots too short to render in Safari", () => {
    const out = messages(
      stroke(
        `<path d="M12 8V12M12 16V16.0001M11 20V20.01M10 21V21.08" stroke-linecap="square"/>`
      )
    );
    expect(out).toHaveLength(1);
    expect(out[0]).toContain("error: dot at (12, 16) is only 0.0001 long");
  });

  it("checks merging and dots only for the stroke variant", () => {
    const fill = cleanSvg(
      `<svg><path d="M12 16V16.0001" stroke-linecap="square"/></svg>`,
      VARIANT_ROOT_ATTRS.fill
    );
    expect(checkIcon(fill, "fill")).toEqual([]);
  });
});
