import { describe, expect, it } from "vitest";
import { kebabToPascal } from "./naming";

describe("kebabToPascal", () => {
  it("converts kebab-case to PascalCase", () => {
    expect(kebabToPascal("chevron-right")).toBe("ChevronRight");
  });

  it("uppercases a single word", () => {
    expect(kebabToPascal("circle")).toBe("Circle");
  });

  it("handles multiple hyphens", () => {
    expect(kebabToPascal("arrow-corner-down-left")).toBe("ArrowCornerDownLeft");
  });

  it("passes an already-PascalCase-looking input through", () => {
    // No leading hyphen and no lowercase-after-hyphen to transform.
    expect(kebabToPascal("Circle")).toBe("Circle");
  });

  it("keeps a mid/trailing digit", () => {
    expect(kebabToPascal("arrow-2")).toBe("Arrow2");
  });

  it("throws when the result would start with a digit", () => {
    expect(() => kebabToPascal("3d-cube")).toThrow(/cannot start with a digit/);
  });
});
