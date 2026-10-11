"use client";

import { Icon } from "@jedd-icons/react";
import {
  createElement,
  forwardRef,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { createPlayer, type Player, type PlayOptions } from "./player";
import { presets } from "./presets";
import type {
  AnimatedIconProps,
  AnimatedJeddIcon,
  AnimationName,
  AnimationOptions,
  Animations,
  IconNode,
} from "./types";
import {
  AnimateIconContext,
  type AnimateIconContextValue,
  composeHandlers,
  mergeRefs,
  useTrigger,
} from "./useTrigger";

const toPascalCase = (s: string) =>
  s.replace(/(^|-)([a-z0-9])/g, (_, __, c) => c.toUpperCase());

type Trigger = AnimateIconContextValue["trigger"];

/** A string trigger names the animation; otherwise `animation`, then the parent's. */
function pickAnimation(
  own: Trigger,
  parent: AnimateIconContextValue | null,
  animation: string | undefined
) {
  if (own) {
    return typeof own === "string" ? own : (animation ?? parent?.animation);
  }
  return (
    animation ??
    (typeof parent?.trigger === "string" ? parent.trigger : parent?.animation)
  );
}

/** Its own options, then the parent's, then the defaults. A tap plays to the end. */
function playOptions(
  own: AnimationOptions,
  inherited: AnimationOptions,
  tap: boolean
): PlayOptions {
  const pick = <K extends keyof AnimationOptions>(key: K) =>
    own[key] ?? inherited[key];
  return {
    completeOnStop: (pick("completeOnStop") ?? false) || tap,
    delay: pick("delay") ?? 0,
    initialOnAnimateEnd: pick("initialOnAnimateEnd") ?? false,
    loop: pick("loop") ?? false,
    loopDelay: pick("loopDelay") ?? 0,
    persistOnAnimateEnd: pick("persistOnAnimateEnd") ?? false,
  };
}

/**
 * An animated icon component. `iconNode` is the icon's unmerged source
 * geometry with `data-part`/`data-group` markers; `animations` are the icon's
 * own, played on top of the presets. Renders through `@jedd-icons/react`'s
 * `Icon`, so it takes the same props and renders the same at rest.
 */
export default function createAnimatedJeddIcon<N extends string = never>(
  iconName: string,
  iconNode: IconNode,
  animations: Animations
): AnimatedJeddIcon<N> {
  const available: Animations = {
    ...presets,
    default: presets.draw,
    ...animations,
  };
  const names = [
    ...new Set([
      ...Object.keys(animations),
      "default",
      ...Object.keys(presets),
    ]),
  ] as AnimationName<N>[];

  const Component = forwardRef<SVGSVGElement, AnimatedIconProps>(
    (
      {
        animate,
        animateOnHover,
        animateOnTap,
        animateOnView,
        animateOnViewMargin,
        animateOnViewOnce,
        animation,
        className,
        completeOnStop,
        delay,
        initialOnAnimateEnd,
        loop,
        loopDelay,
        persistOnAnimateEnd,
        ...props
      },
      ref
    ) => {
      const svgRef = useRef<SVGSVGElement>(null);
      const playerRef = useRef<Player | null>(null);
      const parent = useContext(AnimateIconContext);
      const own = useTrigger(
        {
          animate,
          animateOnHover,
          animateOnTap,
          animateOnView,
          animateOnViewMargin,
          animateOnViewOnce,
        },
        svgRef
      );

      // Its own trigger wins; otherwise it follows the <AnimateIcon> around it.
      const active = Boolean(own.trigger || parent?.trigger);
      const picked = pickAnimation(own.trigger, parent, animation);
      const name = picked && picked in available ? picked : "default";
      const options = playOptions(
        {
          completeOnStop,
          delay,
          initialOnAnimateEnd,
          loop,
          loopDelay,
          persistOnAnimateEnd,
        },
        parent?.options ?? {},
        own.trigger ? own.tap : Boolean(parent?.tap)
      );

      useEffect(() => {
        if (!svgRef.current) {
          return;
        }
        const player = createPlayer(svgRef.current);
        playerRef.current = player;
        return () => {
          player.destroy();
          playerRef.current = null;
        };
      }, []);

      // biome-ignore lint/correctness/useExhaustiveDependencies: replays only when what plays changes, not on every new `options` object
      useEffect(() => {
        const player = playerRef.current;
        if (!player) {
          return;
        }
        if (active) {
          player.play(available[name], options);
        } else {
          player.stop();
        }
      }, [
        active,
        name,
        options.completeOnStop,
        options.delay,
        options.initialOnAnimateEnd,
        options.loop,
        options.loopDelay,
        options.persistOnAnimateEnd,
      ]);

      const setRefs = useMemo(() => mergeRefs(ref, svgRef), [ref]);

      return createElement(Icon, {
        ...props,
        ...composeHandlers(props, own.handlers),
        ref: setRefs,
        iconNode,
        className: ["jedd", `jedd-${iconName}`, className]
          .filter(Boolean)
          .join(" "),
      });
    }
  );

  Component.displayName = toPascalCase(iconName);
  return Object.assign(Component, { animations: names }) as AnimatedJeddIcon<N>;
}
