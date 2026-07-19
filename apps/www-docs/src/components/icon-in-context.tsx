import type { JeddIcon } from "@jedd-icons/react";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@/lib/cn";

interface IconInContextProps {
  className?: string;
  component: JeddIcon;
}

function SkeletonLine({ className }: { className?: string }) {
  return <span className={cn("block h-2.5 bg-muted", className)} />;
}

/**
 * A handful of small, generic UI mockups (dialog, form field, tag list, menu,
 * stat row, toolbar) that all render the current icon, so visitors can see how
 * it reads at real-world sizes and pairings rather than only in isolation.
 */
export function IconInContext({
  component: Icon,
  className,
}: IconInContextProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-px border border-border bg-border/40 sm:grid-cols-2 lg:grid-cols-3",
        className
      )}
    >
      {/* Dialog actions */}
      <div className="flex flex-col gap-3 bg-background p-5">
        <SkeletonLine className="w-2/3" />
        <SkeletonLine className="w-full" />
        <SkeletonLine className="w-1/2" />
        <div className="mt-2 flex gap-2">
          <Button size="sm">
            <Icon className="size-3.5" />
            Continue
          </Button>
          <Button size="sm" variant="secondary">
            Cancel
          </Button>
        </div>
      </div>

      {/* Form fields */}
      <div className="flex flex-col gap-3 bg-background p-5">
        <SkeletonLine className="w-1/3" />
        <div className="flex items-center gap-2 border border-input px-3 py-2 text-muted-foreground text-xs">
          <Icon className="size-4 shrink-0" />
          Enter a date&hellip;
        </div>
        <SkeletonLine className="w-1/4" />
        <div className="flex items-center gap-2 border border-input px-3 py-2 text-muted-foreground text-xs">
          <Icon className="size-4 shrink-0" />
          Enter a value&hellip;
        </div>
      </div>

      {/* Tag rows */}
      <div className="flex flex-col gap-3 bg-background p-5">
        <div className="flex items-center justify-between gap-3">
          <SkeletonLine className="flex-1" />
          <Badge variant="secondary">Tag</Badge>
        </div>
        <div className="flex items-center justify-between gap-3">
          <SkeletonLine className="flex-1" />
          <Badge variant="outline">Redirect</Badge>
        </div>
        <div className="flex items-center justify-between gap-3">
          <SkeletonLine className="flex-1" />
          <Badge className="gap-1" variant="secondary">
            <Icon className="size-3" />
            Next
          </Badge>
        </div>
      </div>

      {/* List menu */}
      <div className="flex flex-col gap-2 bg-background p-5">
        <div className="flex items-center gap-3 bg-muted/30 px-3 py-2 text-xs">
          <Icon className="size-4 shrink-0 text-muted-foreground" />
          <span className="flex-1 font-medium">Documents</span>
          <span className="text-muted-foreground">+</span>
        </div>
        <div className="flex items-center gap-3 bg-muted/30 px-3 py-2 text-xs">
          <Icon className="size-4 shrink-0 text-muted-foreground" />
          <span className="flex-1 font-medium">Readme</span>
        </div>
        <div className="flex items-center gap-3 bg-muted/30 px-3 py-2 text-xs">
          <Icon className="size-4 shrink-0 text-muted-foreground" />
          <span className="flex-1 font-medium">Continue</span>
          <Badge variant="secondary">12</Badge>
        </div>
      </div>

      {/* Stat row */}
      <div className="flex flex-col gap-3 bg-background p-5">
        <SkeletonLine className="w-full" />
        <SkeletonLine className="w-5/6" />
        <SkeletonLine className="w-2/5" />
        <div className="mt-2 flex items-center gap-4 text-muted-foreground text-xs">
          <span className="flex items-center gap-1.5">
            <Icon className="size-4" />
            112
          </span>
          <span className="flex items-center gap-1.5">
            <Icon className="size-4" />8
          </span>
          <span className="flex items-center gap-1.5">
            <Icon className="size-4" />
            11
          </span>
        </div>
      </div>

      {/* Icon toolbar */}
      <div className="flex flex-col justify-between gap-4 bg-background p-5">
        <div className="flex justify-end gap-2">
          <Button size="icon-sm" variant="outline">
            <Icon className="size-4" />
          </Button>
          <Button size="icon-sm" variant="outline">
            <Icon className="size-4" />
          </Button>
          <div className="relative">
            <Button size="icon-sm" variant="outline">
              <Icon className="size-4" />
            </Button>
            <Badge className="absolute -top-1.5 -right-1.5 h-[18px] min-w-[18px] justify-center px-1">
              2
            </Badge>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <SkeletonLine className="w-full" />
          <SkeletonLine className="w-4/5" />
        </div>
      </div>
    </div>
  );
}
