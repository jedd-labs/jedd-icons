import { Button, buttonVariants } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { cn } from "@workspace/ui/lib/utils";
import { useId } from "react";
import {
  type AnimationPrefs,
  TRIGGERS,
  type Trigger,
  type useAnimationPrefs,
} from "@/lib/use-animation-prefs";

type Toggle =
  | "completeOnStop"
  | "persistOnAnimateEnd"
  | "initialOnAnimateEnd"
  | "viewOnce";

const TOGGLES: {
  key: Toggle;
  label: string;
  prop: string;
  hint: string;
  /** Shown only for this trigger. */
  only?: Trigger;
}[] = [
  {
    key: "completeOnStop",
    label: "Complete on stop",
    prop: "completeOnStop",
    hint: "Finish the run before returning to rest when stopped",
  },
  {
    key: "persistOnAnimateEnd",
    label: "Persist at end",
    prop: "persistOnAnimateEnd",
    hint: "Stay where the animation ended instead of returning to rest",
  },
  {
    key: "initialOnAnimateEnd",
    label: "Reset at end",
    prop: "initialOnAnimateEnd",
    hint: "Snap back to rest, without a transition, when a run ends",
  },
  {
    key: "viewOnce",
    label: "Once in view",
    prop: "animateOnViewOnce",
    hint: "Only the first time it's in view",
    only: "view",
  },
];

const toMs = (value: string) => Math.max(0, Math.round(Number(value) || 0));

function MsField({
  id,
  label,
  onChange,
  prop,
  value,
}: {
  id: string;
  label: string;
  onChange: (ms: number) => void;
  prop: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-2" title={prop}>
      <Label className="w-20 shrink-0 text-muted-foreground" htmlFor={id}>
        {label}
      </Label>
      <Input
        className="h-7 flex-1 tabular-nums"
        id={id}
        min={0}
        onChange={(e) => onChange(toMs(e.target.value))}
        step={100}
        type="number"
        value={value}
      />
      <span className="w-6 shrink-0 text-right text-muted-foreground">ms</span>
    </div>
  );
}

/** The animated render's trigger and options, for the Lab's sidebar. */
export function AnimationSettings({
  prefs,
  setPref,
  reset,
  isDefault,
}: ReturnType<typeof useAnimationPrefs>) {
  const id = useId();
  const trigger = TRIGGERS.find((t) => t.value === prefs.trigger);
  const set =
    <K extends keyof AnimationPrefs>(key: K) =>
    (value: AnimationPrefs[K]) =>
      setPref(key, value);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <span className="font-medium text-muted-foreground">Animation</span>
        {!isDefault && (
          <Button
            className="h-auto p-0 text-xs"
            onClick={reset}
            size="sm"
            variant="link"
          >
            Reset
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="w-20 shrink-0 text-muted-foreground">Trigger</span>
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "flex-1 justify-between font-normal"
            )}
          >
            {trigger?.label}
            <span className="font-mono text-[10px] text-muted-foreground">
              {trigger?.props}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuRadioGroup
              onValueChange={(v) => setPref("trigger", v as Trigger)}
              value={prefs.trigger}
            >
              {TRIGGERS.map((t) => (
                <DropdownMenuRadioItem
                  closeOnClick
                  key={t.value}
                  value={t.value}
                >
                  {t.label}
                  <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                    {t.props}
                  </span>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <MsField
        id={`${id}-delay`}
        label="Delay"
        onChange={set("delay")}
        prop="delay"
        value={prefs.delay}
      />
      {prefs.trigger === "loop" && (
        <MsField
          id={`${id}-loopDelay`}
          label="Loop delay"
          onChange={set("loopDelay")}
          prop="loopDelay"
          value={prefs.loopDelay}
        />
      )}

      {TOGGLES.filter((t) => !t.only || t.only === prefs.trigger).map(
        ({ key, label, prop, hint }) => (
          <Label htmlFor={`${id}-${key}`} key={key} title={hint}>
            <Checkbox
              checked={prefs[key]}
              id={`${id}-${key}`}
              onCheckedChange={(c) => setPref(key, c === true)}
            />
            <span className="text-muted-foreground">{label}</span>
            <span className="ml-auto font-mono text-[10px] text-muted-foreground">
              {prop}
            </span>
          </Label>
        )
      )}
    </div>
  );
}
