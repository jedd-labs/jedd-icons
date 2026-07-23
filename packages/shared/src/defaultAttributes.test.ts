import { describe, expect, it } from "vitest";
import {
  fillDefaults,
  fillDefaultsCamel,
  strokeDefaults,
  strokeDefaultsCamel,
  variantDefaults,
  variantDefaultsCamel,
} from "./defaultAttributes";

describe("defaultAttributes", () => {
  it("camelCases the stroke default keys", () => {
    expect(strokeDefaultsCamel).toMatchInlineSnapshot(`
      {
        "fill": "none",
        "height": 24,
        "stroke": "currentColor",
        "strokeLinecap": "butt",
        "strokeLinejoin": "miter",
        "strokeWidth": 2,
        "viewBox": "0 0 24 24",
        "width": 24,
        "xmlns": "http://www.w3.org/2000/svg",
      }
    `);
  });

  it("camelCases the fill default keys", () => {
    expect(fillDefaultsCamel).toMatchInlineSnapshot(`
      {
        "fill": "currentColor",
        "height": 24,
        "stroke": "none",
        "viewBox": "0 0 24 24",
        "width": 24,
        "xmlns": "http://www.w3.org/2000/svg",
      }
    `);
  });

  it("maps variant names to their kebab defaults", () => {
    expect(variantDefaults.stroke).toBe(strokeDefaults);
    expect(variantDefaults.fill).toBe(fillDefaults);
  });

  it("maps variant names to their camel defaults", () => {
    expect(variantDefaultsCamel.stroke).toBe(strokeDefaultsCamel);
    expect(variantDefaultsCamel.fill).toBe(fillDefaultsCamel);
  });
});
