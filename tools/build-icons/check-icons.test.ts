import { describe, expect, it } from "vitest";
import { parseSvg } from "./build.lib";
import { checkIcon, checkMetadata, marginReport } from "./check-icons.lib";
import { cleanSvg, VARIANT_ROOT_ATTRS } from "./clean-icons.lib";

const stroke = (inner: string) =>
  cleanSvg(`<svg>${inner}</svg>`, VARIANT_ROOT_ATTRS.stroke);

const messages = (svg: string, variant = "stroke") =>
  checkIcon(svg, variant).map((i) => `${i.severity}: ${i.message}`);

describe("checkIcon", () => {
  it("passes a clean icon", () => {
    expect(checkIcon(stroke(`<path d="M5 12h14"/>`), "stroke")).toEqual([]);
  });

  it("flags an icon that isn't normalized yet", () => {
    expect(messages(`<svg><path d="M5 12h14" stroke="red"/></svg>`)).toEqual([
      "error: not normalized — run `pnpm icons:clean`",
    ]);
  });

  it("explains what cleaning would drop from an uncleaned icon", () => {
    const out = messages(
      `<svg><g transform="rotate(90)"><path d="M1 1" stroke-dasharray="4 2"/></g></svg>`
    ).join("\n");
    expect(out).toContain("not normalized");
    expect(out).toContain("on a group is dropped");
    expect(out).toContain("stroke-dasharray");
  });

  it("flags <use> and transforms, which cleaning keeps", () => {
    const out = messages(
      stroke(`<path d="M1 1" transform="rotate(90)"/><use href="#a"/>`)
    ).join("\n");
    expect(out).toContain("error: unsupported <use>");
    expect(out).toContain('error: transform="…" found');
  });

  it("warns only when layers can't merge into one path", () => {
    // A bevelled circle merges with plain hands: the circle has no corners.
    expect(
      messages(
        stroke(
          `<circle cx="12" cy="12" r="9"/><path d="M12 7V12H16" stroke-linejoin="bevel"/>`
        )
      )
    ).toEqual([]);
    // Two cornered strokes, one round and one miter, can't.
    const out = messages(
      stroke(
        `<path d="M3 3H21V21" stroke-linejoin="round"/><path d="M12 7V12H16"/>`
      )
    );
    expect(out).toHaveLength(1);
    expect(out[0]).toContain("warning: ships as 2 paths, not one");
  });

  it("flags dots too short to render in Safari", () => {
    const out = messages(
      stroke(
        `<path d="M12 8V12M12 16V16.0001M11 20V20.01M10 21V21.08" stroke-linecap="square"/>`
      )
    );
    expect(out).toHaveLength(1);
    expect(out[0]).toContain("error: dot at (12, 16) is only 0.0001 long");
  });

  it("checks merging and dots only for the stroke variant", () => {
    const fill = cleanSvg(
      `<svg><path d="M12 16V16.0001" stroke-linecap="square"/></svg>`,
      VARIANT_ROOT_ATTRS.fill
    );
    expect(checkIcon(fill, "fill")).toEqual([]);
  });
});

describe("margin", () => {
  it("passes geometry that only touches the 1px margin", () => {
    expect(checkIcon(stroke(`<path d="M1 1H23V23"/>`), "stroke")).toEqual([]);
  });

  it("flags geometry crossing the margin, per side", () => {
    expect(messages(stroke(`<path d="M0.5 12H23.25"/>`))).toEqual([
      "error: geometry crosses the 1px margin (left 0.5, right 0.25) — keep it within 1–23 in the design tool",
    ]);
  });

  it("says when geometry leaves the viewBox", () => {
    const fill = cleanSvg(
      `<svg><circle cx="12" cy="12" r="12.5"/></svg>`,
      VARIANT_ROOT_ATTRS.fill
    );
    const out = messages(fill, "fill");
    expect(out).toHaveLength(1);
    expect(out[0]).toContain("and leaves the 24×24 viewBox");
  });

  it("measures curves where they bulge, and applies transforms", () => {
    // Endpoints inside the margin, but the curve bows out to y ≈ 0.25.
    expect(
      marginReport(parseSvg(`<svg><path d="M4 2C8 0 16 0 20 2"/></svg>`)).sides
        .top
    ).toBeCloseTo(0.5);
    expect(
      marginReport(
        parseSvg(
          `<svg><line x1="2" y1="12" x2="22" y2="12" transform="translate(-1.5 0)"/></svg>`
        )
      ).sides.left
    ).toBeCloseTo(0.5);
  });

  it("reports geometry the build can't read instead of throwing", () => {
    expect(messages(stroke(`<path d="M2 2A4 4 0 0 1 6 6"/>`))).toEqual([
      'error: can\'t read the geometry: unsupported path command "A"',
    ]);
  });
});

describe("checkMetadata", () => {
  const meta = (fields: Record<string, unknown>) =>
    JSON.stringify({
      $schema: "../../icon.schema.json",
      contributors: ["mnove"],
      tags: ["arrow"],
      categories: ["arrows"],
      ...fields,
    });
  const metaMessages = (json: string | undefined) =>
    checkMetadata(json).map((i) => i.message);

  it("passes metadata matching the schema", () => {
    expect(checkMetadata(meta({ aliases: [{ name: "old-name" }] }))).toEqual(
      []
    );
  });

  it("flags a missing or unparseable sidecar", () => {
    expect(metaMessages(undefined)).toEqual(["sidecar .json is missing"]);
    expect(metaMessages("{")[0]).toContain("sidecar .json isn't valid JSON");
  });

  it("explains schema errors in plain words", () => {
    expect(
      metaMessages(
        meta({
          contributors: undefined,
          tags: [],
          categories: ["arrows", "nope"],
          categores: ["arrows"],
          aliases: [{ deprecated: true }],
        })
      )
    ).toEqual([
      'missing required field "contributors"',
      'unknown field "categores"',
      "tags is empty",
      'categories[1]: "nope" isn\'t one of the allowed values',
      'aliases[0]: missing required field "name"',
    ]);
  });
});
