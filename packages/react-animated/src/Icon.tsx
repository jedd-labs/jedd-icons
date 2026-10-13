"use client";

import { resolveStrokeWidth, strokeDefaultsCamel } from "@jedd-icons/shared";
import { createElement, forwardRef, type ReactNode } from "react";
import { useJeddContext } from "./JeddProvider";
import type { IconNode, IconNodeChild, IconProps } from "./types";

interface InternalProps extends IconProps {
  iconNode: IconNode;
}

/**
 * Renders an icon's node tuples as an `<svg>`. Internal (not exported): the
 * animated package's counterpart of `@jedd-icons/react`'s `Icon`, stroke
 * variant only, so the package needs no other published package. The look
 * (root attributes, stroke-width maths) comes from `@jedd-icons/shared` like
 * there; keep the rest — prop precedence, `aria-hidden`, children — in step
 * with it, so an icon at rest renders the same from either package.
 */
const Icon = forwardRef<SVGSVGElement, InternalProps>(
  (
    {
      iconNode,
      size: sizeProp,
      color: colorProp,
      strokeWidth: strokeWidthProp,
      absoluteStrokeWidth: absoluteStrokeWidthProp,
      className,
      children,
      ...rest
    },
    ref
  ) => {
    // Precedence: icon prop → nearest JeddProvider → built-in default.
    const context = useJeddContext();
    const size = sizeProp ?? context.size ?? 24;
    const color = colorProp ?? context.color ?? "currentColor";
    const strokeWidth = strokeWidthProp ?? context.strokeWidth ?? 2;
    const absoluteStrokeWidth =
      absoluteStrokeWidthProp ?? context.absoluteStrokeWidth ?? false;

    const hasA11y =
      "aria-label" in rest || "aria-labelledby" in rest || "role" in rest;

    const svgProps: Record<string, unknown> = {
      ref,
      ...strokeDefaultsCamel,
      width: size,
      height: size,
      className,
      ...(children || hasA11y ? {} : { "aria-hidden": true }),
      stroke: color,
      strokeWidth: resolveStrokeWidth(strokeWidth, size, absoluteStrokeWidth),
    };

    return createElement("svg", { ...svgProps, ...rest }, [
      ...iconNode.map(function renderNode(
        [tag, attrs, nested]: IconNodeChild,
        i: number
      ): React.ReactElement {
        return createElement(
          tag,
          { key: `c-${i}`, ...attrs },
          ...(nested?.map(renderNode) ?? [])
        );
      }),
      ...((Array.isArray(children) ? children : [children]).filter(
        Boolean
      ) as ReactNode[]),
    ]);
  }
);

Icon.displayName = "Icon";

export default Icon;
