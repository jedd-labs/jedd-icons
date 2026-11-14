import {
  type AnimatedJeddIcon,
  JeddProvider,
  presets,
} from "@jedd-icons/react-animated";
import { Button } from "@workspace/ui/components/button";
import { useState } from "react";
import { ownAnimations } from "@/lib/animated";
import type { AnimationPrefs } from "@/lib/use-animation-prefs";

/** Pause between loops, so each run starts visibly from rest. */
const LOOP_DELAY = 500;

/**
 * Every animation the icon can play — its own, then the presets — looping side
 * by side, to review them all at once. `default` isn't a cell of its own: the
 * cell it plays is marked. Clicking a cell picks it for the stage below.
 */
export function AnimationGrid({
  component: Component,
  onPick,
  picked,
  prefs,
  strokeWidth,
}: {
  component: AnimatedJeddIcon;
  onPick: (animation: string) => void;
  picked: string;
  prefs: AnimationPrefs;
  strokeWidth: number;
}) {
  const [playing, setPlaying] = useState(true);
  const [restarts, setRestarts] = useState(0);

  const own = ownAnimations(Component);
  const cells = [...own, ...Object.keys(presets)];
  const defaultPlays = Component.defaultAnimation ?? prefs.fallbackAnimation;
  // The stage's `default` is the cell that default plays.
  const current = picked === "default" ? defaultPlays : picked;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium text-muted-foreground text-xs">
          All animations
          <span className="ml-1.5 text-[10px]">
            {own.length > 0
              ? `${own.length} own · ${Object.keys(presets).length} presets`
              : "presets only, no animation file"}
          </span>
        </span>
        <div className="flex items-center gap-1.5">
          <Button
            onClick={() => setRestarts((n) => n + 1)}
            size="sm"
            title="Restart every cell together"
            variant="ghost"
          >
            ↻ Restart
          </Button>
          <Button
            onClick={() => setPlaying((p) => !p)}
            size="sm"
            variant="outline"
          >
            {playing ? "❚❚ Pause all" : "▶ Play all"}
          </Button>
        </div>
      </div>

      <JeddProvider
        fallbackAnimation={prefs.fallbackAnimation}
        reducedMotion={prefs.reducedMotion}
      >
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] gap-2">
          {cells.map((animation) => {
            const selected = animation === current;
            const isOwn = own.includes(animation);
            return (
              <li key={animation}>
                <button
                  aria-pressed={selected}
                  className={`flex w-full flex-col items-center gap-2 border px-2 pt-4 pb-2 transition-colors ${
                    selected
                      ? "border-foreground bg-muted/40"
                      : "border-border hover:bg-muted/20"
                  }`}
                  onClick={() => onPick(animation)}
                  title="Pick for the stage below"
                  type="button"
                >
                  <Component
                    animate={playing}
                    animation={animation}
                    key={restarts}
                    loop
                    loopDelay={LOOP_DELAY}
                    size={48}
                    strokeWidth={strokeWidth}
                  />
                  <span className="flex w-full items-center justify-center gap-1 font-mono text-[11px]">
                    <span
                      className={`truncate ${isOwn ? "text-foreground" : "text-muted-foreground"}`}
                    >
                      {animation}
                    </span>
                    {animation === defaultPlays && (
                      <span
                        className="shrink-0 border border-border px-1 text-[9px] text-muted-foreground"
                        title={
                          Component.defaultAnimation
                            ? "The icon's default"
                            : "Plays as the fallback: the icon declares no default"
                        }
                      >
                        default
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </JeddProvider>
    </div>
  );
}
