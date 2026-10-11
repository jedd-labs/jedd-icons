import { describe, expect, it } from "vitest";
import {
  animatedIconNode,
  checkAnimations,
  pathSignature,
  renderAnimatedIconFile,
} from "./animated.lib";
import type { IconNode } from "./build.lib";

// arrow-right-like: 0 shaft, 1 head, plus a circle.
const parts: IconNode = [
  ["path", { d: "M5 12H19" }],
  ["path", { d: "M12 4.92893L19.0711 12L12 19.0711" }],
  ["circle", { cx: "12", cy: "12", r: "3", "stroke-linecap": "round" }],
];

describe("pathSignature", () => {
  it("keeps commands and counts numbers", () => {
    expect(pathSignature("M5 12H19")).toBe("MnnHn");
    expect(pathSignature("M12 4.92893L19.0711 12L12 19.0711")).toBe(
      "MnnLnnLnn"
    );
  });

  it("reads numbers that aren't space-separated", () => {
    expect(pathSignature("M1-2.5.5L3e-2 4")).toBe("MnnnLnn");
  });
});

describe("checkAnimations", () => {
  const check = (definition: Parameters<typeof checkAnimations>[1]) =>
    checkAnimations(parts, definition);

  it("accepts every kind of target", () => {
    expect(
      check({
        groups: { arrow: [0, 1] },
        animations: {
          default: { arrow: { animate: { x: 3 } } },
          draw: { "*": { animate: { pathLength: [0, 1] } } },
          spin: { icon: { animate: { rotate: [0, 360] } } },
          grow: { 2: { animate: { r: [3, 4, 3] } } },
        },
      })
    ).toEqual([]);
  });

  it("flags elements and groups that don't exist", () => {
    expect(
      check({
        groups: { far: [1, 7] },
        animations: { default: { 5: { animate: { x: 1 } } } },
      })
    ).toEqual([
      'group "far": element 7 doesn\'t exist (the icon has 3)',
      'animation "default", target "5": no such element or group (elements are 0–2)',
    ]);
    expect(
      check({ animations: { default: { lid: { animate: { x: 1 } } } } })
    ).toHaveLength(1);
  });

  it("flags an element in two groups and reserved group names", () => {
    expect(
      check({
        groups: { a: [0], b: [0], icon: [1] },
        animations: { default: { a: { animate: { x: 1 } } } },
      })
    ).toEqual([
      'group "b": element 0 is already in group "a"',
      'group "icon": the name is reserved for a target',
    ]);
  });

  it("flags values the runtime doesn't animate, or on the wrong target", () => {
    expect(
      check({
        groups: { arrow: [0, 1] },
        animations: {
          default: {
            0: { animate: { r: 4 } },
            arrow: { animate: { pathLength: [0, 1] } },
            icon: { animate: { d: "M1 1" } },
            1: { animate: { fill: "red" } as never },
          },
        },
      })
    ).toEqual([
      'animation "default", target "0": r needs a <circle>, not a <path>',
      'animation "default", target "1": "fill" isn\'t a value the runtime animates',
      'animation "default", target "arrow": pathLength draws a stroke, so it needs an element, not a group',
      'animation "default", target "icon": d is per element, so it needs a single element',
    ]);
  });

  it("flags a d keyframe that can't morph from the source path", () => {
    const errors = check({
      animations: {
        pointing: { 0: { animate: { d: ["M5 12H19", "M5 12L15 12"] } } },
      },
    });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('d keyframe 1 ("M5 12L15 12")');
  });

  it("flags transition.times that don't match the keyframes", () => {
    expect(
      check({
        animations: {
          out: {
            icon: {
              animate: { x: [0, 24, 0] },
              transition: { times: [0, 1] },
            },
          },
        },
      })
    ).toEqual([
      'animation "out", target "icon": transition.times needs one entry per x keyframe',
    ]);
  });
});

describe("animatedIconNode", () => {
  it("marks each element and wraps everything in the icon group", () => {
    expect(animatedIconNode(parts)).toEqual([
      [
        "g",
        { "data-group": "icon" },
        [
          ["path", { d: "M5 12H19", "data-part": 0 }],
          ["path", { d: "M12 4.92893L19.0711 12L12 19.0711", "data-part": 1 }],
          [
            "circle",
            {
              cx: "12",
              cy: "12",
              r: "3",
              strokeLinecap: "round",
              "data-part": 2,
            },
          ],
        ],
      ],
    ]);
  });

  it("places each group where its first element was", () => {
    const [[, , children]] = animatedIconNode(parts, { ends: [0, 2] });
    expect(
      children?.map(([tag, attrs]) => [
        tag,
        attrs["data-group"] ?? attrs["data-part"],
      ])
    ).toEqual([
      ["g", "ends"],
      ["path", 1],
    ]);
    expect(children?.[0][2]?.map(([, attrs]) => attrs["data-part"])).toEqual([
      0, 2,
    ]);
  });
});

describe("renderAnimatedIconFile", () => {
  it("types the component with the icon's own animation names", () => {
    const file = renderAnimatedIconFile("arrow-right", [], {
      default: {},
      pointing: {},
    });
    expect(file).toContain(
      'const ArrowRight = createAnimatedJeddIcon<"default" | "pointing">("arrow-right", __iconNode, __animations)'
    );
  });

  it("leaves the type parameter off when the icon has only the presets", () => {
    expect(renderAnimatedIconFile("check", [], {})).toContain(
      'const Check = createAnimatedJeddIcon("check", __iconNode, __animations)'
    );
  });
});
