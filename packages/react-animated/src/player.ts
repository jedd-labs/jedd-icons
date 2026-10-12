import {
  type AnimationOptions,
  type AnimationPlaybackControls,
  animate,
  type DOMKeyframesDefinition,
} from "motion";
import type { Animation, Value } from "./animation-types";
import type { ReducedMotion } from "./JeddProvider";

/** How a play behaves over time; see `AnimationOptions` in `types.ts`. */
export interface PlayOptions {
  completeOnStop: boolean;
  /** Milliseconds before the first run. */
  delay: number;
  initialOnAnimateEnd: boolean;
  loop: boolean;
  /** Milliseconds between runs when looping. */
  loopDelay: number;
  persistOnAnimateEnd: boolean;
  reducedMotion: ReducedMotion;
}

/** Plays animations on one rendered icon. Framework-free: it only needs the `<svg>`. */
export interface Player {
  destroy(): void;
  play(animation: Animation, options: PlayOptions): void;
  stop(): void;
}

// Where each value rests: the icon as drawn. Attributes (`d`, `r`…) rest at
// their value in the rendered icon, read before they're first animated.
const REST: Record<string, Value> = {
  x: 0,
  y: 0,
  rotate: 0,
  scale: 1,
  scaleX: 1,
  scaleY: 1,
  opacity: 1,
  pathLength: 1,
  pathOffset: 0,
};

const RETURN_TRANSITION: AnimationOptions = { duration: 0.25, ease: "easeOut" };

// What Motion writes to draw a partial stroke. Removed once a stroke is back at
// rest, so a resting animated icon renders exactly like the static one (a
// leftover `stroke-dasharray: 1px 1px` can leave a hairline gap in Safari).
const PATH_LENGTH_ATTRS = [
  "pathLength",
  "stroke-dasharray",
  "stroke-dashoffset",
];

const PART_INDEX = /^\d+$/;

const reduceMotion = (setting: ReducedMotion) =>
  setting === "always" ||
  (setting === "user" &&
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

export function createPlayer(svg: SVGSVGElement): Player {
  // Every element animated so far, with the values to return it to.
  const rest = new Map<SVGElement, Record<string, Value>>();
  let running: AnimationPlaybackControls[] = [];
  // Bumped by every play/stop, so an outdated run stops at its next step.
  let generation = 0;
  let interrupt: () => void = () => undefined;
  let active = false;
  let runInProgress = false;
  let current: PlayOptions | null = null;

  const targets = (key: string): SVGElement[] => {
    let selector = `[data-group="${key}"]`;
    if (key === "*") {
      selector = "[data-part]";
    } else if (PART_INDEX.test(key)) {
      selector = `[data-part="${key}"]`;
    }
    return [...svg.querySelectorAll<SVGElement>(selector)];
  };

  const restOf = (el: SVGElement, keys: string[]) => {
    const values = rest.get(el) ?? {};
    for (const key of keys) {
      values[key] ??= REST[key] ?? el.getAttribute(key) ?? 0;
    }
    rest.set(el, values);
    return values;
  };

  /** Resolves true once `promise` settles, false if interrupted first. */
  const unlessInterrupted = (promise: Promise<unknown>) => {
    const gen = generation;
    return new Promise<boolean>((resolve) => {
      interrupt = () => resolve(false);
      promise.then(
        () => resolve(gen === generation),
        () => resolve(false)
      );
    });
  };

  const sleep = (ms: number) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const done = unlessInterrupted(
      new Promise((resolve) => {
        timer = setTimeout(resolve, ms);
      })
    );
    return done.finally(() => clearTimeout(timer));
  };

  const cancel = () => {
    generation += 1;
    for (const controls of running) {
      controls.stop();
    }
    running = [];
    runInProgress = false;
    interrupt();
  };

  // `fromRest`: a looped run starts over, so single values (`x: 3`) animate
  // from rest again instead of from where the previous run ended.
  const run = (animation: Animation, fromRest: boolean) => {
    running = Object.entries(animation).flatMap(([key, part]) =>
      targets(key).map((el) => {
        const values = restOf(el, Object.keys(part.animate));
        const keyframes: Record<string, unknown> = {};
        for (const [name, value] of Object.entries(part.animate)) {
          keyframes[name] =
            fromRest && !Array.isArray(value) ? [values[name], value] : value;
        }
        if (part.origin) {
          keyframes.transformOrigin = part.origin;
        }
        return animate(
          el,
          keyframes as DOMKeyframesDefinition,
          part.transition as AnimationOptions
        );
      })
    );
    const gen = generation;
    runInProgress = true;
    return unlessInterrupted(
      Promise.all(running.map((controls) => controls.finished))
    ).finally(() => {
      // An interrupted run settles after the next one has started.
      if (gen === generation) {
        runInProgress = false;
      }
    });
  };

  // A run that ends on whole turns (a 360° spin) looks like rest; reset the
  // angle so returning to rest doesn't spin it back.
  const settleTurns = (animation: Animation) => {
    for (const [key, part] of Object.entries(animation)) {
      const frames = part.animate.rotate;
      const end = Array.isArray(frames) ? frames.at(-1) : frames;
      if (typeof end === "number" && end !== 0 && end % 360 === 0) {
        for (const el of targets(key)) {
          animate(el, { rotate: 0 }, { duration: 0 });
        }
      }
    }
  };

  const returnToRest = (instant = false) => {
    const gen = generation;
    running = [...rest].map(([el, values]) =>
      animate(
        el,
        values as DOMKeyframesDefinition,
        instant ? { duration: 0 } : RETURN_TRANSITION
      )
    );
    Promise.all(running.map((controls) => controls.finished)).then(() => {
      if (gen !== generation) {
        return;
      }
      running = [];
      for (const [el, values] of rest) {
        if ("pathLength" in values) {
          for (const attr of PATH_LENGTH_ATTRS) {
            el.removeAttribute(attr);
          }
        }
      }
    });
  };

  // One run, or runs while active when looping. False once interrupted.
  const runAll = async (animation: Animation, options: PlayOptions) => {
    let again = false;
    do {
      if (!(await run(animation, again))) {
        return false;
      }
      settleTurns(animation);
      if (options.initialOnAnimateEnd) {
        returnToRest(true);
      }
      again = options.loop && active;
      if (again && options.loopDelay > 0 && !(await sleep(options.loopDelay))) {
        return false;
      }
    } while (again && active);
    return true;
  };

  const play = async (animation: Animation, options: PlayOptions) => {
    cancel();
    active = true;
    current = options;
    if (reduceMotion(options.reducedMotion)) {
      return;
    }
    if (options.delay > 0 && !(await sleep(options.delay))) {
      return;
    }
    // Stopped mid-run with `completeOnStop`: the run has now finished.
    if (
      (await runAll(animation, options)) &&
      !active &&
      !options.persistOnAnimateEnd
    ) {
      returnToRest();
    }
  };

  const stop = () => {
    if (!active) {
      return;
    }
    active = false;
    if (current?.completeOnStop && runInProgress) {
      // `play` returns to rest once the current run ends.
      return;
    }
    cancel();
    if (!current?.persistOnAnimateEnd) {
      returnToRest();
    }
  };

  return {
    play(animation, options) {
      play(animation, options).catch(() => undefined);
    },
    stop,
    destroy() {
      active = false;
      cancel();
      rest.clear();
    },
  };
}
