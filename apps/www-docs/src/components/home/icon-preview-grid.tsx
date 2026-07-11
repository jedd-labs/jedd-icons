import type { JeddIcon } from "@jedd-icons/react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { GridDots, responsiveGridColumns } from "@/components/grid-dots";
import { cn } from "@/lib/cn";
import { VARIANT_ICONS } from "@/lib/icons";

// Odd × odd on both breakpoints so a single cell is the true center, where the
// jedd logo sits: 5 cols × 3 rows (mobile), 7 cols × 3 rows (desktop).
const MOBILE_COLS = 5;
const DESKTOP_COLS = 7;
const ROWS = 3;

// Center (1-indexed) in each layout — the logo cell, excluded from the shuffle.
const MOBILE_CENTER = {
  col: Math.ceil(MOBILE_COLS / 2),
  row: Math.ceil(ROWS / 2),
};
const DESKTOP_CENTER = {
  col: Math.ceil(DESKTOP_COLS / 2),
  row: Math.ceil(ROWS / 2),
};

interface Cell {
  col: number;
  row: number;
}

/** Every cell of a cols×ROWS grid except the center, in row-major order. */
function iconCells(cols: number, center: Cell): Cell[] {
  const cells: Cell[] = [];
  for (let row = 1; row <= ROWS; row++) {
    for (let col = 1; col <= cols; col++) {
      if (!(row === center.row && col === center.col)) {
        cells.push({ col, row });
      }
    }
  }
  return cells;
}

const MOBILE_CELLS = iconCells(MOBILE_COLS, MOBILE_CENTER); // 14
const DESKTOP_CELLS = iconCells(DESKTOP_COLS, DESKTOP_CENTER); // 20
const ICON_SLOTS = DESKTOP_CELLS.length;

// Tailwind can't see interpolated class names, so map positions to literals it
// can scan. Mobile placement uses the unprefixed utilities; desktop overrides
// them at `sm:`.
const COL_START: Record<number, string> = {
  1: "col-start-1",
  2: "col-start-2",
  3: "col-start-3",
  4: "col-start-4",
  5: "col-start-5",
  6: "col-start-6",
  7: "col-start-7",
};
const ROW_START: Record<number, string> = {
  1: "row-start-1",
  2: "row-start-2",
  3: "row-start-3",
};
const SM_COL_START: Record<number, string> = {
  1: "sm:col-start-1",
  2: "sm:col-start-2",
  3: "sm:col-start-3",
  4: "sm:col-start-4",
  5: "sm:col-start-5",
  6: "sm:col-start-6",
  7: "sm:col-start-7",
};
const SM_ROW_START: Record<number, string> = {
  1: "sm:row-start-1",
  2: "sm:row-start-2",
  3: "sm:row-start-3",
};

/** Left divider for a cell, drawn only for interior columns so it doesn't double
 *  up with the page container's outer border on column 1. Split by breakpoint
 *  because a slot's column differs between mobile and desktop. */
function leftBorder(mobileCol: number | null, desktopCol: number): string {
  return cn(
    mobileCol !== null && mobileCol > 1 && "border-l",
    desktopCol > 1 ? "sm:border-l" : "sm:border-l-0"
  );
}

/** Grid-placement classes for icon slot `i`: mobile position (hidden past the
 *  mobile cell count) plus the desktop position via `sm:`. */
function slotPlacement(i: number): string {
  const desktop = DESKTOP_CELLS[i];
  const desktopClasses = cn(
    SM_COL_START[desktop.col],
    SM_ROW_START[desktop.row]
  );

  if (i < MOBILE_CELLS.length) {
    const mobile = MOBILE_CELLS[i];
    return cn(
      COL_START[mobile.col],
      ROW_START[mobile.row],
      desktopClasses,
      leftBorder(mobile.col, desktop.col)
    );
  }
  // Extra desktop-only slots have no mobile cell — hide them there.
  return cn("max-sm:hidden", desktopClasses, leftBorder(null, desktop.col));
}

const previewColumns = responsiveGridColumns(MOBILE_COLS, DESKTOP_COLS);

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

/** Seed the grid with up to ICON_SLOTS distinct random icons. */
function createInitialSlots(): Slot[] {
  const pool = [...STROKE_ICONS];
  const count = Math.min(ICON_SLOTS, pool.length);
  const slots: Slot[] = [];
  for (let i = 0; i < count; i++) {
    const [icon] = pool.splice(pickRandomIndex(pool.length), 1);
    slots.push({ id: i, swapped: false, ...icon });
  }
  return slots;
}

function useShuffledSlots() {
  const [slots, setSlots] = useState<Slot[]>(createInitialSlots);

  useEffect(() => {
    // Nothing to shuffle if we can't offer a fresh, non-duplicate icon.
    if (STROKE_ICONS.length <= ICON_SLOTS) {
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

/** The jedd mark as a flat square cell — the brand keystone at the grid's
 *  center. A normal cell like the icons, but with a stronger border and a
 *  subtle background fill so it stands out among the outline cells. */
function LogoCell() {
  return (
    <div
      className={cn(
        // Match the icon cells' hairlines (border-t + interior border-l) so the
        // filled tile aligns with the grid lines on every edge. The center is
        // always an interior column, so border-l always applies.
        "relative flex aspect-square items-center justify-center border-border border-t border-l bg-primary text-background",
        COL_START[MOBILE_CENTER.col],
        ROW_START[MOBILE_CENTER.row],
        SM_COL_START[DESKTOP_CENTER.col],
        SM_ROW_START[DESKTOP_CENTER.row]
      )}
    >
      {/* Optical centering: the mark's mass sits slightly left of its geometric
          center, so nudge it a hair right to look centered in the cell. */}
      <svg
        aria-label="jedd icons logo"
        className="size-8 translate-x-0.5"
        fill="currentColor"
        role="img"
        viewBox="0 0 48 48"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          clipRule="evenodd"
          d="M39.6 6V34.8C39.6 38.7765 36.3765 42 32.4 42H8.4V25.2H16.8V32.4H30V15.6H14.4V6H39.6ZM10.8 39.6H14.4V27.6H10.8V39.6ZM16.8 39.6H30V34.8H16.8V39.6ZM32.4 39.6C35.051 39.6 37.2 37.451 37.2 34.8H32.4V39.6ZM32.4 32.4H37.2V8.4H32.4V32.4ZM16.8 13.2H30V8.4H16.8V13.2Z"
          fillRule="evenodd"
        />
      </svg>
    </div>
  );
}

export function IconPreviewGrid({ totalIcons }: { totalIcons: number }) {
  const slots = useShuffledSlots();

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
      <div className="relative grid grid-cols-5 grid-rows-3 sm:grid-cols-7">
        <GridDots columns={previewColumns} row={0} y="top" />
        <GridDots columns={previewColumns} row="100%" y="outer-bottom" />
        <LogoCell />
        {slots.map(({ id, name, Component, swapped }, i) => (
          <Link
            className={cn(
              "group relative flex aspect-square items-center justify-center border-border border-t transition-colors hover:bg-muted/40",
              slotPlacement(i)
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
      </div>
    </section>
  );
}
