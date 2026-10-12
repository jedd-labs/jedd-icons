import * as AnimatedLib from "@jedd-icons/react-animated";
import {
  type AnimatedJeddIcon,
  AnimateIcon,
  JeddProvider,
  presets,
} from "@jedd-icons/react-animated";
import { Button, buttonVariants } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { cn } from "@workspace/ui/lib/utils";
import { useState } from "react";
import { highlight } from "sugar-high";
import { getPascalName } from "@/lib/icon-nodes";
import {
  type AnimationPrefs,
  animationProps,
  REPLAYABLE,
  toJsx,
} from "@/lib/use-animation-prefs";

const ANIMATED = AnimatedLib as unknown as Record<string, unknown>;

const SIZES = [24, 48, 96] as const;

function AnimationPicker({
  animations,
  onChange,
  value,
}: {
  animations: readonly string[];
  onChange: (animation: string) => void;
  value: string;
}) {
  const own = animations.filter((a) => a !== "default" && !(a in presets));
  const groups = [
    { label: "This icon", items: ["default", ...own] },
    { label: "Presets", items: Object.keys(presets) },
  ];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "min-w-36 justify-between font-normal"
        )}
      >
        <span className="font-mono">{value}</span>
        <span aria-hidden className="text-[10px] text-muted-foreground">
          ▾
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuRadioGroup onValueChange={onChange} value={value}>
          {groups.map((group, i) => (
            <DropdownMenuGroup key={group.label}>
              {i > 0 && <DropdownMenuSeparator />}
              <DropdownMenuLabel>{group.label}</DropdownMenuLabel>
              {group.items.map((a) => (
                <DropdownMenuRadioItem closeOnClick key={a} value={a}>
                  <span className="font-mono">{a}</span>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuGroup>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * The stage for `@jedd-icons/react-animated`: the icon at common sizes and
 * inside a button, an animation picker, and the JSX for what's set. The
 * trigger and options live in the sidebar (`AnimationSettings`).
 */
export function AnimatedRender({
  name,
  prefs,
  strokeWidth,
}: {
  name: string;
  prefs: AnimationPrefs;
  strokeWidth: number;
}) {
  const pascal = getPascalName(name, "stroke");
  const Component = (pascal ? ANIMATED[pascal] : undefined) as
    | AnimatedJeddIcon
    | undefined;
  const [picked, setPicked] = useState("default");
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
  const props = animationProps(animation, prefs);
  const code = toJsx(pascal, props, prefs.reducedMotion);
  // Any change remounts the icons, so each setting starts from rest.
  const key = `${code}-${replays}`;

  const copy = () => {
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  };

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium text-muted-foreground text-xs">
          Motion
          <span className="ml-1.5 text-[10px]">@jedd-icons/react-animated</span>
        </span>
        <div className="flex items-center gap-1.5">
          {REPLAYABLE.has(prefs.trigger) && (
            <Button
              onClick={() => setReplays((n) => n + 1)}
              size="sm"
              title="Play again"
              variant="ghost"
            >
              ↻ Replay
            </Button>
          )}
          <AnimationPicker
            animations={Component.animations}
            onChange={setPicked}
            value={animation}
          />
        </div>
      </div>

      <JeddProvider reducedMotion={prefs.reducedMotion}>
        <div className="flex flex-1 flex-wrap items-end justify-center gap-x-8 gap-y-4 py-4">
          {SIZES.map((size) => (
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
          {/* Driven from a larger element, with the same animation and options. */}
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex h-24 items-center justify-center">
              <AnimateIcon
                animateOnHover
                animation={animation}
                asChild
                completeOnStop={prefs.completeOnStop}
                delay={prefs.delay}
                initialOnAnimateEnd={prefs.initialOnAnimateEnd}
                persistOnAnimateEnd={prefs.persistOnAnimateEnd}
              >
                <Button size="sm" variant="outline">
                  Next
                  <Component strokeWidth={strokeWidth} />
                </Button>
              </AnimateIcon>
            </div>
            <span
              className="text-[10px] text-muted-foreground"
              title="<AnimateIcon animateOnHover asChild> around a button"
            >
              in button
            </span>
          </div>
        </div>
      </JeddProvider>

      <div className="flex min-h-0 flex-col">
        <div className="flex items-center justify-between px-1 pb-1.5">
          <span className="font-medium text-muted-foreground text-xs">JSX</span>
          <button
            className="text-[10px] text-muted-foreground transition-colors hover:text-foreground"
            onClick={copy}
            type="button"
          >
            {copied ? "Copied ✓" : "Copy"}
          </button>
        </div>
        <pre className="whitespace-pre-wrap break-words rounded-none border border-border bg-muted/20 p-3 font-mono text-[11px] leading-relaxed">
          {/* biome-ignore lint/security/noDangerouslySetInnerHtml: sugar-high returns sanitized highlight markup for JSX we build from known props. */}
          <code dangerouslySetInnerHTML={{ __html: highlight(code) }} />
        </pre>
      </div>
    </div>
  );
}
