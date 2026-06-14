import { useState } from "react";
import {
  buildReactSnippet,
  buildVanillaSnippet,
  type SnippetOptions,
  type Variant,
} from "@/lib/icons";

interface UseIconCustomizationOptions {
  /** Initial (and reset) value for `size`. Gallery uses 32, the page uses 48. */
  defaultSize: number;
  /** Selected icon's PascalCase name; "" produces empty snippets. */
  name: string;
  variant: Variant;
}

const DEFAULT_STROKE_WIDTH = 2;

export function useIconCustomization({
  name,
  variant,
  defaultSize,
}: UseIconCustomizationOptions) {
  const [size, setSize] = useState(defaultSize);
  const [strokeWidth, setStrokeWidth] = useState(DEFAULT_STROKE_WIDTH);
  const [color, setColor] = useState<string | null>(null);
  const [absolute, setAbsolute] = useState(false);

  const reset = () => {
    setSize(defaultSize);
    setStrokeWidth(DEFAULT_STROKE_WIDTH);
    setColor(null);
    setAbsolute(false);
  };

  const snippetOptions: SnippetOptions = {
    name,
    variant,
    size,
    strokeWidth,
    absolute,
    color,
  };
  const reactSnippet = buildReactSnippet(snippetOptions);
  const vanillaSnippet = buildVanillaSnippet(snippetOptions);

  return {
    size,
    setSize,
    strokeWidth,
    setStrokeWidth,
    color,
    setColor,
    absolute,
    setAbsolute,
    reset,
    reactSnippet,
    vanillaSnippet,
  };
}
