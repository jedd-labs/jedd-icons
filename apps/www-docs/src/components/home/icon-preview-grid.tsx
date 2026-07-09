import type { JeddIcon } from "@jedd-icons/react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { GridDots, responsiveGridColumns } from "@/components/grid-dots";
import { cn } from "@/lib/cn";
import { VARIANT_ICONS } from "@/lib/icons";

const previewColumns = responsiveGridColumns(4, 8);

const PREVIEW_SLOTS = 16;
/** How often a single slot swaps to a fresh icon. */
const SWAP_INTERVAL_MS = 1600;

const STROKE_ICONS = VARIANT_ICONS.stroke;

interface Slot {
  Component: JeddIcon;
  /** Stable per-position id so React keeps the same cell across swaps. */
  id: number;
  name: string;
  /** True once this slot has swapped — gates the glow so it only signals change. */
  swapped: boolean;
}

function pickRandomIndex(length: number) {
  return Math.floor(Math.random() * length);
}

/** Seed the grid with up to PREVIEW_SLOTS distinct random icons. */
function createInitialSlots(): Slot[] {
  const pool = [...STROKE_ICONS];
  const count = Math.min(PREVIEW_SLOTS, pool.length);
  const slots: Slot[] = [];
  for (let i = 0; i < count; i++) {
    const [icon] = pool.splice(pickRandomIndex(pool.length), 1);
    slots.push({ id: i, swapped: false, ...icon });
  }
  return slots;
}

function cellBorderClasses(index: number) {
  const position = index + 1;
  return cn(
    "border-border border-t",
    position % 8 === 0 ? "" : "sm:border-r",
    position % 4 === 0 ? "" : "max-sm:border-r"
  );
}

function useShuffledSlots() {
  const [slots, setSlots] = useState<Slot[]>(createInitialSlots);

  useEffect(() => {
    // Nothing to shuffle if we can't offer a fresh, non-duplicate icon.
    if (STROKE_ICONS.length <= PREVIEW_SLOTS) {
      return;
    }

    const interval = setInterval(() => {
      setSlots((current) => {
        const visible = new Set(current.map((slot) => slot.name));
        const candidates = STROKE_ICONS.filter(
          (icon) => !visible.has(icon.name)
        );
        if (candidates.length === 0) {
          return current;
        }

        const slotToSwap = pickRandomIndex(current.length);
        const nextIcon = candidates[pickRandomIndex(candidates.length)];

        const next = [...current];
        next[slotToSwap] = { ...next[slotToSwap], ...nextIcon, swapped: true };
        return next;
      });
    }, SWAP_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  return slots;
}

export function IconPreviewGrid({ totalIcons }: { totalIcons: number }) {
  const slots = useShuffledSlots();
  const previewPlaceholders = Math.max(0, PREVIEW_SLOTS - slots.length);

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
        {slots.map(({ id, name, Component, swapped }, i) => (
          <Link
            className={cn(
              "group relative flex aspect-square items-center justify-center transition-colors hover:bg-muted/40",
              cellBorderClasses(i)
            )}
            key={id}
            params={{ name }}
            search={{ variant: "stroke" as const }}
            to="/icons/$name"
          >
            <AnimatePresence mode="wait">
              <motion.span
                animate={{
                  opacity: 1,
                  scale: 1,
                  // Subtle glow flashes in as a swapped icon enters, then fades
                  // out. Skipped on the initial seed so it only signals change.
                  filter: swapped
                    ? [
                        "drop-shadow(0 0 6px var(--primary))",
                        "drop-shadow(0 0 0px transparent)",
                      ]
                    : "drop-shadow(0 0 0px transparent)",
                }}
                className="flex items-center justify-center"
                exit={{ opacity: 0, scale: 0.6 }}
                initial={{ opacity: 0, scale: 0.6 }}
                key={name}
                transition={{
                  duration: 0.25,
                  ease: "easeOut",
                  filter: { duration: 0.9, ease: "easeOut" },
                }}
              >
                <Component
                  aria-label={name}
                  className="text-muted-foreground transition-colors group-hover:text-foreground"
                  size={28}
                  strokeWidth={2}
                />
              </motion.span>
            </AnimatePresence>
          </Link>
        ))}
        {Array.from({ length: previewPlaceholders }, (_, p) => {
          const slot = slots.length + p;
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
