import { useEffect, useRef } from "react";

/** True when a key press belongs to a text field or slider, not a shortcut. */
export function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  const tag = el?.tagName;
  return (
    tag === "INPUT" || tag === "TEXTAREA" || el?.isContentEditable === true
  );
}

/**
 * Global single-key shortcuts, keyed by `KeyboardEvent.key` in lowercase
 * (`"g"`, `"escape"`, `"arrowdown"`). Ignored while typing or with a modifier held, so browser and
 * text-editing shortcuts keep working.
 */
export function useShortcuts(handlers: Record<string, () => void>) {
  const latest = useRef(handlers);
  useEffect(() => {
    latest.current = handlers;
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) {
        return;
      }
      const handler = latest.current[e.key.toLowerCase()];
      if (handler) {
        e.preventDefault();
        handler();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
