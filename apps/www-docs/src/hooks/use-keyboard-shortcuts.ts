import { useEffect } from "react";

/** True when the event originates from a field the user is typing into,
 *  so page-level shortcuts don't hijack their keystrokes. */
function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

export interface KeyboardShortcut {
  handler: () => void;
  /** Single key, matched case-insensitively (e.g. "e"). */
  key: string;
}

/**
 * Registers window-level single-key shortcuts. Ignores keypresses that carry
 * a modifier, are auto-repeats, or land on an editable element.
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.repeat ||
        isEditableTarget(event.target)
      ) {
        return;
      }

      const pressed = event.key.toLowerCase();
      const match = shortcuts.find((s) => s.key.toLowerCase() === pressed);
      match?.handler();
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [shortcuts]);
}
