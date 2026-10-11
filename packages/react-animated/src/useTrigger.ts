"use client";

import { inView } from "motion";
import {
  createContext,
  type MouseEvent,
  type PointerEvent,
  type Ref,
  type RefObject,
  useEffect,
  useState,
} from "react";
import type { AnimationOptions, AnimationTriggers } from "./types";

/** What an `<AnimateIcon>` passes down to the icons inside it. */
export interface AnimateIconContextValue {
  animation: string | undefined;
  options: AnimationOptions;
  /** Whether it's pressed with `animateOnTap` (a tap always plays to the end). */
  tap: boolean;
  trigger: boolean | string | undefined;
}

export const AnimateIconContext = createContext<AnimateIconContextValue | null>(
  null
);

type Margin = NonNullable<Parameters<typeof inView>[2]>["margin"];

interface TriggerHandlers {
  onMouseEnter?: (event: MouseEvent<Element>) => void;
  onMouseLeave?: (event: MouseEvent<Element>) => void;
  onPointerDown?: (event: PointerEvent<Element>) => void;
  onPointerUp?: (event: PointerEvent<Element>) => void;
}

/**
 * Tracks the triggers set on one element (hover, press, in view, `animate`).
 * Returns the active trigger — false, true, or the animation name it asks for —
 * and the event handlers to attach to the element.
 */
export function useTrigger(
  {
    animate,
    animateOnHover,
    animateOnTap,
    animateOnView,
    animateOnViewMargin,
    animateOnViewOnce = true,
  }: AnimationTriggers,
  ref: RefObject<Element | null>
) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [visible, setVisible] = useState(false);
  const watchView = Boolean(animateOnView);

  useEffect(() => {
    const el = ref.current;
    if (!(watchView && el)) {
      return;
    }
    let stopWatching: () => void = () => undefined;
    stopWatching = inView(
      el,
      () => {
        setVisible(true);
        if (animateOnViewOnce) {
          stopWatching();
          return;
        }
        return () => setVisible(false);
      },
      { margin: animateOnViewMargin as Margin }
    );
    return () => {
      stopWatching();
      setVisible(false);
    };
  }, [ref, watchView, animateOnViewMargin, animateOnViewOnce]);

  const tap = pressed && Boolean(animateOnTap);
  const trigger =
    animate ||
    (tap && animateOnTap) ||
    (hovered && animateOnHover) ||
    (visible && animateOnView);

  const handlers: TriggerHandlers = {};
  if (animateOnHover || animateOnTap) {
    handlers.onMouseLeave = () => {
      setHovered(false);
      setPressed(false);
    };
  }
  if (animateOnHover) {
    handlers.onMouseEnter = () => setHovered(true);
  }
  if (animateOnTap) {
    handlers.onPointerDown = () => setPressed(true);
    handlers.onPointerUp = () => setPressed(false);
  }

  return { trigger, tap: tap && !animate, handlers };
}

/** Calls the consumer's handler, then ours. */
export function composeHandlers<P extends object>(
  props: P,
  handlers: TriggerHandlers
): Partial<P> {
  const composed: Record<string, unknown> = {};
  for (const [name, ours] of Object.entries(handlers)) {
    const theirs = (props as Record<string, unknown>)[name];
    composed[name] =
      typeof theirs === "function"
        ? (event: unknown) => {
            theirs(event);
            ours(event as never);
          }
        : ours;
  }
  return composed as Partial<P>;
}

/** One ref callback that sets every ref given. */
export function mergeRefs<T>(...refs: (Ref<T> | undefined)[]) {
  return (value: T | null) => {
    for (const ref of refs) {
      if (typeof ref === "function") {
        ref(value);
      } else if (ref) {
        (ref as { current: T | null }).current = value;
      }
    }
  };
}
