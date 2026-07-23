import { describe, expect, it } from "vitest";
import {
  indexExportLine,
  parseSvg,
  renderReactIconFile,
  renderVanillaIconFile,
  stripInheritedAttrs,
  toCamelAttrs,
} from "./build.lib";

describe("parseSvg", () => {
  it("parses a canonical stroke SVG into IconNode tuples", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M5 12h14"/></svg>`;
    expect(parseSvg(svg)).toEqual([["path", { d: "M5 12h14" }]]);
  });

  it("parses multiple sibling elements", () => {
    const svg = `<svg viewBox="0 0 24 24"><path d="M5 12h14"/><circle cx="12" cy="12" r="3"/></svg>`;
    expect(parseSvg(svg)).toEqual([
      ["path", { d: "M5 12h14" }],
      ["circle", { cx: "12", cy: "12", r: "3" }],
    ]);
  });

  it("parses nested children", () => {
    const svg = `<svg viewBox="0 0 24 24"><g id="a"><path d="M1 1"/></g></svg>`;
    expect(parseSvg(svg)).toEqual([
      ["g", { id: "a" }, [["path", { d: "M1 1" }]]],
    ]);
  });

  it("strips XML declarations and comments before parsing", () => {
    const svg = `<?xml version="1.0"?><!-- a comment --><svg viewBox="0 0 24 24"><path d="M1 1"/></svg>`;
    expect(parseSvg(svg)).toEqual([["path", { d: "M1 1" }]]);
  });

  it("returns an empty array when there is no <svg> wrapper", () => {
    expect(parseSvg("<div>not an svg</div>")).toEqual([]);
  });

  it("returns an empty array for an unterminated <svg>", () => {
    expect(parseSvg(`<svg viewBox="0 0 24 24"><path d="M1 1"/>`)).toEqual([]);
  });
});

describe("stripInheritedAttrs", () => {
  it("removes inherited presentation attributes but keeps geometry", () => {
    const nodes = [
      [
        "path",
        { d: "M5 12h14", stroke: "red", "stroke-width": "2", opacity: "0.5" },
      ],
    ] as const;
    expect(stripInheritedAttrs(nodes as never)).toEqual([
      ["path", { d: "M5 12h14" }],
    ]);
  });

  it("recurses into nested children", () => {
    const nodes = [
      [
        "g",
        { id: "a", fill: "blue" },
        [["circle", { cx: "12", cy: "12", r: "3", stroke: "green" }]],
      ],
    ] as const;
    expect(stripInheritedAttrs(nodes as never)).toEqual([
      ["g", { id: "a" }, [["circle", { cx: "12", cy: "12", r: "3" }]]],
    ]);
  });
});

describe("toCamelAttrs", () => {
  it("camelCases hyphenated attribute keys", () => {
    const nodes = [["path", { d: "M1 1", "stroke-linecap": "round" }]] as const;
    expect(toCamelAttrs(nodes as never)).toEqual([
      ["path", { d: "M1 1", strokeLinecap: "round" }],
    ]);
  });

  it("leaves non-hyphenated keys untouched and recurses", () => {
    const nodes = [
      ["g", { id: "a" }, [["path", { "clip-rule": "evenodd" }]]],
    ] as const;
    expect(toCamelAttrs(nodes as never)).toEqual([
      ["g", { id: "a" }, [["path", { clipRule: "evenodd" }]]],
    ]);
  });
});

describe("renderReactIconFile", () => {
  const node = [["path", { d: "M5 12h14" }]] as const;

  it("emits a default-variant component with no variant argument", () => {
    const out = renderReactIconFile("arrow-right", node as never, "stroke");
    expect(out).toContain(
      `const ArrowRight = createJeddIcon("arrow-right", __iconNode)`
    );
    expect(out).toContain("export default ArrowRight");
    expect(out).toContain("export { __iconNode as ArrowRightNode }");
  });

  it("emits the variant argument for a non-default variant", () => {
    const out = renderReactIconFile("arrow-right", node as never, "fill");
    expect(out).toContain(
      `const ArrowRight = createJeddIcon("arrow-right", __iconNode, "fill")`
    );
  });

  it("camelCases attrs in the emitted node", () => {
    const kebabNode = [["path", { "stroke-linecap": "round" }]] as const;
    const out = renderReactIconFile("x", kebabNode as never, "stroke");
    expect(out).toContain(`"strokeLinecap":"round"`);
  });
});

describe("renderVanillaIconFile", () => {
  it("emits a typed IconNode constant and keeps kebab attrs", () => {
    const node = [["path", { "stroke-linecap": "round" }]] as const;
    const out = renderVanillaIconFile("arrow-right", node as never);
    expect(out).toContain("const ArrowRight: IconNode =");
    // Vanilla target does NOT camelCase attrs.
    expect(out).toContain(`"stroke-linecap":"round"`);
    expect(out).toContain("export { ArrowRight as ArrowRightNode }");
  });
});

describe("indexExportLine", () => {
  it("emits a default-only re-export for the react target", () => {
    expect(indexExportLine("react", "ArrowRight", "arrow-right")).toBe(
      `export { default as ArrowRight } from "./arrow-right"`
    );
  });

  it("also re-exports the Node for the vanilla target", () => {
    expect(indexExportLine("vanilla", "ArrowRight", "arrow-right")).toBe(
      `export { default as ArrowRight, ArrowRightNode } from "./arrow-right"`
    );
  });
});
