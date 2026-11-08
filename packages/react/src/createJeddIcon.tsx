"use client";

import { createElement, forwardRef } from "react";
import Icon from "./Icon";
import type { IconNode, IconProps, JeddIcon, Variant } from "./types";

const toPascalCase = (s: string) =>
  s.replace(/(^|-)([a-z0-9])/g, (_, __, c) => c.toUpperCase());

/**
 * Internal: only the generated (gitignored) icon modules import this, so knip
 * can't see its uses.
 * @lintignore
 */
export default function createJeddIcon(
  iconName: string,
  iconNode: IconNode,
  variant: Variant = "stroke"
): JeddIcon {
  const Component = forwardRef<SVGSVGElement, IconProps>(
    ({ className, ...props }, ref) =>
      createElement(Icon, {
        ref,
        iconNode,
        variant,
        className: ["jedd", `jedd-${iconName}`, className]
          .filter(Boolean)
          .join(" "),
        ...props,
      })
  );

  Component.displayName = toPascalCase(iconName);
  return Component;
}
