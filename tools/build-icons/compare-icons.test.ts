import { describe, expect, it } from "vitest";
import { VARIANT_ROOT_ATTRS } from "./clean-svgs.lib";
import { compareIcon } from "./compare-icons.lib";

const committed = (inner: string) =>
  `<svg ${VARIANT_ROOT_ATTRS.stroke}>\n${inner}\n</svg>\n`;
const exported = (inner: string) =>
  `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">\n${inner}\n</svg>\n`;

describe("compareIcon", () => {
  it("reports identical when the export merges back to the committed path", () => {
    const result = compareIcon(
      committed(`<path d="M14 2H4V22M16 15H14"/>`),
      exported(
        `<path id="doc" d="M14 2H4V22" stroke="black" stroke-width="2"/>\n<path d="M16 15H14" stroke="black" stroke-width="2"/>`
      ),
      "stroke"
    );
    expect(result).toEqual({
      verdict: "identical",
      added: [],
      removed: [],
      elements: [1, 2],
    });
  });

  it("reports same-geometry for reordered strokes and reformatted numbers", () => {
    const result = compareIcon(
      committed(`<path d="M14 2H4V22M16 15H14"/>`),
      exported(`<path d="M16 15.0000 H14"/>\n<path d="M14 2H4V22"/>`),
      "stroke"
    );
    expect(result.verdict).toBe("same-geometry");
  });

  it("lists added and removed strokes when geometry changes", () => {
    const result = compareIcon(
      committed(`<path d="M14 2H4V22M16 15H14"/>`),
      exported(`<path d="M14 2H4V22"/>\n<path d="M16 16H14"/>`),
      "stroke"
    );
    expect(result.verdict).toBe("changed");
    expect(result.removed).toEqual(["M16 15H14"]);
    expect(result.added).toEqual(["M16 16H14"]);
  });

  it("treats a lost linecap override as a change", () => {
    const result = compareIcon(
      committed(`<path d="M3 5H3.01" stroke-linecap="square"/>`),
      exported(`<path d="M3 5H3.01"/>`),
      "stroke"
    );
    expect(result.verdict).toBe("changed");
  });
});
