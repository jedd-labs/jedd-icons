import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Separator } from "@workspace/ui/components/separator";
import { Slider } from "@workspace/ui/components/slider";
import { useId, useMemo, useState } from "react";
import { LabCanvas } from "@/components/lab-canvas";
import { LabLegend } from "@/components/lab-legend";
import { PackageRender } from "@/components/package-render";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  getIconGeometry,
  getMultiElementIconNames,
  getVariantsWithGeometry,
  ICON_NODE_NAMES,
} from "@/lib/icon-nodes";
import { humanizeIconName, type Variant } from "@/lib/icons";
import { getViolatingIconNames } from "@/lib/margin";
import { flattenPieces } from "@/lib/svg-path";
import { useTheme } from "@/lib/use-theme";

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

const FILTER_ACCENTS = {
  rose: {
    active: "border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400",
    dot: "bg-rose-500",
  },
  amber: {
    active:
      "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    dot: "bg-amber-500",
  },
} as const;

/** A pill that filters the icon list to a flagged subset. Disabled at count 0. */
function FilterToggle({
  label,
  count,
  active,
  accent,
  onToggle,
}: {
  label: string;
  count: number;
  active: boolean;
  accent: keyof typeof FILTER_ACCENTS;
  onToggle: () => void;
}) {
  const a = FILTER_ACCENTS[accent];
  return (
    <button
      className={`flex w-full items-center gap-2 border px-2 py-1.5 text-left text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        active
          ? a.active
          : "border-border text-muted-foreground hover:bg-muted/40 hover:text-foreground"
      }`}
      disabled={count === 0}
      onClick={onToggle}
      type="button"
    >
      <span aria-hidden className={`size-2 shrink-0 rounded-full ${a.dot}`} />
      <span className="flex-1">{label}</span>
      <span className="tabular-nums">{count}</span>
    </button>
  );
}

