import type { JeddIcon } from "@jedd-icons/react";
import type { Variant } from "@/lib/icons";

interface IconPreviewProps {
  absolute: boolean;
  /** Forwarded to the rendered icon (e.g. `aria-hidden`). */
  "aria-hidden"?: boolean;
  color: string | null;
  /** The icon component to render, or null/undefined to show a placeholder. */
  component: JeddIcon | null | undefined;
  size: number;
  strokeWidth: number;
  variant: Variant;
}

export function IconPreview({
  component: Component,
  variant,
  size,
  strokeWidth,
  absolute,
  color,
  "aria-hidden": ariaHidden,
}: IconPreviewProps) {
  if (!Component) {
    return (
      <span className="bg-muted/40" style={{ width: size, height: size }} />
    );
  }

  return (
    <Component
      size={size}
      {...(variant === "stroke"
        ? { strokeWidth, absoluteStrokeWidth: absolute }
        : {})}
      {...(color ? { color } : {})}
      aria-hidden={ariaHidden}
    />
  );
}
