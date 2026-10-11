import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Input } from "@workspace/ui/components/input";
import { Kbd } from "@workspace/ui/components/kbd";
import { Label } from "@workspace/ui/components/label";
import { Separator } from "@workspace/ui/components/separator";
import { Slider } from "@workspace/ui/components/slider";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { IconInspector } from "@/components/icon-inspector";
import { LabCanvas } from "@/components/lab-canvas";
import { LabLegend } from "@/components/lab-legend";
import { IconGlyph, PackageRender } from "@/components/package-render";
import { SvgCodeView } from "@/components/svg-code-view";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  type Accent,
  CHECKS,
  type CheckId,
  getCheckCounts,
  getIconFlags,
} from "@/lib/checks";
import {
  getIconIssues,
  getIconMargin,
  getIconNode,
  getVariantsWithGeometry,
  ICON_NODE_NAMES,
} from "@/lib/icon-nodes";
import { humanizeIconName, type Variant } from "@/lib/icons";
import { readSelection, writeSelection } from "@/lib/selection-url";
import { flattenPieces } from "@/lib/svg-path";
import { useShortcuts } from "@/lib/use-shortcuts";
import { useTheme } from "@/lib/use-theme";
import { type Overlay, useViewPrefs } from "@/lib/use-view-prefs";

const DEFAULT_ICON = ICON_NODE_NAMES.includes("alert-circle")
  ? "alert-circle"
  : (ICON_NODE_NAMES[0] ?? "");

const PIECE_COLORS = [
  "#3b82f6",
  "#ec4899",
  "#22c55e",
  "#f59e0b",
  "#8b5cf6",
  "#14b8a6",
  "#ef4444",
  "#eab308",
];

// Overlay toggles, each with a single-key shortcut.
const OVERLAYS: { key: Overlay; label: string; shortcut: string }[] = [
  { key: "grid", label: "Pixel grid", shortcut: "G" },
  { key: "keylines", label: "Keylines", shortcut: "K" },
  { key: "anchors", label: "Anchor points", shortcut: "A" },
  { key: "controls", label: "Control handles", shortcut: "C" },
  { key: "bounds", label: "Bounding box", shortcut: "B" },
  { key: "perPiece", label: "Color per piece", shortcut: "P" },
];

// Accent styling per check color. Full class strings so Tailwind keeps them.
const FILTER_ACCENTS: Record<Accent, { active: string; dot: string }> = {
  sky: {
    active: "border-sky-500 bg-sky-500/10 text-sky-600 dark:text-sky-400",
    dot: "bg-sky-500",
  },
  violet: {
    active:
      "border-violet-500 bg-violet-500/10 text-violet-600 dark:text-violet-400",
    dot: "bg-violet-500",
  },
  indigo: {
    active:
      "border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    dot: "bg-indigo-500",
  },
  rose: {
    active: "border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400",
    dot: "bg-rose-500",
  },
  amber: {
    active:
      "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  teal: {
    active: "border-teal-500 bg-teal-500/10 text-teal-600 dark:text-teal-400",
    dot: "bg-teal-500",
  },
  orange: {
    active:
      "border-orange-500 bg-orange-500/10 text-orange-600 dark:text-orange-400",
    dot: "bg-orange-500",
  },
};

/** The variant to show for an icon: the preferred one if it has it. */
function resolveVariant(name: string, preferred: Variant): Variant {
  const available = getVariantsWithGeometry(name);
  return available.includes(preferred) ? preferred : (available[0] ?? "stroke");
}

function failsMargin(name: string, variant: Variant): boolean {
  return getIconIssues(name, variant).some((i) => i.rule === "margin");
}

// Ref callback for the selected list row, so keyboard browsing keeps it in view.
function scrollIntoView(el: HTMLElement | null) {
  el?.scrollIntoView({ block: "nearest" });
}

/** A chip that filters the icon list to a flagged subset. */
function FilterToggle({
  label,
  count,
  active,
  accent,
  hint,
  onToggle,
}: {
  label: string;
  count: number;
  active: boolean;
  accent: Accent;
  hint?: string;
  onToggle: () => void;
}) {
  const a = FILTER_ACCENTS[accent];
  return (
    <button
      aria-pressed={active}
      className={`flex items-center gap-1.5 border px-1.5 py-0.5 text-[11px] transition-colors ${
        active
          ? a.active
          : "border-border text-muted-foreground hover:bg-muted/40 hover:text-foreground"
      }`}
      onClick={onToggle}
      title={hint}
      type="button"
    >
      <span aria-hidden className={`size-1.5 shrink-0 rounded-full ${a.dot}`} />
      <span>{label}</span>
      <span className="tabular-nums opacity-70">{count}</span>
    </button>
  );
}

