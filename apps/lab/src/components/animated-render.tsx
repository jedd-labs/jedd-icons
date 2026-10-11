import * as AnimatedLib from "@jedd-icons/react-animated";
import {
  type AnimatedJeddIcon,
  AnimateIcon,
  type AnimationOptions,
  presets,
} from "@jedd-icons/react-animated";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { useId, useState } from "react";
import { getPascalName } from "@/lib/icon-nodes";

const ANIMATED = AnimatedLib as unknown as Record<string, unknown>;

type Mode = "hover" | "tap" | "view" | "once" | "loop";

const MODES: { mode: Mode; label: string; hint: string }[] = [
  { mode: "hover", label: "Hover", hint: "animateOnHover" },
  { mode: "tap", label: "Click", hint: "animateOnTap" },
  { mode: "view", label: "In view", hint: "animateOnView" },
  { mode: "once", label: "Play once", hint: "animate" },
  { mode: "loop", label: "Loop", hint: "animate loop" },
];

// Modes that play on mount, so they need a way to play again.
const REPLAYABLE = new Set<Mode>(["view", "once"]);

type Flag = "completeOnStop" | "persistOnAnimateEnd" | "initialOnAnimateEnd";

const FLAGS: { key: Flag; hint: string }[] = [
  {
    key: "completeOnStop",
    hint: "Finish the run before returning to rest when stopped",
  },
  {
    key: "persistOnAnimateEnd",
    hint: "Stay where the animation ended instead of returning to rest",
  },
  {
    key: "initialOnAnimateEnd",
    hint: "Snap back to rest, without a transition, when a run ends",
  },
];

interface Settings extends Required<Pick<AnimationOptions, Flag>> {
  delay: number;
  loopDelay: number;
  viewOnce: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  delay: 0,
  loopDelay: 0,
  completeOnStop: false,
  persistOnAnimateEnd: false,
  initialOnAnimateEnd: false,
  viewOnce: true,
};

type Props = Record<string, boolean | number | string>;

function triggerProps(mode: Mode, settings: Settings): Props {
  switch (mode) {
    case "hover":
      return { animateOnHover: true };
    case "tap":
      return { animateOnTap: true };
    case "view":
      return settings.viewOnce
        ? { animateOnView: true }
        : { animateOnView: true, animateOnViewOnce: false };
    case "once":
      return { animate: true };
    default:
      return settings.loopDelay > 0
        ? { animate: true, loop: true, loopDelay: settings.loopDelay }
        : { animate: true, loop: true };
  }
}

/** The props a mode + settings come to, leaving out the defaults. */
function animationProps(
  mode: Mode,
  animation: string,
  settings: Settings
): Props {
  const props: Props = animation === "default" ? {} : { animation };
  Object.assign(props, triggerProps(mode, settings));
  if (settings.delay > 0) {
    props.delay = settings.delay;
  }
  for (const { key } of FLAGS) {
    if (settings[key]) {
      props[key] = true;
    }
  }
  return props;
}

/** `<Name prop prop="x" prop={1} />`, as a consumer would write it. */
function toJsx(name: string, props: Props): string {
  const attrs = Object.entries(props).map(([key, value]) => {
    if (value === true) {
      return key;
    }
    return typeof value === "string"
      ? `${key}="${value}"`
      : `${key}={${value}}`;
  });
  return `<${[name, ...attrs].join(" ")} />`;
}

const toMs = (value: string) => Math.max(0, Math.round(Number(value) || 0));

/**
 * Plays the icon from `@jedd-icons/react-animated` with any of its
 * animations, triggers and options, plus driven from a button around it, and
 * shows the JSX for what's set.
 */
