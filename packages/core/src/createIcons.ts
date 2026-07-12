import type { IconNode } from "@jedd-icons/shared";
import { type CreateElementOptions, createElement } from "./createElement";

export interface CreateIconsOptions {
  attrs?: CreateElementOptions;
  icons?: Record<string, IconNode>;
  nameAttr?: string;
  watch?: boolean;
}

export function createIcons({
  icons = {},
  attrs = {},
  nameAttr = "data-jedd-test",
  watch = false,
}: CreateIconsOptions = {}): void {
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

      const svg = createElement(iconNode, {
        ...elAttrs,
        class: ["jedd", `jedd-${name}`, el.getAttribute("class")]
          .filter(Boolean)
          .join(" "),
      });

      el.replaceWith(svg);
    }
  };

  replace();

  if (watch && typeof MutationObserver !== "undefined") {
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
    observer.observe(document.body, { childList: true, subtree: true });
  }
}
