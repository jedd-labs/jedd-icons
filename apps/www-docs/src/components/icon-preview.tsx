import type { JeddIcon } from "@jedd-icons/react";

interface IconPreviewProps {
  absolute: boolean;
  /** Forwarded to the rendered icon (e.g. `aria-hidden`). */
  "aria-hidden"?: boolean;
  color: string | null;
  /** The icon component to render, or null/undefined to show a placeholder. */
  component: JeddIcon | null | undefined;
  size: number;
  strokeWidth: number;
}

export function IconPreview({
  component: Component,
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
      absoluteStrokeWidth={absolute}
      size={size}
      strokeWidth={strokeWidth}
      {...(color ? { color } : {})}
      aria-hidden={ariaHidden}
    />
  );
}
