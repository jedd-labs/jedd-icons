import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Input } from "@workspace/ui/components/input";
import { Slider } from "@workspace/ui/components/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { GridNode, SelectedCorners } from "@/components/grid-node";
import { IconContributors } from "@/components/icon-contributors";
import { IconPreview } from "@/components/icon-preview";
import { IconReleaseInfo } from "@/components/icon-release-info";
import { SiteFooter } from "@/components/site-footer";
import { UsageTabs } from "@/components/usage-tabs";
import {
  CATEGORIES,
  FILL_COMING_SOON,
  getIconCategories,
  getIconContributors,
  getIconRelease,
  getIconTags,
  humanizeCategory,
  humanizeIconName,
  VARIANT_ICONS,
  VARIANT_MAPS,
  type Variant,
} from "@/lib/icons";
import { baseOptions } from "@/lib/layout.shared";
import { appName, pageTitle, siteUrl } from "@/lib/shared";
import { useIconCustomization } from "@/lib/use-icon-customization";

export const Route = createFileRoute("/icons/")({
  component: IconsPage,
  head: () => ({
    meta: [
      { title: pageTitle("Browse all icons") },
      {
        name: "description",
        content: `Browse the full ${appName} set — sharp, squared, open-source SVG icons for React and vanilla JS. Search, customize size, stroke, and color, then copy the code.`,
      },
    ],
    links: [{ rel: "canonical", href: `${siteUrl}/icons` }],
  }),
});