export function LabPage() {
  const { theme, toggleTheme } = useTheme();
  const [iconName, setIconName] = useState(DEFAULT_ICON);
  const [variantState, setVariantState] = useState<Variant>("stroke");

  const availableVariants = getVariantsWithGeometry(iconName);
  const variant: Variant = availableVariants.includes(variantState)
    ? variantState
    : (availableVariants[0] ?? "stroke");

  const node = getIconGeometry(iconName, variant);

  const [query, setQuery] = useState("");
  const [pixelSize, setPixelSize] = useState(480);
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [showGrid, setShowGrid] = useState(true);
  const [showKeylines, setShowKeylines] = useState(true);
  const [showAnchors, setShowAnchors] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [showBounds, setShowBounds] = useState(false);
  const [perPiece, setPerPiece] = useState(false);
  const [isolatedPiece, setIsolatedPiece] = useState<number | null>(null);
  const [marginOnly, setMarginOnly] = useState(false);
  const [multiOnly, setMultiOnly] = useState(false);

  const pieces = useMemo(() => (node ? flattenPieces(node) : []), [node]);
  const violating = useMemo(() => getViolatingIconNames(), []);
  const multiElement = useMemo(() => getMultiElementIconNames(), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let names = ICON_NODE_NAMES;
    if (marginOnly) {
      names = names.filter((n) => violating.has(n));
    }
    if (multiOnly) {
      names = names.filter((n) => multiElement.has(n));
    }
    if (!q) {
      return names;
    }
    return names.filter(
      (n) => n.includes(q) || humanizeIconName(n).toLowerCase().includes(q)
    );
  }, [query, marginOnly, multiOnly, violating, multiElement]);

  const setIcon = (name: string) => {
    setIsolatedPiece(null);
    setIconName(name);
  };

  const gridIds = {
    stroke: useId(),
    grid: useId(),
    keylines: useId(),
    anchors: useId(),
    controls: useId(),
    bounds: useId(),
    perPiece: useId(),
  };

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
          <div className="flex min-h-0 flex-col p-3">
            <Input
              className="mb-2"
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search icons…"
              type="search"
              value={query}
            />

            {/* Quality filters — each narrows the list to a flagged subset. */}
            <div className="mb-2 flex flex-col gap-1.5">
              <FilterToggle
                accent="rose"
                active={marginOnly}
                count={violating.size}
                label="Margin issues"
                onToggle={() => setMarginOnly((v) => !v)}
              />
              <FilterToggle
                accent="amber"
                active={multiOnly}
                count={multiElement.size}
                label="Multi-element"
                onToggle={() => setMultiOnly((v) => !v)}
              />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              {filtered.length === 0 ? (
                <p className="px-2 py-4 text-muted-foreground text-xs">
                  No icons match.
                </p>
              ) : (
                <ul className="flex flex-col gap-0.5">
                  {filtered.map((name) => (
                    <li key={name}>
                      <button
                        className={`flex w-full items-center gap-1.5 px-2 py-1 text-left text-xs transition-colors ${
                          name === iconName
                            ? "bg-foreground text-background"
                            : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                        }`}
                        onClick={() => setIcon(name)}
                        type="button"
                      >
                        <span className="flex-1 truncate">{name}</span>
                        {multiElement.has(name) && (
                          <span
                            className="size-1.5 shrink-0 rounded-full bg-amber-500"
                            title="Made of multiple SVG elements"
                          />
                        )}
                        {violating.has(name) && (
                          <span
                            className="size-1.5 shrink-0 rounded-full bg-rose-500"
                            title="Breaks the 1px margin"
                          />
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </aside>

        {/* ── Center: canvas ────────────────────────────────── */}
        <main className="flex min-w-0 flex-1 flex-col items-center gap-6 overflow-auto border-border border-b bg-muted p-6 lg:border-r lg:border-b-0">
          <div className="flex w-full items-center justify-between gap-3">
            <div className="flex flex-col">
              <h2 className="font-medium text-sm">
                {humanizeIconName(iconName)}
              </h2>
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
                    onClick={() => setVariantState(v)}
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
                node={node}
                perPiece={perPiece}
                pixelSize={pixelSize}
                showAnchors={showAnchors}
                showBounds={showBounds}
                showControls={showControls}
                showGrid={showGrid}
                showKeylines={showKeylines}
                strokeWidth={strokeWidth}
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

          {/* Ground-truth reference: the actual published component render. */}
          {node && (
            <>
              <Separator className="w-full max-w-md" />
              <div className="rounded-none border border-border bg-muted/10 px-6 py-4">
                <PackageRender
                  name={iconName}
                  strokeWidth={strokeWidth}
                  variant={variant}
                />
              </div>
            </>
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
                    setPixelSize(Array.isArray(v) ? v[0] : v)
                  }
                  step={24}
                  value={[pixelSize]}
                />
                <span className="w-8 shrink-0 text-right tabular-nums">
                  {Math.round((pixelSize / 24) * 10) / 10}×
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
                      setStrokeWidth(Array.isArray(v) ? v[0] : v)
                    }
                    step={0.25}
                    value={[strokeWidth]}
                  />
                  <span className="w-8 shrink-0 text-right tabular-nums">
                    {strokeWidth.toFixed(2)}
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
              {(
                [
                  ["grid", "Pixel grid", showGrid, setShowGrid],
                  ["keylines", "Keylines", showKeylines, setShowKeylines],
                  ["anchors", "Anchor points", showAnchors, setShowAnchors],
                  [
                    "controls",
                    "Control handles",
                    showControls,
                    setShowControls,
                  ],
                  ["bounds", "Bounding box", showBounds, setShowBounds],
                  ["perPiece", "Color per piece", perPiece, setPerPiece],
                ] as const
              ).map(([key, label, value, setter]) => (
                <Label htmlFor={gridIds[key]} key={key}>
                  <Checkbox
                    checked={value}
                    id={gridIds[key]}
                    onCheckedChange={(c) => setter(c === true)}
                  />
                  <span className="text-muted-foreground">{label}</span>
                </Label>
              ))}
            </div>

            <Separator />

            {/* Marker legend */}
            <LabLegend
              showAnchors={showAnchors}
              showBounds={showBounds}
              showControls={showControls}
              showGrid={showGrid}
              showKeylines={showKeylines}
            />

            <Separator />

            {/* Piece breakdown */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-muted-foreground">
                  Pieces
                </span>
                {isolatedPiece !== null && (
                  <Button
                    className="h-auto p-0 text-xs"
                    onClick={() => setIsolatedPiece(null)}
                    size="sm"
                    variant="link"
                  >
                    Show all
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