/** Pass/fail summary of the current icon's checks, shown by its title. */
function CheckStatus({
  name,
  variant,
  onClick,
}: {
  name: string;
  variant: Variant;
  onClick: () => void;
}) {
  const issues = getIconIssues(name, variant);
  const errors = issues.filter((i) => i.severity === "error").length;
  const warnings = issues.length - errors;
  const parts = [
    errors > 0 && `${errors} error${errors === 1 ? "" : "s"}`,
    warnings > 0 && `${warnings} warning${warnings === 1 ? "" : "s"}`,
  ].filter(Boolean);

  let tone = "border-emerald-500/40 text-emerald-600 dark:text-emerald-400";
  if (errors > 0) {
    tone = "border-rose-500/50 bg-rose-500/10 text-rose-600 dark:text-rose-400";
  } else if (warnings > 0) {
    tone =
      "border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400";
  }

  return (
    <button
      className={`flex items-center gap-1.5 border px-1.5 py-0.5 text-[11px] transition-opacity hover:opacity-80 ${tone}`}
      onClick={onClick}
      title="Jump to checks"
      type="button"
    >
      <span aria-hidden>{errors > 0 ? "✕" : warnings > 0 ? "!" : "✓"}</span>
      {parts.length > 0 ? parts.join(" · ") : "Passes all checks"}
    </button>
  );
}