function IconsPage() {
  const [variant, setVariant] = useState<Variant>("stroke");
  const [query, setQuery] = useState("");
  const [showLabels, setShowLabels] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Non-sticky ref: the toolbar is sticky, so its rect.top is useless here.
  const mainRef = useRef<HTMLElement>(null);

  const scrollToGridTop = () => {
    const el = mainRef.current;
    if (!el) {
      return;
    }
    const HEADER_AND_TOOLBAR = 56 + 45;
    const y =
      window.scrollY + el.getBoundingClientRect().top - HEADER_AND_TOOLBAR;
    window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
  };

  const toggleCategory = (category: string) => {
    setActiveCategory((prev) => (prev === category ? null : category));
    // Filtering shrinks the page; keep the results in view.
    scrollToGridTop();
  };

  // auto-fill columns are responsive; read the live track count off the element.
  const gridRef = useRef<HTMLUListElement>(null);
  const [columns, setColumns] = useState(1);
  useEffect(() => {
    const el = gridRef.current;
    if (!el) {
      return;
    }
    const measure = () => {
      const tracks = getComputedStyle(el)
        .gridTemplateColumns.split(" ")
        .filter(Boolean).length;
      setColumns(Math.max(1, tracks));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const variantToggle = (
    <div className="flex shrink-0 overflow-hidden rounded-none border border-border">
      {(["stroke", "fill"] as const).map((v) => {
        const disabled = FILL_COMING_SOON && v === "fill";
        return (
          <button
            className={`px-2.5 py-1 text-xs capitalize transition-colors ${
              variant === v
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            } disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:text-muted-foreground`}
            disabled={disabled}
            key={v}
            onClick={() => {
              setVariant(v);
              setSelected(null);
            }}
            title={disabled ? "Fill variants coming soon" : undefined}
            type="button"
          >
            {v}
            {disabled && (
              <span className="ml-1 text-[10px] normal-case">soon</span>
            )}
          </button>
        );
      })}
    </div>
  );

  const {
    size,
    setSize,
    strokeWidth,
    setStrokeWidth,
    color,
    setColor,
    absolute,
    setAbsolute,
    reset,
    reactSnippet,
    vanillaSnippet,
  } = useIconCustomization({ name: selected ?? "", variant, defaultSize: 32 });

  const allIcons = VARIANT_ICONS[variant];
  const iconsMap = VARIANT_MAPS[variant];

  const filtered = useMemo(() => {
    const byCategory = activeCategory
      ? allIcons.filter((icon) =>
          getIconCategories(icon.name).includes(activeCategory)
        )
      : allIcons;

    const q = query.trim().toLowerCase();
    if (!q) {
      return byCategory;
    }

    // Rank: exact name (0) > prefix (1) > substring (2) > tag-only (3); MISS drops.
    const MISS = 4;
    const rank = (name: string) => {
      const n = name.toLowerCase();
      if (n === q) {
        return 0;
      }
      if (n.startsWith(q)) {
        return 1;
      }
      // Match both raw ("arrowdownleft") and humanized so cross-word queries hit.
      if (n.includes(q) || humanizeIconName(name).toLowerCase().includes(q)) {
        return 2;
      }
      if (getIconTags(name).some((t) => t.toLowerCase().includes(q))) {
        return 3;
      }
      return MISS;
    };

    return byCategory
      .map((icon) => ({ icon, score: rank(icon.name) }))
      .filter(({ score }) => score < MISS)
      .sort(
        (a, b) => a.score - b.score || a.icon.name.localeCompare(b.icon.name)
      )
      .map(({ icon }) => icon);
  }, [query, allIcons, activeCategory]);

  const SelectedComponent = selected ? iconsMap[selected] : null;

  const showPlaceholders = !(query || activeCategory);
  const placeholderCount = Math.max(0, 60 - allIcons.length);
  const placeholders = Array.from({ length: placeholderCount }, (_, i) => ({
    name: `icon-${i + allIcons.length + 1}`,
  }));

  // Edge cells get perimeter crosshairs (see GridNode).
  const totalCells =
    filtered.length + (showPlaceholders ? placeholders.length : 0);
  const isLastCol = (i: number) =>
    (i + 1) % columns === 0 || i === totalCells - 1;
  const isLastRow = (i: number) => i + columns >= totalCells;

  return (
    <HomeLayout {...baseOptions()}>
      <div className="min-h-svh bg-background text-foreground">
        <div
          className="sticky top-14 z-30 scroll-mt-14 border-b bg-background/80 backdrop-blur"
          id="icons"
        >
          {/* 3-column layout mirroring <main> so search aligns with the grid. */}
          <div className="mx-auto flex max-w-7xl gap-6 px-6 py-3 text-xs">
            <div className="hidden w-44 shrink-0 items-center lg:flex">
              {variantToggle}
            </div>

            <div className="flex min-w-0 flex-1 items-center gap-3 lg:gap-4">
              {/* Toggle rides with search once the left column is hidden. */}
              <div className="lg:hidden">{variantToggle}</div>

              <Input
                className="min-w-0 flex-1"
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${allIcons.length} icons...`}
                type="search"
                value={query}
              />
              <span className="shrink-0 text-muted-foreground">
                {filtered.length}/{allIcons.length}
              </span>
            </div>

            {/* Spacer matching the Customize sidebar. */}
            <div className="hidden w-56 shrink-0 lg:block" />
          </div>
        </div>

        <main
          className="mx-auto flex min-h-[calc(100svh-3.5rem)] max-w-7xl gap-6 px-6 py-6"
          ref={mainRef}
        >
          <aside className="hidden w-44 shrink-0 lg:block">
            <div className="sticky top-32 max-h-[calc(100svh-9rem)] overflow-y-auto">
              <div className="mb-2 flex items-center justify-between px-1">
                <h2 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  Categories
                </h2>
                {activeCategory && (
                  <Button
                    className="h-auto p-0 text-[10px] text-muted-foreground hover:text-foreground"
                    onClick={() => setActiveCategory(null)}
                    size="xs"
                    variant="link"
                  >
                    Clear
                  </Button>
                )}
              </div>
              {/* border-l is the guide line; each button's left border is the marker. */}
              <ul className="flex flex-col border-border/60 border-l">
                {CATEGORIES.map(({ name, count }) => {
                  const active = activeCategory === name;
                  return (
                    <li className="-ml-px" key={name}>
                      <Button
                        aria-pressed={active}
                        className={`w-full justify-between border-l ${
                          active
                            ? "border-l-primary bg-muted/50"
                            : "border-l-transparent"
                        }`}
                        onClick={() => toggleCategory(name)}
                        size="sm"
                        variant="ghost"
                      >
                        <span className="truncate">
                          {humanizeCategory(name)}
                        </span>
                        <span
                          className={`shrink-0 tabular-nums ${
                            active
                              ? "text-foreground/70"
                              : "text-muted-foreground/60"
                          }`}
                        >
                          {count}
                        </span>
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            {filtered.length === 0 ? (
              <p className="py-12 text-center text-muted-foreground text-sm">
                No icons match your filters.
              </p>
            ) : (
              <ul
                className="grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-px border border-border/40 bg-border/40"
                ref={gridRef}
              >
                {filtered.map(({ name, Component }, i) => (
                  <li className="relative" key={name}>
                    <GridNode lastCol={isLastCol(i)} lastRow={isLastRow(i)} />
                    {selected === name && <SelectedCorners />}
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <button
                            aria-label={`Select ${name}`}
                            className={`group relative flex aspect-square w-full flex-col items-center justify-center gap-2 p-3 transition-colors focus-visible:z-10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50 ${
                              selected === name
                                ? "z-10 bg-muted/30"
                                : "bg-background hover:bg-muted/10"
                            }`}
                            onClick={() =>
                              setSelected((prev) =>
                                prev === name ? null : name
                              )
                            }
                            type="button"
                          />
                        }
                      >
                        <span className="flex">
                          <IconPreview
                            absolute={absolute}
                            aria-hidden
                            color={color}
                            component={Component}
                            size={size}
                            strokeWidth={strokeWidth}
                            variant={variant}
                          />
                        </span>
                        {showLabels && (
                          <span
                            className={`overflow-hidden truncate text-[10px] leading-none transition-colors ${
                              selected === name
                                ? "text-foreground"
                                : "text-muted-foreground group-hover:text-foreground"
                            }`}
                          >
                            {name}
                          </span>
                        )}
                      </TooltipTrigger>
                      <TooltipContent side="bottom">{name}</TooltipContent>
                    </Tooltip>
                  </li>
                ))}
                {showPlaceholders &&
                  placeholders.map(({ name }, i) => (
                    <li className="relative" key={name}>
                      <GridNode
                        lastCol={isLastCol(filtered.length + i)}
                        lastRow={isLastRow(filtered.length + i)}
                      />
                      <div className="flex aspect-square w-full flex-col items-center justify-center gap-2 bg-muted/10 p-3">
                        <span className="flex">
                          <span
                            className="rounded-sm bg-muted/40"
                            style={{ width: size, height: size }}
                          />
                        </span>
                        {showLabels && (
                          <span className="overflow-hidden text-[10px] text-muted-foreground/50 leading-none">
                            coming soon
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
              </ul>
            )}
          </div>

          <aside className="hidden w-56 shrink-0 lg:block">
            <div className="sticky top-32 flex flex-col gap-4 border-border/60 border-l pl-4 text-xs">
              <div className="flex items-center justify-between">
                <h2 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  Customize
                </h2>
                <Button
                  className="h-auto p-0 text-[10px] text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    reset();
                    setShowLabels(false);
                  }}
                  size="xs"
                  variant="link"
                >
                  Reset
                </Button>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Size</span>
                  <span className="tabular-nums">{size}</span>
                </div>
                <Slider
                  max={96}
                  min={16}
                  onValueChange={(v) => setSize(Array.isArray(v) ? v[0] : v)}
                  step={1}
                  value={[size]}
                />
              </div>

              {variant === "stroke" && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Stroke</span>
                    <span className="tabular-nums">
                      {strokeWidth.toFixed(2)}
                    </span>
                  </div>
                  <Slider
                    max={3}
                    min={0.5}
                    onValueChange={(v) =>
                      setStrokeWidth(Array.isArray(v) ? v[0] : v)
                    }
                    step={0.25}
                    value={[strokeWidth]}
                  />
                </div>
              )}

              <label
                className="flex items-center justify-between"
                htmlFor="icon-color"
              >
                <span className="text-muted-foreground">Color</span>
                <input
                  className="h-6 w-8 shrink-0 cursor-pointer border border-input bg-transparent p-0"
                  id="icon-color"
                  onChange={(e) => setColor(e.target.value)}
                  type="color"
                  value={color ?? "#0f172a"}
                />
              </label>

              {variant === "stroke" && (
                <label
                  className="flex items-center gap-2"
                  htmlFor="absolute-stroke-width"
                >
                  <Checkbox
                    checked={absolute}
                    id="absolute-stroke-width"
                    onCheckedChange={(checked) => setAbsolute(!!checked)}
                  />
                  <span className="text-muted-foreground">
                    absoluteStrokeWidth
                  </span>
                </label>
              )}

              <label className="flex items-center gap-2" htmlFor="show-labels">
                <Checkbox
                  checked={showLabels}
                  id="show-labels"
                  onCheckedChange={(checked) => setShowLabels(!!checked)}
                />
                <span className="text-muted-foreground">Labels</span>
              </label>
            </div>
          </aside>
        </main>
      </div>

      <div className="mx-auto w-full max-w-7xl border-border border-x">
        <SiteFooter />
      </div>

      <AnimatePresence>
        {selected && SelectedComponent && (
          <motion.div
            animate={{ y: 0 }}
            className="fixed inset-x-0 bottom-0 z-20 border-border border-t bg-background/95 backdrop-blur"
            exit={{ y: "100%" }}
            initial={{ y: "100%" }}
            key={`${variant}-${selected}`}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
          >
            <div className="mx-auto flex max-w-7xl items-start gap-6 px-6 py-4 sm:items-center">
              <div className="flex shrink-0 items-center justify-center rounded-none border border-border bg-muted/30 p-4">
                <IconPreview
                  absolute={absolute}
                  color={color}
                  component={SelectedComponent}
                  size={48}
                  strokeWidth={strokeWidth}
                  variant={variant}
                />
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <h2 className="font-semibold text-sm">{selected}</h2>
                    <div className="flex items-center gap-3">
                      <IconReleaseInfo release={getIconRelease(selected)} />
                      <IconContributors
                        contributors={getIconContributors(selected, variant)}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      render={
                        <Link
                          params={{ name: selected }}
                          search={{ variant }}
                          to="/icons/$name"
                        >
                          Expand &rarr;
                        </Link>
                      }
                      size="sm"
                      variant="ghost"
                    />
                    <Button
                      aria-label="Close"
                      onClick={() => setSelected(null)}
                      size="icon-sm"
                      variant="ghost"
                    >
                      <X />
                    </Button>
                  </div>
                </div>
                <UsageTabs
                  reactSnippet={reactSnippet}
                  vanillaSnippet={vanillaSnippet}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </HomeLayout>
  );
}
