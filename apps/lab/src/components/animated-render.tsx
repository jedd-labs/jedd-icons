import * as AnimatedLib from "@jedd-icons/react-animated";
import {
  type AnimatedJeddIcon,
  AnimateIcon,
  presets,
} from "@jedd-icons/react-animated";
import { Button } from "@workspace/ui/components/button";
import { useState } from "react";
import { getPascalName } from "@/lib/icon-nodes";

const ANIMATED = AnimatedLib as unknown as Record<string, unknown>;

type Mode = "hover" | "tap" | "loop";

const MODES: { mode: Mode; label: string }[] = [
  { mode: "hover", label: "Hover" },
  { mode: "tap", label: "Click" },
  { mode: "loop", label: "Loop" },
];

const TRIGGER_PROPS: Record<Mode, Record<string, boolean>> = {
  hover: { animateOnHover: true },
  tap: { animateOnTap: true },
  loop: { animate: true, loop: true },
};

const SIZES = [24, 48, 96] as const;

/**
 * Plays the icon from `@jedd-icons/react-animated`: each of its animations,
 * on hover, click or in a loop, plus driven from a button around it.
 */
export function AnimatedRender({
  name,
  strokeWidth,
}: {
  name: string;
  strokeWidth: number;
}) {
  const pascal = getPascalName(name, "stroke");
  const Component = (pascal ? ANIMATED[pascal] : undefined) as
    | AnimatedJeddIcon
    | undefined;
  const [picked, setPicked] = useState("default");
  const [mode, setMode] = useState<Mode>("hover");

  if (!Component) {
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

  return (
    <div className="flex flex-col items-center gap-4">
      <span className="font-medium text-muted-foreground text-xs">
        Animated render
        <span className="ml-1.5 font-mono text-[10px]">
          {`<${pascal} animation="${animation}" />`}
        </span>
      </span>

      <div className="flex items-end gap-8">
        {SIZES.map((size) => (
          <div className="flex flex-col items-center gap-1.5" key={size}>
            <div className="flex h-24 items-center justify-center">
              <Component
                // Remount on a new mode/animation so each starts from rest.
                animation={animation}
                key={`${mode}-${animation}`}
                size={size}
                strokeWidth={strokeWidth}
                {...TRIGGER_PROPS[mode]}
              />
            </div>
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {size}
            </span>
          </div>
        ))}
      </div>

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

      <div className="flex items-center gap-3">
        <div className="flex overflow-hidden rounded-none border border-border">
          {MODES.map((m) => (
            <button
              className={`px-2.5 py-1 text-xs transition-colors ${
                mode === m.mode
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              key={m.mode}
              onClick={() => setMode(m.mode)}
              type="button"
            >
              {m.label}
            </button>
          ))}
        </div>

        <AnimateIcon animateOnHover animation={animation} asChild>
          <Button size="sm" variant="outline">
            Hover this button
            <Component strokeWidth={strokeWidth} />
          </Button>
        </AnimateIcon>
      </div>
    </div>
  );
}
