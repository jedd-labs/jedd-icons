import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { GridDots, responsiveGridColumns } from "@/components/grid-dots";
import { cn } from "@/lib/cn";
import { VARIANT_ICONS } from "@/lib/icons";

const previewColumns = responsiveGridColumns(4, 8);

const PREVIEW_SLOTS = 16;
const previewIcons = VARIANT_ICONS.stroke.slice(0, PREVIEW_SLOTS);
const previewPlaceholders = Math.max(0, PREVIEW_SLOTS - previewIcons.length);

function cellBorderClasses(index: number) {
  const position = index + 1;
  return cn(
    "border-border border-t",
    position % 8 === 0 ? "" : "sm:border-r",
    position % 4 === 0 ? "" : "max-sm:border-r"
  );
}

export function IconPreviewGrid({ totalIcons }: { totalIcons: number }) {
  return (
    <section className="relative border-border border-b">
      <div className="flex items-center justify-between px-6 py-4">
        <p className="text-muted-foreground text-xs uppercase tracking-widest">
          A few of them
        </p>
        <Link
          className="flex items-center gap-1 text-muted-foreground text-sm transition-colors hover:text-foreground"
          to="/icons"
        >
          Browse all {totalIcons}
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
      <div className="relative grid grid-cols-4 sm:grid-cols-8">
        <GridDots columns={previewColumns} row={0} y="top" />
        <GridDots columns={previewColumns} row="100%" y="outer-bottom" />
        {previewIcons.map(({ name, Component }, i) => (
          <Link
            className={cn(
              "group relative flex aspect-square items-center justify-center transition-colors hover:bg-muted/40",
              cellBorderClasses(i)
            )}
            key={name}
            params={{ name }}
            search={{ variant: "stroke" as const }}
            to="/icons/$name"
          >
            <Component
              aria-label={name}
              className="text-muted-foreground transition-colors group-hover:text-foreground"
              size={28}
              strokeWidth={2}
            />
          </Link>
        ))}
        {Array.from({ length: previewPlaceholders }, (_, p) => {
          const slot = previewIcons.length + p;
          return (
            <div
              aria-hidden
              className={cn(
                "relative flex aspect-square items-center justify-center bg-muted/10",
                cellBorderClasses(slot)
              )}
              key={`preview-placeholder-${slot}`}
            >
              <span className="size-7 rounded-sm bg-muted/40" />
            </div>
          );
        })}
      </div>
    </section>
  );
}
