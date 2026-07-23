import { describe, expect, it } from "vitest";
import { resolveStrokeWidth } from "./resolveStrokeWidth";

describe("resolveStrokeWidth", () => {
  describe("absolute = false", () => {
    it("returns the stroke width unchanged (number)", () => {
      expect(resolveStrokeWidth(2, 48, false)).toBe(2);
    });

    it("returns the stroke width unchanged (string)", () => {
      expect(resolveStrokeWidth("1.5", 48, false)).toBe("1.5");
    });
  });

  describe("absolute = true", () => {
    it("scales stroke width down as size grows", () => {
      // (2 * 24) / 48 = 1
      expect(resolveStrokeWidth(2, 48, true)).toBe(1);
    });

    it("scales stroke width up as size shrinks", () => {
      // (2 * 24) / 12 = 4
      expect(resolveStrokeWidth(2, 12, true)).toBe(4);
    });

    it("is a no-op at the base 24px size", () => {
      expect(resolveStrokeWidth(2, 24, true)).toBe(2);
    });

    it("coerces numeric string inputs", () => {
      // (2 * 24) / 48 = 1
      expect(resolveStrokeWidth("2", "48", true)).toBe(1);
    });
  });
});
