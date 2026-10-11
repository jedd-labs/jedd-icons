import { useEffect, useState } from "react";

const STORAGE_KEY = "jedd-lab-view";

/** Canvas settings, kept in localStorage so they survive a reload. */
const DEFAULT_VIEW = {
  /** Rendered pixel size of the canvas. */
  zoom: 480,
  strokeWidth: 2,
  grid: true,
  keylines: true,
  anchors: true,
  controls: true,
  bounds: false,
  perPiece: false,
};

export type ViewPrefs = typeof DEFAULT_VIEW;

/** The on/off view settings. */
export type Overlay = {
  [K in keyof ViewPrefs]: ViewPrefs[K] extends boolean ? K : never;
}[keyof ViewPrefs];

// Takes each stored value only if it has the default's type, so a stale or
// hand-edited entry can't break the page.
function loadView(): ViewPrefs {
  let stored: Record<string, unknown> = {};
  try {
    const parsed: unknown = JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) ?? "{}"
    );
    if (parsed && typeof parsed === "object") {
      stored = parsed as Record<string, unknown>;
    }
  } catch {
    // Unreadable entry: fall back to the defaults.
  }
  const view: Record<string, unknown> = { ...DEFAULT_VIEW };
  for (const [key, value] of Object.entries(DEFAULT_VIEW)) {
    if (typeof stored[key] === typeof value) {
      view[key] = stored[key];
    }
  }
  return view as ViewPrefs;
}

/** The view settings, persisted. `overrides` apply on first load only. */
export function useViewPrefs(overrides?: Partial<ViewPrefs>) {
  const [view, setView] = useState(() => ({ ...loadView(), ...overrides }));

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(view));
  }, [view]);

  const setPref = <K extends keyof ViewPrefs>(key: K, value: ViewPrefs[K]) =>
    setView((v) => (v[key] === value ? v : { ...v, [key]: value }));

  const toggle = (key: Overlay) => setView((v) => ({ ...v, [key]: !v[key] }));

  return { view, setPref, toggle };
}
