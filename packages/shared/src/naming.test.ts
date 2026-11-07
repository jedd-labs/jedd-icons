import { describe, expect, it } from "vitest";
import { pascalToKebab } from "./naming";

describe("pascalToKebab", () => {
  it("converts PascalCase to kebab-case", () => {
    expect(pascalToKebab("ArrowDownLeft")).toBe("arrow-down-left");
  });

  it("lowercases a single word", () => {
    expect(pascalToKebab("Circle")).toBe("circle");
  });

  it("splits single-letter words", () => {
    expect(pascalToKebab("ArrowUDownLeft")).toBe("arrow-u-down-left");
    expect(pascalToKebab("CalendarXCorner")).toBe("calendar-x-corner");
  });

  it("splits a number from the word before it", () => {
    expect(pascalToKebab("Layers2")).toBe("layers-2");
    expect(pascalToKebab("Clock10")).toBe("clock-10");
    expect(pascalToKebab("Link1OffRounded")).toBe("link-1-off-rounded");
  });

  it("keeps a word that mixes digits and letters together", () => {
    expect(pascalToKebab("Grid2x2")).toBe("grid-2x2");
  });

  it("returns a kebab-case name unchanged", () => {
    expect(pascalToKebab("arrow-down-left")).toBe("arrow-down-left");
    expect(pascalToKebab("grid-2x2")).toBe("grid-2x2");
  });
});
