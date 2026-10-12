import {
  type AnimatedJeddIcon,
  AnimateIcon,
  ArrowRight,
  Check,
  Download,
  Heart,
  JeddProvider,
  Loader,
  Lock,
  presets,
  RefreshCw,
  Search,
  Settings,
  Trash,
  Volume2,
} from "@jedd-icons/react-animated";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@/lib/cn";

// The icons with animations of their own (animations/stroke/*.ts). Imported by
// name so the docs bundle only these, not the whole set — add an icon here when
// it gets an animation file.
const ICONS: [string, AnimatedJeddIcon][] = [
  ["ArrowRight", ArrowRight],
  ["Check", Check],
  ["Download", Download],
  ["Heart", Heart],
  ["Loader", Loader],
  ["Lock", Lock],
  ["RefreshCw", RefreshCw],
  ["Search", Search],
  ["Settings", Settings],
  ["Trash", Trash],
  ["Volume2", Volume2],
];

const isOwn = (animation: string) =>
  animation !== "default" && !(animation in presets);

const tile =
  "flex flex-col items-center justify-center gap-2 bg-background p-4 text-muted-foreground text-xs";

/** Every icon with animations of its own, playing `default` on hover. */
export function AnimatedIconGrid({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "not-prose grid grid-cols-3 gap-px border border-border bg-border/40 sm:grid-cols-4 lg:grid-cols-6",
        className
      )}
    >
      {ICONS.map(([name, Icon]) => (
        <AnimateIcon animateOnHover asChild key={name}>
          <div className={cn(tile, "cursor-default hover:text-foreground")}>
            <Icon size={28} />
            <span className="font-mono text-[10px]">{name}</span>
          </div>
        </AnimateIcon>
      ))}
    </div>
  );
}

/** One icon playing each preset in a loop. */
export function PresetDemo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "not-prose grid grid-cols-2 gap-px border border-border bg-border/40 sm:grid-cols-4",
        className
      )}
    >
      {Object.keys(presets).map((preset) => (
        <div className={tile} key={preset}>
          <Heart animate animation={preset} loop loopDelay={600} size={28} />
          <span className="font-mono text-[10px]">{preset}</span>
        </div>
      ))}
    </div>
  );
}

/** `<AnimateIcon>` around buttons: hovering the button animates its icon. */
export function AnimateIconDemo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "not-prose flex flex-wrap items-center justify-center gap-3 border border-border bg-background p-6",
        className
      )}
    >
      <AnimateIcon animateOnHover asChild>
        <Button size="sm">
          Continue
          <ArrowRight />
        </Button>
      </AnimateIcon>
      <AnimateIcon animateOnHover asChild>
        <Button size="sm" variant="outline">
          <Download />
          Download
        </Button>
      </AnimateIcon>
      <AnimateIcon animateOnHover asChild>
        <Button size="sm" variant="destructive">
          <Trash />
          Delete
        </Button>
      </AnimateIcon>
      <AnimateIcon animateOnTap asChild>
        <Button size="sm" variant="secondary">
          <Heart />
          Like (click)
        </Button>
      </AnimateIcon>
    </div>
  );
}

/** Each icon's own animations, live on hover, as a table. */
export function OwnAnimationsTable() {
  return (
    <div className="not-prose overflow-x-auto border border-border">
      <table className="w-full text-sm">
        <thead className="border-border border-b bg-muted/40 text-left text-muted-foreground text-xs">
          <tr>
            <th className="px-3 py-2 font-medium">Icon</th>
            <th className="px-3 py-2 font-medium">
              Animations (hover to play)
            </th>
          </tr>
        </thead>
        <tbody>
          {ICONS.map(([name, Icon]) => (
            <tr className="border-border border-b last:border-b-0" key={name}>
              <td className="px-3 py-2 font-mono text-xs">{name}</td>
              <td className="px-3 py-2">
                <div className="flex flex-wrap gap-2">
                  {["default", ...Icon.animations.filter(isOwn)].map((a) => (
                    <AnimateIcon animateOnHover asChild key={a}>
                      <span className="inline-flex cursor-default items-center gap-1.5 border border-border px-2 py-1 font-mono text-xs hover:bg-muted/40">
                        <Icon animation={a} size={16} />
                        {a}
                      </span>
                    </AnimateIcon>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const PROVIDER_ICONS = [ArrowRight, RefreshCw, Trash, Settings, Loader];

function ProviderRow({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-6 bg-background px-5 py-4">
      <span className="w-48 shrink-0 font-mono text-[11px] text-muted-foreground">
        {label}
      </span>
      <div className="flex flex-wrap gap-5">
        {PROVIDER_ICONS.map((Icon) => (
          <Icon animateOnHover key={Icon.displayName} size={28} />
        ))}
      </div>
    </div>
  );
}

/** The same icons without and with a `JeddProvider` — hover them quickly. */
export function ProviderDemo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "not-prose flex flex-col gap-px border border-border bg-border/40",
        className
      )}
    >
      <ProviderRow label="no provider" />
      <JeddProvider completeOnStop strokeWidth={1.5}>
        <ProviderRow label="strokeWidth={1.5} completeOnStop" />
      </JeddProvider>
    </div>
  );
}
