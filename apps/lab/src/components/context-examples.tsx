import { type AnimatedJeddIcon, AnimateIcon } from "@jedd-icons/react-animated";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Kbd } from "@workspace/ui/components/kbd";
import type { ReactElement } from "react";
import type { AnimationPrefs } from "@/lib/use-animation-prefs";

/**
 * The icon where it usually lives — buttons, a link, a menu row, a field, a
 * badge, an alert — each animating on hover of the whole element through
 * `<AnimateIcon animateOnHover asChild>`, with the stage's animation and options.
 */
export function ContextExamples({
  animation,
  component: Icon,
  prefs,
  strokeWidth,
}: {
  animation: string;
  component: AnimatedJeddIcon;
  prefs: AnimationPrefs;
  strokeWidth: number;
}) {
  // Hover drives each example, from the element around the icon.
  const hover = (children: ReactElement) => (
    <AnimateIcon
      animateOnHover
      animation={animation}
      asChild
      completeOnStop={prefs.completeOnStop}
      delay={prefs.delay}
      initialOnAnimateEnd={prefs.initialOnAnimateEnd}
      persistOnAnimateEnd={prefs.persistOnAnimateEnd}
    >
      {children}
    </AnimateIcon>
  );

  const examples: { label: string; example: ReactElement }[] = [
    {
      label: "primary button",
      example: hover(
        <Button>
          Continue
          <Icon strokeWidth={strokeWidth} />
        </Button>
      ),
    },
    {
      label: "outline button",
      example: hover(
        <Button size="sm" variant="outline">
          <Icon strokeWidth={strokeWidth} />
          Next
        </Button>
      ),
    },
    {
      label: "icon button",
      example: hover(
        <Button aria-label="Icon button" size="icon" variant="ghost">
          <Icon strokeWidth={strokeWidth} />
        </Button>
      ),
    },
    {
      label: "badge",
      example: hover(
        <Badge variant="secondary">
          <Icon size={12} strokeWidth={strokeWidth} />
          New
        </Badge>
      ),
    },
    {
      label: "inline link",
      example: (
        <p className="text-muted-foreground text-xs">
          Read the{" "}
          {hover(
            <button
              className="inline-flex items-center gap-0.5 text-foreground underline underline-offset-2"
              type="button"
            >
              release notes
              <Icon size={12} strokeWidth={strokeWidth} />
            </button>
          )}{" "}
          first.
        </p>
      ),
    },
    {
      label: "menu row",
      example: hover(
        <button
          className="flex w-44 items-center gap-2 px-2 py-1.5 text-left text-xs hover:bg-muted"
          type="button"
        >
          <Icon size={16} strokeWidth={strokeWidth} />
          <span className="flex-1">Menu item</span>
          <Kbd>⌘K</Kbd>
        </button>
      ),
    },
    {
      label: "field",
      example: hover(
        <div className="relative w-44">
          <Icon
            className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-muted-foreground"
            size={14}
            strokeWidth={strokeWidth}
          />
          <Input className="pl-7" placeholder="Hover or type…" />
        </div>
      ),
    },
    {
      label: "alert",
      example: hover(
        <div className="flex w-56 gap-2.5 border border-border p-3 text-xs">
          <Icon className="shrink-0" size={20} strokeWidth={strokeWidth} />
          <div className="flex flex-col gap-0.5">
            <span className="font-medium">Heads up</span>
            <span className="text-muted-foreground">
              Something worth a look.
            </span>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-2">
      <span className="font-medium text-muted-foreground text-xs">
        In context
        <span className="ml-1.5 text-[10px]">hover each</span>
      </span>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-2">
        {examples.map(({ label, example }) => (
          <li
            className="flex flex-col items-center gap-2 border border-border px-2 pt-4 pb-2"
            key={label}
          >
            <div className="flex min-h-14 items-center justify-center">
              {example}
            </div>
            <span className="text-[10px] text-muted-foreground">{label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