export function AnimatedRender({
  name,
  strokeWidth,
}: {
  name: string;
  strokeWidth: number;
}) {
  const id = useId();
  const pascal = getPascalName(name, "stroke");
  const Component = (pascal ? ANIMATED[pascal] : undefined) as
    | AnimatedJeddIcon
    | undefined;
  const [picked, setPicked] = useState("default");
  const [mode, setMode] = useState<Mode>("hover");
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [replays, setReplays] = useState(0);
  const [copied, setCopied] = useState(false);

  if (!(Component && pascal)) {
    return (
      <p className="text-muted-foreground text-xs">
        No animated component for this icon.
      </p>
    );
  }

  // The last pick may not exist on the next icon.
  const animation = Component.animations.includes(picked) ? picked : "default";
  // The icon's own animations, beside `default` and the presets.
  const isOwn = (a: string) => a !== "default" && !(a in presets);
  const props = animationProps(mode, animation, settings);
  const code = toJsx(pascal, props);
  // Any change remounts the icons, so each setting starts from rest.
  const key = `${code}-${replays}`;

  const set = <K extends keyof Settings>(k: K, value: Settings[K]) =>
    setSettings((s) => ({ ...s, [k]: value }));

  const copy = () => {
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  };

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <span className="font-medium text-muted-foreground text-xs">
        Animated render
        <span className="ml-1.5 text-[10px]">@jedd-icons/react-animated</span>
      </span>

      <div className="flex flex-wrap items-end justify-center gap-8">
        {([24, 48, 96] as const).map((size) => (
          <div className="flex flex-col items-center gap-1.5" key={size}>
            <div className="flex h-24 items-center justify-center">
              <Component
                key={key}
                size={size}
                strokeWidth={strokeWidth}
                {...props}
              />
            </div>
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {size}
            </span>
          </div>
        ))}
      </div>

      {/* Animation */}
      <div className="flex flex-wrap items-center justify-center gap-1">
        {Component.animations.map((a) => (
          <Button
            key={a}
            onClick={() => setPicked(a)}
            size="xs"
            title={isOwn(a) ? "This icon's own" : undefined}
            variant={a === animation ? "default" : "outline"}
          >
            {a}
            {isOwn(a) ? " ★" : ""}
          </Button>
        ))}
      </div>

      {/* Trigger */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <div className="flex flex-wrap overflow-hidden rounded-none border border-border">
          {MODES.map((m) => (
            <button
              className={`px-2.5 py-1 text-xs transition-colors ${
                mode === m.mode
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              key={m.mode}
              onClick={() => setMode(m.mode)}
              title={m.hint}
              type="button"
            >
              {m.label}
            </button>
          ))}
        </div>
        {REPLAYABLE.has(mode) && (
          <Button
            onClick={() => setReplays((n) => n + 1)}
            size="xs"
            variant="outline"
          >
            Replay
          </Button>
        )}
      </div>

      {/* Options */}
      <div className="grid w-full max-w-md grid-cols-1 gap-x-4 gap-y-2 text-xs sm:grid-cols-2">
        <Label className="gap-2" htmlFor={`${id}-delay`}>
          <span className="w-16 shrink-0 font-mono text-muted-foreground">
            delay
          </span>
          <Input
            className="h-7"
            id={`${id}-delay`}
            min={0}
            onChange={(e) => set("delay", toMs(e.target.value))}
            step={100}
            type="number"
            value={settings.delay}
          />
          <span className="text-muted-foreground">ms</span>
        </Label>
        <Label
          className="gap-2"
          htmlFor={`${id}-loopDelay`}
          title={mode === "loop" ? undefined : "Only used in Loop mode"}
        >
          <span className="w-16 shrink-0 font-mono text-muted-foreground">
            loopDelay
          </span>
          <Input
            className="h-7"
            disabled={mode !== "loop"}
            id={`${id}-loopDelay`}
            min={0}
            onChange={(e) => set("loopDelay", toMs(e.target.value))}
            step={100}
            type="number"
            value={settings.loopDelay}
          />
          <span className="text-muted-foreground">ms</span>
        </Label>
        {FLAGS.map(({ key: flag, hint }) => (
          <Label htmlFor={`${id}-${flag}`} key={flag} title={hint}>
            <Checkbox
              checked={settings[flag]}
              id={`${id}-${flag}`}
              onCheckedChange={(c) => set(flag, c === true)}
            />
            <span className="font-mono text-muted-foreground">{flag}</span>
          </Label>
        ))}
        <Label
          htmlFor={`${id}-viewOnce`}
          title="Only the first time it's in view (In view mode)"
        >
          <Checkbox
            checked={settings.viewOnce}
            disabled={mode !== "view"}
            id={`${id}-viewOnce`}
            onCheckedChange={(c) => set("viewOnce", c === true)}
          />
          <span className="font-mono text-muted-foreground">
            animateOnViewOnce
          </span>
        </Label>
      </div>

      {/* The JSX for what's set */}
      <div className="flex w-full max-w-md items-start gap-2 rounded-none border border-border bg-muted/20 px-3 py-2">
        <code className="min-w-0 flex-1 break-words font-mono text-[11px] leading-relaxed">
          {code}
        </code>
        <button
          className="shrink-0 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
          onClick={copy}
          type="button"
        >
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>

      {/* Driven from a larger element, with the same animation and options. */}
      <AnimateIcon
        animateOnHover
        animation={animation}
        asChild
        completeOnStop={settings.completeOnStop}
        delay={settings.delay}
        initialOnAnimateEnd={settings.initialOnAnimateEnd}
        persistOnAnimateEnd={settings.persistOnAnimateEnd}
      >
        <Button size="sm" variant="outline">
          Hover this button
          <Component strokeWidth={strokeWidth} />
        </Button>
      </AnimateIcon>
    </div>
  );
}
