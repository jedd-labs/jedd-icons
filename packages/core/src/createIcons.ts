import type { IconNode } from "@jedd-icons/shared";
import { pascalToKebab } from "@jedd-icons/shared";
import { type CreateElementOptions, createElement } from "./createElement";

export interface CreateIconsOptions {
  attrs?: CreateElementOptions;
  icons?: Record<string, IconNode>;
  nameAttr?: string;
  watch?: boolean;
}

/**
 * Replaces `[data-jedd]` placeholders with icons. Returns a function that
 * stops watching for new placeholders (a no-op without `watch: true`).
 */
export function createIcons({
  icons = {},
  attrs = {},
  nameAttr = "data-jedd",
  watch = false,
}: CreateIconsOptions = {}): () => void {
  const replace = (root: ParentNode = document) => {
    const elements = root.querySelectorAll<HTMLElement>(`[${nameAttr}]`);
    for (const el of elements) {
      const name = el.getAttribute(nameAttr);
      if (!name) {
        continue;
      }

      const iconNode = icons[name];
      if (!iconNode) {
        console.warn(`[jedd-icons] Unknown icon: "${name}"`);
        continue;
      }

      const elAttrs: CreateElementOptions = { ...attrs };
      if (el.dataset.jeddSize) {
        elAttrs.size = el.dataset.jeddSize;
      }
      if (el.dataset.jeddColor) {
        elAttrs.color = el.dataset.jeddColor;
      }
      if (el.dataset.jeddStrokeWidth) {
        elAttrs.strokeWidth = el.dataset.jeddStrokeWidth;
      }
      // Boolean attribute: present (or "true") turns it on, "false" turns off
      // a shared `attrs.absoluteStrokeWidth: true` for this element.
      const absolute = el.dataset.jeddAbsoluteStrokeWidth;
      if (absolute !== undefined) {
        elAttrs.absoluteStrokeWidth = absolute !== "false";
      }

      const svg = createElement(iconNode, {
        ...elAttrs,
        // `jedd-<kebab-name>`, matching the React components, whether the
        // icon was registered as `ArrowDownLeft` or `arrow-down-left`.
        class: ["jedd", `jedd-${pascalToKebab(name)}`, el.getAttribute("class")]
          .filter(Boolean)
          .join(" "),
      });

      el.replaceWith(svg);
    }
  };

  replace();

  if (!watch || typeof MutationObserver === "undefined") {
    return () => undefined;
  }

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof HTMLElement) {
          if (node.hasAttribute(nameAttr)) {
            replace(node.parentNode ?? document);
          } else {
            replace(node);
          }
        }
      }
    }
  });
  // `document.body` is null when called from a script in <head>; watching the
  // root element still catches the placeholders as the body is parsed.
  observer.observe(document.body ?? document.documentElement, {
    childList: true,
    subtree: true,
  });

  return () => observer.disconnect();
}