export function LabPage() {
  const { theme, toggleTheme } = useTheme();
  const [initial] = useState(() => readSelection(DEFAULT_ICON));
  const [iconName, setIconName] = useState(initial.icon);
  const [variantState, setVariantState] = useState<Variant>(initial.variant);

  const availableVariants = getVariantsWithGeometry(iconName);
  const variant = resolveVariant(iconName, variantState);

  const node = getIconNode(iconName, variant);

  const [query, setQuery] = useState("");
  // Opening on an icon that breaks the margin shows the bounds that draw it.
  const { view, setPref, toggle } = useViewPrefs(
    failsMargin(initial.icon, resolveVariant(initial.icon, initial.variant))
      ? { bounds: true }
      : undefined
  );
  const [isolatedPiece, setIsolatedPiece] = useState<number | null>(null);
  // Which check filters are active. Empty = show all icons.
  const [activeChecks, setActiveChecks] = useState<Set<CheckId>>(
    initial.checks
  );

  const searchRef = useRef<HTMLInputElement>(null);
  const inspectorRef = useRef<HTMLDivElement>(null);

  const pieces = useMemo(() => (node ? flattenPieces(node) : []), [node]);
  const checkCounts = useMemo(() => getCheckCounts(), []);
  // Checks no icon fails have nothing to filter to, so they get no chip.
  const failingChecks = CHECKS.filter((c) => checkCounts[c.id] > 0);

  useEffect(() => {
    writeSelection({ icon: iconName, variant, checks: activeChecks });
  }, [iconName, variant, activeChecks]);

  const toggleCheck = (id: CheckId) => {
    setActiveChecks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let names = ICON_NODE_NAMES;
    if (activeChecks.size > 0) {
      // An icon passes the filter if it fails EVERY active check (intersection),
      // so stacking filters narrows to icons with all selected problems.
      names = names.filter((n) => {
        const flags = getIconFlags(n);
        for (const id of activeChecks) {
          if (!flags.has(id)) {
            return false;
          }
        }
        return true;
      });
    }
    if (!q) {
      return names;
    }
    return names.filter(
      (n) => n.includes(q) || humanizeIconName(n).toLowerCase().includes(q)
    );
  }, [query, activeChecks]);

  const isFiltering = query.trim() !== "" || activeChecks.size > 0;
  const clearFilters = () => {
    setQuery("");
    setActiveChecks(new Set());
  };

  // Switching to an icon that breaks the margin turns on the bounds overlay,
  // so the problem is visible without hunting for the toggle.
  const revealMarginIssue = (name: string, preferred: Variant) => {
    if (failsMargin(name, resolveVariant(name, preferred))) {
      setPref("bounds", true);
    }
  };

  const setIcon = (name: string) => {
    setIsolatedPiece(null);
    setIconName(name);
    revealMarginIssue(name, variantState);
  };

  const setVariant = (v: Variant) => {
    setVariantState(v);
    revealMarginIssue(iconName, v);
  };

  // Move through the filtered list; from outside it, start at either end.
  const step = (delta: number) => {
    if (filtered.length === 0) {
      return;
    }
    const i = filtered.indexOf(iconName);
    const next =
      i === -1
        ? delta > 0
          ? 0
          : filtered.length - 1
        : Math.min(filtered.length - 1, Math.max(0, i + delta));
    setIcon(filtered[next]);
  };

  useShortcuts({
    arrowdown: () => step(1),
    arrowup: () => step(-1),
    "/": () => searchRef.current?.focus(),
    escape: () => setIsolatedPiece(null),
    ...Object.fromEntries(
      OVERLAYS.map((o) => [o.shortcut.toLowerCase(), () => toggle(o.key)])
    ),
  });

  const onSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      step(e.key === "ArrowDown" ? 1 : -1);
    } else if (e.key === "Enter") {
      if (filtered.length > 0 && !filtered.includes(iconName)) {
        setIcon(filtered[0]);
      }
      e.currentTarget.blur();
    } else if (e.key === "Escape") {
      if (query) {
        setQuery("");
      } else {
        e.currentTarget.blur();
      }
    }
  };

  const overlayId = useId();

  const totalAnchors = pieces.reduce((s, p) => s + p.parsed.anchors.length, 0);
  const totalControls = pieces.reduce(
    (s, p) => s + p.parsed.controls.length,
    0
  );
  const totalCommands = pieces.reduce(
    (s, p) => s + p.parsed.commands.length,
    0
  );

  return (
    <div className="flex h-svh flex-col bg-background text-foreground">
      {/* Header */}
      <header className="flex shrink-0 items-baseline justify-between border-border border-b px-6 py-4">
        <div className="flex items-baseline gap-3">
          <h1 className="font-heading text-2xl">Jedd Lab</h1>
          <span className="text-muted-foreground text-xs">icon x-ray</span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle onToggle={toggleTheme} theme={theme} />
          <a
            className="text-muted-foreground text-xs hover:text-foreground"
            href="https://github.com/mnove/jedd-icons"
            rel="noreferrer"
            target="_blank"
          >
            GitHub ↗
          </a>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* ── Left: icon picker ─────────────────────────────── */}
        <aside className="flex shrink-0 flex-col overflow-hidden border-border border-b lg:w-64 lg:border-r lg:border-b-0">
          <div className="flex min-h-0 flex-1 flex-col p-3">
            <div className="relative mb-2">
              <Input
                className="peer pr-8"
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onSearchKey}
                placeholder="Search icons…"
                ref={searchRef}
                type="search"
                value={query}
              />
              <Kbd className="absolute top-1.5 right-1.5 peer-focus:hidden">
                /
              </Kbd>
            </div>

            {/* Spec-check filters — each narrows the list to a flagged subset. */}
            <div className="mb-2 flex flex-wrap gap-1">
              {failingChecks.map((check) => (
                <FilterToggle
                  accent={check.accent}
                  active={activeChecks.has(check.id)}
                  count={checkCounts[check.id]}
                  hint={check.hint}
                  key={check.id}
                  label={check.label}
                  onToggle={() => toggleCheck(check.id)}
                />
              ))}
            </div>

            <div className="mb-1 flex items-center justify-between px-2 text-[10px] text-muted-foreground tabular-nums">
              <span>
                {isFiltering
                  ? `${filtered.length} of ${ICON_NODE_NAMES.length}`
                  : `${ICON_NODE_NAMES.length} icons`}
                {activeChecks.size > 1 && " · failing all selected checks"}
              </span>
              {isFiltering && (
                <button
                  className="hover:text-foreground"
                  onClick={clearFilters}
                  type="button"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-start gap-1 px-2 py-4 text-muted-foreground text-xs">
                  <p>No icons match.</p>
                  <Button
                    className="h-auto p-0 text-xs"
                    onClick={clearFilters}
                    size="sm"
                    variant="link"
                  >
                    Clear filters
                  </Button>
                </div>
              ) : (
                <ul className="flex flex-col gap-0.5">
                  {filtered.map((name) => {
                    const selected = name === iconName;
                    return (
                      <li key={name}>
                        <button
                          aria-current={selected}
                          className={`flex w-full items-center gap-1.5 px-2 py-1 text-left text-xs transition-colors ${
                            selected
                              ? "bg-foreground text-background"
                              : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                          }`}
                          onClick={() => setIcon(name)}
                          ref={selected ? scrollIntoView : undefined}
                          type="button"
                        >
                          <span className="flex size-4 shrink-0 items-center justify-center">
                            <IconGlyph name={name} size={16} />
                          </span>
                          <span className="flex-1 truncate">{name}</span>
                          {CHECKS.filter((c) =>
                            getIconFlags(name).has(c.id)
                          ).map((c) => (
                            <span
                              className={`size-1.5 shrink-0 rounded-full ${FILTER_ACCENTS[c.accent].dot}`}
                              key={c.id}
                              title={c.hint}
                            />
                          ))}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <p className="flex items-center gap-1.5 px-2 pt-2 text-[10px] text-muted-foreground">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd>
              browse icons
            </p>
          </div>
        </aside>

        {/* ── Center: canvas ────────────────────────────────── */}
        <main className="relative flex min-w-0 flex-1 flex-col items-center gap-6 overflow-auto border-border border-b bg-muted p-6 lg:border-r lg:border-b-0">
          {/* Legend — pinned to the top-right corner of the canvas area. */}
          <div className="absolute top-4 right-4 z-10">
            <LabLegend
              showAnchors={view.anchors}
              showBounds={view.bounds}
              showControls={view.controls}
              showGrid={view.grid}
              showKeylines={view.keylines}
            />
          </div>

          <div className="flex w-full items-center justify-between gap-3">
            <div className="flex flex-col items-start gap-1">
              <div className="flex items-center gap-2">
                <h2 className="font-medium text-sm">
                  {humanizeIconName(iconName)}
                </h2>
                <CheckStatus
                  name={iconName}
                  onClick={() =>
                    inspectorRef.current?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    })
                  }
                  variant={variant}
                />
              </div>
              <span className="font-mono text-[11px] text-muted-foreground">
                {iconName}.svg · 24×24
              </span>
            </div>
            {availableVariants.length > 1 && (
              <div className="flex overflow-hidden rounded-none border border-border">
                {availableVariants.map((v) => (
                  <button
                    className={`px-2.5 py-1 text-xs capitalize transition-colors ${
                      variant === v
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    key={v}
                    onClick={() => setVariant(v)}
                    type="button"
                  >
                    {v}
                  </button>
                ))}
              </div>
            )}
          </div>

          {node ? (
            <div className="flex items-center justify-center overflow-auto rounded-none border border-border bg-muted/10">
              <LabCanvas
                fill={variant === "fill"}
                isolatedPiece={isolatedPiece}
                margin={getIconMargin(iconName, variant)}
                node={node}
                perPiece={view.perPiece}
                pixelSize={view.zoom}
                showAnchors={view.anchors}
                showBounds={view.bounds}
                showControls={view.controls}
                showGrid={view.grid}
                showKeylines={view.keylines}
                strokeWidth={view.strokeWidth}
              />
            </div>
          ) : (
            <p className="py-12 text-muted-foreground text-sm">
              No geometry available for this icon.
            </p>
          )}

          {/* Stats */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-muted-foreground text-xs tabular-nums">
            <span>{pieces.length} pieces</span>
            <Separator className="h-3" orientation="vertical" />
            <span>{totalCommands} commands</span>
            <Separator className="h-3" orientation="vertical" />
            <span className="text-red-500">{totalAnchors} anchors</span>
            <Separator className="h-3" orientation="vertical" />
            <span className="text-emerald-500">{totalControls} controls</span>
          </div>

          {/* Output split: shipped SVG code (left) + published renders (right). */}
          {node && (
            <div className="grid w-full max-w-4xl gap-4 md:grid-cols-2">
              <div className="rounded-none border border-border bg-background p-3">
                <SvgCodeView name={iconName} variant={variant} />
              </div>
              <div className="flex items-center justify-center rounded-none border border-border bg-muted/10 p-4">
                <PackageRender
                  name={iconName}
                  strokeWidth={view.strokeWidth}
                  variant={variant}
                />
              </div>
            </div>
          )}
        </main>

        {/* ── Right: controls + inspector ───────────────────── */}
        <aside className="shrink-0 overflow-y-auto lg:w-80">
          <div className="flex flex-col gap-4 p-4 text-xs">
            {/* View controls */}
            <div className="flex flex-col gap-3">
              <span className="font-medium text-muted-foreground">View</span>

              <div className="flex items-center gap-2">
                <span className="w-14 shrink-0 text-muted-foreground">
                  Zoom
                </span>
                <Slider
                  className="flex-1"
                  max={720}
                  min={192}
                  onValueChange={(v) =>
                    setPref("zoom", Array.isArray(v) ? v[0] : v)
                  }
                  step={24}
                  value={[view.zoom]}
                />
                <span className="w-8 shrink-0 text-right tabular-nums">
                  {Math.round((view.zoom / 24) * 10) / 10}×
                </span>
              </div>

              {variant === "stroke" && (
                <div className="flex items-center gap-2">
                  <span className="w-14 shrink-0 text-muted-foreground">
                    Stroke
                  </span>
                  <Slider
                    className="flex-1"
                    max={3}
                    min={0.5}
                    onValueChange={(v) =>
                      setPref("strokeWidth", Array.isArray(v) ? v[0] : v)
                    }
                    step={0.25}
                    value={[view.strokeWidth]}
                  />
                  <span className="w-8 shrink-0 text-right tabular-nums">
                    {view.strokeWidth.toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            <Separator />

            {/* Overlay toggles */}
            <div className="flex flex-col gap-2.5">
              <span className="font-medium text-muted-foreground">
                Overlays
              </span>
              {OVERLAYS.map(({ key, label, shortcut }) => (
                <Label htmlFor={`${overlayId}-${key}`} key={key}>
                  <Checkbox
                    checked={view[key]}
                    id={`${overlayId}-${key}`}
                    onCheckedChange={(c) => setPref(key, c === true)}
                  />
                  <span className="text-muted-foreground">{label}</span>
                  <Kbd className="ml-auto">{shortcut}</Kbd>
                </Label>
              ))}
            </div>

            <Separator />

            {/* Checks + sidecar metadata for the current icon */}
            <div className="scroll-mt-4" ref={inspectorRef}>
              <IconInspector
                name={iconName}
                onShowBounds={
                  view.bounds ? undefined : () => setPref("bounds", true)
                }
                variant={variant}
              />
            </div>

            <Separator />

            {/* Piece breakdown */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-muted-foreground">
                  Pieces
                </span>
                {isolatedPiece !== null && (
                  <Button
                    className="h-auto gap-1.5 p-0 text-xs"
                    onClick={() => setIsolatedPiece(null)}
                    size="sm"
                    variant="link"
                  >
                    Show all
                    <Kbd>Esc</Kbd>
                  </Button>
                )}
              </div>
              <ul className="flex flex-col gap-1">
                {pieces.map((piece) => {
                  const active = isolatedPiece === piece.index;
                  return (
                    <li key={piece.index}>
                      <button
                        className={`flex w-full items-center gap-2 border px-2 py-1.5 text-left transition-colors ${
                          active
                            ? "border-foreground bg-muted/40"
                            : "border-border hover:bg-muted/20"
                        }`}
                        onClick={() =>
                          setIsolatedPiece(active ? null : piece.index)
                        }
                        type="button"
                      >
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{
                            backgroundColor:
                              PIECE_COLORS[piece.index % PIECE_COLORS.length],
                          }}
                        />
                        <span className="font-mono text-[11px]">
                          {piece.tag}
                        </span>
                        <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">
                          {piece.parsed.commands.length || "—"} cmd
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Command inspector for the isolated piece */}
            {isolatedPiece !== null &&
              pieces[isolatedPiece]?.parsed.commands.length > 0 && (
                <>
                  <Separator />
                  <div className="flex flex-col gap-2">
                    <span className="font-medium text-muted-foreground">
                      Path commands
                    </span>
                    <ol className="max-h-64 overflow-y-auto font-mono text-[11px] leading-relaxed">
                      {pieces[isolatedPiece].parsed.commands.map((cmd, i) => (
                        <li
                          className="flex gap-2 border-border/50 border-b py-0.5 last:border-0"
                          // biome-ignore lint/suspicious/noArrayIndexKey: command order is stable and there is no better key.
                          key={i}
                        >
                          <span className="w-4 shrink-0 font-semibold text-foreground">
                            {cmd.command}
                          </span>
                          <span className="text-muted-foreground tabular-nums">
                            {cmd.args
                              .map((n) => Math.round(n * 100) / 100)
                              .join(" ") || "close"}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </>
              )}
          </div>
        </aside>
      </div>
    </div>
  );
}
