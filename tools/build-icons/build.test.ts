import { describe, expect, it } from "vitest";
import {
  indexExportLine,
  isStripped,
  mergePathNodes,
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

  it("drops a redundant default stroke-linejoin but keeps an override", () => {
    const nodes = [
      ["path", { d: "M1 1", "stroke-linejoin": "miter" }],
      ["path", { d: "M2 2", "stroke-linejoin": "bevel" }],
    ] as const;
    expect(stripInheritedAttrs(nodes as never)).toEqual([
      ["path", { d: "M1 1" }],
      ["path", { d: "M2 2", "stroke-linejoin": "bevel" }],
    ]);
  });
});

describe("mergePathNodes", () => {
  it("joins sibling paths without a separator", () => {
    expect(
      mergePathNodes([
        ["path", { d: "M1 1H5Z" }],
        ["path", { d: " M2 2V8 " }],
      ])
    ).toEqual([["path", { d: "M1 1H5ZM2 2V8" }]]);
  });

  it("merges only paths that share the same presentation", () => {
    expect(
      mergePathNodes([
        ["path", { d: "M3 5H3.01", "stroke-linecap": "square" }],
        ["path", { d: "M8 5H21" }],
        ["path", { d: "M3 9H3.01", "stroke-linecap": "square" }],
        ["path", { d: "M8 9H21" }],
      ])
    ).toEqual([
      ["path", { d: "M3 5H3.01M3 9H3.01", "stroke-linecap": "square" }],
      ["path", { d: "M8 5H21M8 9H21" }],
    ]);
  });

  it("converts circles and rects to path data and merges them", () => {
    expect(
      mergePathNodes([
        ["path", { d: "M20 20L17 17" }],
        ["circle", { cx: "11", cy: "11", r: "8" }],
        ["rect", { x: "3", y: "3", width: "4", height: "2" }],
      ])
    ).toEqual([
      [
        "path",
        {
          d: "M20 20L17 17M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11ZM3 3H7V5H3V3Z",
        },
      ],
    ]);
  });

  it("applies a line join where it shows, merging a circle with bevelled hands", () => {
    // The circle has no corners, so the hands' bevel can't change it.
    expect(
      mergePathNodes([
        ["circle", { cx: "12", cy: "12", r: "1" }],
        ["path", { d: "M12 7V12H16", "stroke-linejoin": "bevel" }],
      ])
    ).toEqual([
      [
        "path",
        {
          d: "M13 12C13 12.5523 12.5523 13 12 13C11.4477 13 11 12.5523 11 12C11 11.4477 11.4477 11 12 11C12.5523 11 13 11.4477 13 12ZM12 7V12H16",
          "stroke-linejoin": "bevel",
        },
      ],
    ]);
  });

  it("keeps a cap or join that shows nowhere only if the layers agree", () => {
    expect(
      mergePathNodes([["path", { d: "M8 12H16", "stroke-linejoin": "round" }]])
    ).toEqual([["path", { d: "M8 12H16", "stroke-linejoin": "round" }]]);
    // A cap on a closed shape and a join on a corner-less line never render.
    expect(
      mergePathNodes([
        ["path", { d: "M3 3H21V21H3Z", "stroke-linecap": "square" }],
        ["path", { d: "M8 12H16", "stroke-linejoin": "round" }],
      ])
    ).toEqual([["path", { d: "M3 3H21V21H3ZM8 12H16" }]]);
  });

  it("keeps paths separate when a different join would show on both", () => {
    expect(
      mergePathNodes([
        ["path", { d: "M3 3H21V21", "stroke-linejoin": "round" }],
        ["path", { d: "M12 7V12H16" }],
      ])
    ).toEqual([
      ["path", { d: "M3 3H21V21", "stroke-linejoin": "round" }],
      ["path", { d: "M12 7V12H16" }],
    ]);
  });

  it("keeps elements it can't convert in place", () => {
    const group = ["g", {}, [["path", { d: "M3 3H5" }]]] as never;
    expect(
      mergePathNodes([
        ["path", { d: "M1 1H5" }],
        group,
        ["path", { d: "M2 2V8" }],
      ])
    ).toEqual([["path", { d: "M1 1H5M2 2V8" }], group]);
  });

  it("leaves a path starting with a relative moveto unmerged", () => {
    const nodes = [
      ["path", { d: "M1 1H5" }],
      ["path", { d: "m2 2v6" }],
    ] as never;
    expect(mergePathNodes(nodes)).toEqual(nodes);
  });

  it("does not mutate its input", () => {
    const nodes = [
      ["path", { d: "M1 1" }],
      ["path", { d: "M2 2" }],
    ] as never;
    const copy = structuredClone(nodes);
    mergePathNodes(nodes);
    expect(nodes).toEqual(copy);
  });
});

describe("isStripped", () => {
  it("strips inherited presentation attrs", () => {
    expect(isStripped("stroke", "red")).toBe(true);
    expect(isStripped("stroke-width", "2")).toBe(true);
  });

  it("keeps geometry attrs", () => {
    expect(isStripped("d", "M1 1")).toBe(false);
    expect(isStripped("cx", "12")).toBe(false);
  });

  it("strips a redundant default stroke-linejoin but keeps an override", () => {
    expect(isStripped("stroke-linejoin", "miter")).toBe(true);
    expect(isStripped("stroke-linejoin", "bevel")).toBe(false);
    expect(isStripped("stroke-linejoin", "round")).toBe(false);
  });

  it("strips a redundant default stroke-linecap but keeps an override", () => {
    expect(isStripped("stroke-linecap", "butt")).toBe(true);
    expect(isStripped("stroke-linecap", "square")).toBe(false);
    expect(isStripped("stroke-linecap", "round")).toBe(false);
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
