import * as StrokeLib from "@jedd-icons/react";
import * as FillLib from "@jedd-icons/react/fill";
import type { ComponentType } from "react";
import { getPascalName } from "@/lib/icon-nodes";
import type { Variant } from "@/lib/icons";

// Props the generated Jedd components accept. Kept loose so we can forward
// size/stroke without pinning to the package's exact prop type.
type IconComponent = ComponentType<{
  size?: number;
  strokeWidth?: number;
  className?: string;
  "aria-hidden"?: boolean;
}>;

const LIBS: Record<Variant, Record<string, unknown>> = {
  stroke: StrokeLib as unknown as Record<string, unknown>,
  fill: FillLib as unknown as Record<string, unknown>,
};

/** Resolve the real published component for an icon name + variant, or null. */
export function getIconComponent(
  name: string,
  variant: Variant
): IconComponent | null {
  const pascal = getPascalName(name, variant);
  return (pascal ? LIBS[variant][pascal] : undefined) as IconComponent | null;
}

/** A small published-component preview, e.g. for the sidebar list rows. */
export function IconGlyph({
  name,
  variant = "stroke",
  size = 16,
}: {
  name: string;
  variant?: Variant;
  size?: number;
}) {
  const Component = getIconComponent(name, variant);
  if (!Component) {
    return <span aria-hidden style={{ width: size, height: size }} />;
  }
  return <Component aria-hidden size={size} />;
}

/** The real published sizes an icon is most often used at. */
const SIZES = [16, 24, 32, 48] as const;

/**
 * Renders the actual `@jedd-icons/react` component (ground truth, exactly what
 * consumers import) at common UI sizes — a reference to check the parsed x-ray
 * against the shipped output.
 */
export function PackageRender({
  name,
  variant,
  strokeWidth,
}: {
  name: string;
  variant: Variant;
  strokeWidth: number;
}) {
  const pascal = getPascalName(name, variant);
  const Component = getIconComponent(name, variant);

  if (!Component) {
    return (
      <p className="text-muted-foreground text-xs">
        No published <code className="font-mono">{variant}</code> component for
        this icon.
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <span className="font-medium text-muted-foreground text-xs">
        Published render
        <span className="ml-1.5 font-mono text-[10px]">
          {"<"}
          {pascal}
          {" />"}
        </span>
      </span>
      <div className="flex items-end gap-6">
        {SIZES.map((size) => (
          <div className="flex flex-col items-center gap-1.5" key={size}>
            <div className="flex h-12 items-center justify-center">
              <Component
                aria-hidden
                size={size}
                {...(variant === "stroke" ? { strokeWidth } : {})}
              />
            </div>
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {size}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
