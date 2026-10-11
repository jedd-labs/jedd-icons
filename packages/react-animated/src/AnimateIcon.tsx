"use client";

import {
  cloneElement,
  createElement,
  type HTMLAttributes,
  isValidElement,
  type ReactElement,
  type ReactNode,
  type Ref,
  useMemo,
  useRef,
  version,
} from "react";
import type { AnimationOptions, AnimationTriggers } from "./types";
import {
  AnimateIconContext,
  composeHandlers,
  mergeRefs,
  useTrigger,
} from "./useTrigger";

export interface AnimateIconProps
  extends AnimationTriggers,
    AnimationOptions,
    Omit<HTMLAttributes<HTMLElement>, "children"> {
  /** Attach the triggers to the only child instead of wrapping it in a `<span>`. */
  asChild?: boolean;
  children: ReactNode;
}

// React 19 passes `ref` as a prop; earlier versions keep it on the element
// (and React 19 warns when `element.ref` is read).
const childRef = (child: ReactElement): Ref<HTMLElement> | undefined =>
  Number.parseInt(version, 10) >= 19
    ? (child.props as { ref?: Ref<HTMLElement> }).ref
    : (child as unknown as { ref?: Ref<HTMLElement> }).ref;

/**
 * Animates the icons inside it from triggers on a larger element, e.g. a
 * button whose hover animates its icon:
 *
 * ```tsx
 * <AnimateIcon animateOnHover asChild>
 *   <button><Bell /> Notify me</button>
 * </AnimateIcon>
 * ```
 *
 * Icons inside take its animation and options unless they set their own.
 */
export function AnimateIcon({
  animate,
  animateOnHover,
  animateOnTap,
  animateOnView,
  animateOnViewMargin,
  animateOnViewOnce,
  animation,
  asChild = false,
  children,
  completeOnStop,
  delay,
  initialOnAnimateEnd,
  loop,
  loopDelay,
  persistOnAnimateEnd,
  ...props
}: AnimateIconProps) {
  const ref = useRef<HTMLElement>(null);
  const { trigger, tap, handlers } = useTrigger(
    {
      animate,
      animateOnHover,
      animateOnTap,
      animateOnView,
      animateOnViewMargin,
      animateOnViewOnce,
    },
    ref
  );

  const value = useMemo(
    () => ({
      trigger,
      tap,
      animation,
      options: {
        completeOnStop,
        delay,
        initialOnAnimateEnd,
        loop,
        loopDelay,
        persistOnAnimateEnd,
      },
    }),
    [
      trigger,
      tap,
      animation,
      completeOnStop,
      delay,
      initialOnAnimateEnd,
      loop,
      loopDelay,
      persistOnAnimateEnd,
    ]
  );

  let content: ReactNode;
  if (asChild && isValidElement(children)) {
    const childProps = children.props as Record<string, unknown>;
    content = cloneElement(children, {
      ...props,
      ...childProps,
      ...composeHandlers(childProps, handlers),
      ref: mergeRefs(childRef(children), ref),
    } as Record<string, unknown>);
  } else {
    content = createElement(
      "span",
      { ...props, ...composeHandlers(props, handlers), ref },
      children
    );
  }

  return createElement(AnimateIconContext.Provider, { value }, content);
}
