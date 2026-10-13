"use client";

import {
  createElement,
  forwardRef,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import Icon from "./Icon";
import { useJeddContext } from "./JeddProvider";
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

// Bundlers replace `process.env.NODE_ENV`; without one (and without `process`)
// this throws, which counts as development.
declare const process: { env: { NODE_ENV?: string } };
const isProduction = () => {
  try {
    return process.env.NODE_ENV === "production";
  } catch {
    return false;
  }
};

const warned = new Set<string>();

/** Once per icon and name, in development: a name the icon doesn't have. */
function warnUnknown(component: string, name: string) {
  const key = `${component}:${name}`;
  if (warned.has(key) || isProduction()) {
    return;
  }
  warned.add(key);
  console.warn(
    `[jedd-icons] <${component}> has no animation "${name}"; playing its default.`
  );
}

/**
 * The animation to play. `default` (or no name) is the icon's own default,
 * else the provider's `fallbackAnimation`, else `draw`; a name the icon
 * doesn't have plays that default too.
 */
function resolveAnimation(
  { name: picked, inherited }: ReturnType<typeof pickAnimation>,
  available: Animations,
  ownDefault: string | undefined,
  fallback: string | undefined,
  component: string
): string {
  if (picked && picked !== "default") {
    if (picked in available) {
      return picked;
    }
    if (!inherited) {
      warnUnknown(component, picked);
    }
  }
  for (const name of [ownDefault, fallback]) {
    if (name && name in available) {
      return name;
    }
  }
  return "draw";
}

type Trigger = AnimateIconContextValue["trigger"];

/**
 * A string trigger names the animation; otherwise `animation`, then the
 * parent's. `inherited`: the name came from the <AnimateIcon> around it, which
 * may name an animation only some of its icons have.
 */
function pickAnimation(
  own: Trigger,
  parent: AnimateIconContextValue | null,
  animation: string | undefined
): { name: string | undefined; inherited: boolean } {
  if (own && typeof own === "string") {
    return { name: own, inherited: false };
  }
  if (animation !== undefined) {
    return { name: animation, inherited: false };
  }
  if (own) {
    return { name: parent?.animation, inherited: true };
  }
  return {
    name:
      typeof parent?.trigger === "string" ? parent.trigger : parent?.animation,
    inherited: true,
  };
}

/**
 * Each option from the icon, then the <AnimateIcon> around it, then the
 * nearest JeddProvider, then the default. A tap always plays to the end.
 */
function playOptions(
  own: AnimationOptions,
  inherited: AnimationOptions,
  provider: ReturnType<typeof useJeddContext>,
  tap: boolean
): PlayOptions {
  const pick = <K extends keyof AnimationOptions>(key: K) =>
    own[key] ?? inherited[key] ?? provider[key];
  return {
    completeOnStop: (pick("completeOnStop") ?? false) || tap,
    delay: pick("delay") ?? 0,
    initialOnAnimateEnd: pick("initialOnAnimateEnd") ?? false,
    loop: pick("loop") ?? false,
    loopDelay: pick("loopDelay") ?? 0,
    persistOnAnimateEnd: pick("persistOnAnimateEnd") ?? false,
    reducedMotion: provider.reducedMotion ?? "user",
  };
}

/**
 * An animated icon component. `iconNode` is the icon's unmerged source
 * geometry with `data-part`/`data-group` markers; `animations` are the icon's
 * own, beside the presets, and `defaultAnimation` names the one (or the
 * preset) `default` plays. Takes the same props as the icons of
 * `@jedd-icons/react` and renders the same at rest (see `Icon.tsx`).
 */
export default function createAnimatedJeddIcon<N extends string = never>(
  iconName: string,
  iconNode: IconNode,
  animations: Animations,
  defaultAnimation?: string
): AnimatedJeddIcon<N> {
  const available: Animations = { ...presets, ...animations };
  const displayName = toPascalCase(iconName);
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
      const provider = useJeddContext();
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
      const name = resolveAnimation(
        picked,
        available,
        defaultAnimation,
        provider.fallbackAnimation,
        displayName
      );
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
        provider,
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
        options.reducedMotion,
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

  Component.displayName = displayName;
  return Object.assign(Component, {
    animations: names,
    defaultAnimation,
  }) as AnimatedJeddIcon<N>;
}
