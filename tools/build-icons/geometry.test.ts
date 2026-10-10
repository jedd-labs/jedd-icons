import { describe, expect, it } from "vitest";
import { elementSubpaths, parsePathData, strokeKey } from "./geometry";

describe("parsePathData", () => {
  it("parses absolute and relative commands into absolute segments", () => {
    expect(parsePathData("M1 1h4v2l-1 1z")).toEqual([
      {
        closed: true,
        segments: [
          [
            [1, 1],
            [5, 1],
          ],
          [
            [5, 1],
            [5, 3],
          ],
          [
            [5, 3],
            [4, 4],
          ],
        ],
      },
    ]);
  });

  it("starts a new subpath at each M", () => {
    expect(parsePathData("M1 1H5M2 2V8")).toHaveLength(2);
  });
});

describe("elementSubpaths", () => {
  it("applies an element's transform", () => {
    const [rect] =
      elementSubpaths("rect", {
        x: "21",
        y: "3",
        width: "18",
        height: "18",
        transform: "rotate(90 21 3)",
      }) ?? [];
    const corners = rect.segments.map(([p]) => p.map((v) => Math.round(v)));
    expect(corners).toEqual([
      [21, 3],
      [21, 21],
      [3, 21],
      [3, 3],
    ]);
  });

  it("returns null for tags that draw no geometry", () => {
    expect(elementSubpaths("use", { href: "#a" })).toBeNull();
  });
});

describe("strokeKey", () => {
  const key = (d: string) => strokeKey(parsePathData(d)[0]);

  it("is direction-independent", () => {
    expect(key("M1 1L5 5L9 1")).toBe(key("M9 1L5 5L1 1"));
  });

  it("ignores the start point of a closed shape", () => {
    expect(key("M3 3H21V21H3Z")).toBe(key("M21 21H3V3H21Z"));
  });

  it("distinguishes a closed shape from an open one", () => {
    expect(key("M3 3H21V21H3Z")).not.toBe(key("M3 3H21V21H3V3"));
  });
});
