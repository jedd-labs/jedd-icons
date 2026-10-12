import type { ReducedMotion } from "@jedd-icons/react-animated";
import { useEffect, useState } from "react";

const STORAGE_KEY = "jedd-lab-animation";

/** What starts the animated render, and the prop(s) it comes to. */
export const TRIGGERS = [
  { value: "hover", label: "Hover", props: "animateOnHover" },
  { value: "tap", label: "Click", props: "animateOnTap" },
  { value: "view", label: "In view", props: "animateOnView" },
  { value: "once", label: "Play once", props: "animate" },
  { value: "loop", label: "Loop", props: "animate loop" },
] as const;

export type Trigger = (typeof TRIGGERS)[number]["value"];

/** `JeddProvider`'s `reducedMotion`, as the render offers it. */
export const REDUCED_MOTION = [
  { value: "user", label: "Follow OS", props: '"user"' },
  { value: "always", label: "Always reduce", props: '"always"' },
  { value: "never", label: "Never reduce", props: '"never"' },
] as const satisfies readonly {
  value: ReducedMotion;
  label: string;
  props: string;
}[];

/** Triggers that play on mount, so the render offers a replay. */
export const REPLAYABLE = new Set<Trigger>(["view", "once"]);

/** The animated render's settings, kept in localStorage like the view. */
const DEFAULT_ANIMATION_PREFS = {
  trigger: "hover" as Trigger,
  /** Milliseconds. */
  delay: 0,
  /** Milliseconds; Loop only. */
  loopDelay: 0,
  completeOnStop: false,
  persistOnAnimateEnd: false,
  initialOnAnimateEnd: false,
  /** `animateOnViewOnce`; In view only. */
  viewOnce: true,
  /** `JeddProvider reducedMotion` around the render. */
  reducedMotion: "user" as ReducedMotion,
};

export type AnimationPrefs = typeof DEFAULT_ANIMATION_PREFS;

const isTrigger = (value: unknown): value is Trigger =>
  TRIGGERS.some((t) => t.value === value);

// Takes each stored value only if it has the default's type (and a trigger
// only if it's one we know), so a stale entry can't break the page.
function loadPrefs(): AnimationPrefs {
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
  const prefs: Record<string, unknown> = { ...DEFAULT_ANIMATION_PREFS };
  for (const [key, value] of Object.entries(DEFAULT_ANIMATION_PREFS)) {
    if (typeof stored[key] === typeof value) {
      prefs[key] = stored[key];
    }
  }
  if (!isTrigger(prefs.trigger)) {
    prefs.trigger = DEFAULT_ANIMATION_PREFS.trigger;
  }
  if (!REDUCED_MOTION.some((r) => r.value === prefs.reducedMotion)) {
    prefs.reducedMotion = DEFAULT_ANIMATION_PREFS.reducedMotion;
  }
  return prefs as AnimationPrefs;
}

/** The animated render's settings, persisted. */
export function useAnimationPrefs() {
  const [prefs, setPrefs] = useState(loadPrefs);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  }, [prefs]);

  const setPref = <K extends keyof AnimationPrefs>(
    key: K,
    value: AnimationPrefs[K]
  ) => setPrefs((p) => (p[key] === value ? p : { ...p, [key]: value }));

  const reset = () => setPrefs(DEFAULT_ANIMATION_PREFS);

  const isDefault = Object.entries(DEFAULT_ANIMATION_PREFS).every(
    ([key, value]) => prefs[key as keyof AnimationPrefs] === value
  );

  return { prefs, setPref, reset, isDefault };
}

type Props = Record<string, boolean | number | string>;

function triggerProps(prefs: AnimationPrefs): Props {
  switch (prefs.trigger) {
    case "hover":
      return { animateOnHover: true };
    case "tap":
      return { animateOnTap: true };
    case "view":
      return prefs.viewOnce
        ? { animateOnView: true }
        : { animateOnView: true, animateOnViewOnce: false };
    case "once":
      return { animate: true };
    default:
      return prefs.loopDelay > 0
        ? { animate: true, loop: true, loopDelay: prefs.loopDelay }
        : { animate: true, loop: true };
  }
}

const FLAGS = [
  "completeOnStop",
  "persistOnAnimateEnd",
  "initialOnAnimateEnd",
] as const;

/** The props an animation + settings come to, leaving out the defaults. */
export function animationProps(
  animation: string,
  prefs: AnimationPrefs
): Props {
  const props: Props = animation === "default" ? {} : { animation };
  Object.assign(props, triggerProps(prefs));
  if (prefs.delay > 0) {
    props.delay = prefs.delay;
  }
  for (const flag of FLAGS) {
    if (prefs[flag]) {
      props[flag] = true;
    }
  }
  return props;
}

/**
 * `<Name prop prop="x" prop={1} />`, as a consumer would write it, inside a
 * `JeddProvider` when `reducedMotion` isn't the default.
 */
export function toJsx(
  name: string,
  props: Props,
  reducedMotion: ReducedMotion = "user"
): string {
  const attrs = Object.entries(props).map(([key, value]) => {
    if (value === true) {
      return key;
    }
    return typeof value === "string"
      ? `${key}="${value}"`
      : `${key}={${value}}`;
  });
  const icon = `<${[name, ...attrs].join(" ")} />`;
  return reducedMotion === "user"
    ? icon
    : `<JeddProvider reducedMotion="${reducedMotion}">\n  ${icon}\n</JeddProvider>`;
}
