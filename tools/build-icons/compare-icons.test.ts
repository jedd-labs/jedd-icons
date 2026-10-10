import { describe, expect, it } from "vitest";
import { VARIANT_ROOT_ATTRS } from "./clean-icons.lib";
import { compareIcon } from "./compare-icons.lib";

const committed = (inner: string) =>
  `<svg ${VARIANT_ROOT_ATTRS.stroke}>\n${inner}\n</svg>\n`;
const exported = (inner: string) =>
  `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">\n${inner}\n</svg>\n`;
const verdict = (oldInner: string, newInner: string) =>
  compareIcon(committed(oldInner), exported(newInner), "stroke").verdict;

describe("compareIcon", () => {
  it("reports identical when the export merges back to the committed path", () => {
    expect(
      compareIcon(
        committed(`<path d="M14 2H4V22M16 15H14"/>`),
        exported(
          `<path id="doc" d="M14 2H4V22" stroke="black" stroke-width="2"/>\n<path d="M16 15H14" stroke="black" stroke-width="2"/>`
        ),
        "stroke"
      )
    ).toEqual({
      verdict: "identical",
      added: [],
      removed: [],
      maxShift: null,
      elements: [1, 2],
    });
  });

  it("treats reordered, reversed and reformatted strokes as the same geometry", () => {
    expect(
      verdict(
        `<path d="M14 2H4V22M16 15H14"/>`,
        `<path d="M16 15.0000 H14"/>\n<path d="M4 22V2H14"/>`
      )
    ).toBe("same-geometry");
  });

  it("matches a closed shape that starts at another corner", () => {
    expect(
      verdict(`<path d="M3 3H21V21H3Z"/>`, `<path d="M21 21H3V3H21Z"/>`)
    ).toBe("same-geometry");
  });

  it("ships a <circle> or <rect> identically to its design-tool path form", () => {
    expect(
      verdict(
        `<path d="M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z"/>`,
        `<circle cx="11" cy="11" r="8"/>`
      )
    ).toBe("identical");
    expect(
      verdict(
        `<path d="M3 3H21V21H3V3Z"/>`,
        `<rect x="3" y="3" width="18" height="18"/>`
      )
    ).toBe("identical");
  });

  it("matches a rotated rect with its unrotated form", () => {
    expect(
      verdict(
        `<rect x="3" y="3" width="18" height="18"/>`,
        `<rect x="21" y="3" width="18" height="18" transform="rotate(90 21 3)"/>`
      )
    ).toBe("same-geometry");
  });

  it("treats a straight line written as a cubic as a line", () => {
    expect(
      verdict(`<path d="M7 10V7"/>`, `<path d="M7 10C7 9 7 8 7 7"/>`)
    ).toBe("same-geometry");
  });

  it("matches square-capped dots written with different tiny lengths", () => {
    expect(
      verdict(
        `<path d="M12 16.99V17" stroke-linecap="square"/>`,
        `<path d="M12 17H12.0001" stroke-linecap="square"/>`
      )
    ).toBe("same-geometry");
  });

  it("ignores rounding-level differences", () => {
    expect(
      verdict(
        `<path d="M15 9C15 9 17 9.97 17 12"/>`,
        `<path d="M15 9C15 9 17 9.98 17 12"/>`
      )
    ).toBe("same-geometry");
  });

  it("reports restructured when strokes are split or joined differently", () => {
    // An X drawn as four half-lines from the centre vs two full lines.
    expect(
      verdict(
        `<path d="M12 12L4 4M12 12L20 20M12 12L20 4M12 12L4 20"/>`,
        `<path d="M4 4L20 20"/>\n<path d="M20 4L4 20"/>`
      )
    ).toBe("restructured");
  });

  it("lists moved segments and how far they moved", () => {
    const result = compareIcon(
      committed(`<path d="M14 2H4V22M16 15H14"/>`),
      exported(`<path d="M14 2H4V22"/>\n<path d="M16 15.5H14"/>`),
      "stroke"
    );
    expect(result.verdict).toBe("changed");
    expect(result.removed).toEqual(["14.00,15.00 16.00,15.00"]);
    expect(result.added).toEqual(["14.00,15.50 16.00,15.50"]);
    expect(result.maxShift).toBeCloseTo(0.5);
  });

  it("treats a lost linecap override as a change", () => {
    expect(
      verdict(
        `<path d="M3 5H8" stroke-linecap="square"/>`,
        `<path d="M3 5H8"/>`
      )
    ).toBe("changed");
  });

  it("ignores a join override on a stroke without corners", () => {
    expect(
      verdict(
        `<path d="M3 5H8" stroke-linejoin="bevel"/>`,
        `<path d="M3 5H8"/>`
      )
    ).toBe("same-geometry");
  });
});
