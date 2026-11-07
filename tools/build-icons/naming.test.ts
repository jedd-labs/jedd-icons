import { readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { pascalToKebab } from "../../packages/shared/src/naming";
import { kebabToPascal } from "./naming";

const ICONS_DIR = new URL("../../icons/", import.meta.url);

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

// `createIcons` (@jedd-icons/core) turns a registered component name back into
// the `jedd-<name>` class, so every icon name has to survive the round trip.
describe("pascalToKebab ∘ kebabToPascal", () => {
  it("round-trips every icon name", () => {
    const names = readdirSync(ICONS_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .flatMap((d) => readdirSync(new URL(`${d.name}/`, ICONS_DIR)))
      .filter((f) => f.endsWith(".svg"))
      .map((f) => f.slice(0, -".svg".length));

    expect(names.length).toBeGreaterThan(0);
    const mismatches = names.filter(
      (name) => pascalToKebab(kebabToPascal(name)) !== name
    );
    expect(mismatches).toEqual([]);
  });
});
