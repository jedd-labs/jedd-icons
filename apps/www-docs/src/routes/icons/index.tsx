import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Input } from "@workspace/ui/components/input";
import { Separator } from "@workspace/ui/components/separator";
import { Slider } from "@workspace/ui/components/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { GridNode, SelectedCorners } from "@/components/grid-node";
import { IconContributors } from "@/components/icon-contributors";
import { IconPreview } from "@/components/icon-preview";
import { IconReleaseInfo } from "@/components/icon-release-info";
import { UsageTabs } from "@/components/usage-tabs";
import {
  getIconContributors,
  getIconRelease,
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
    const q = query.trim().toLowerCase();
    if (!q) {
      return allIcons;
    }
    return allIcons.filter((i) => i.name.toLowerCase().includes(q));
  }, [query, allIcons]);

  const SelectedComponent = selected ? iconsMap[selected] : null;

  const placeholderCount = Math.max(0, 60 - allIcons.length);
  const placeholders = Array.from({ length: placeholderCount }, (_, i) => ({
    name: `icon-${i + allIcons.length + 1}`,
  }));

  return (
    <HomeLayout {...baseOptions()}>
      <div className="min-h-svh bg-background text-foreground">
        <div
          className="sticky top-14 z-30 scroll-mt-14 border-b bg-background/80 backdrop-blur"
          id="icons"
        >
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-3 text-xs lg:flex-row lg:items-center lg:gap-4">
            {/* Row 1: variant + search + count */}
            <div className="flex items-center gap-3 lg:shrink-0">
              <div className="flex shrink-0 overflow-hidden rounded-none border border-border">
                {(["stroke", "fill"] as const).map((v) => (
                  <button
                    className={`px-2.5 py-1 text-xs capitalize transition-colors ${
                      variant === v
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    key={v}
                    onClick={() => {
                      setVariant(v);
                      setSelected(null);
                    }}
                    type="button"
                  >
                    {v}
                  </button>
                ))}
              </div>

              <Input
                className="min-w-0 flex-1 lg:w-48 lg:flex-none"
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search icons..."
                type="search"
                value={query}
              />
              <span className="shrink-0 text-muted-foreground">
                {filtered.length}/{allIcons.length}
              </span>
            </div>

            {/* Row 2: numeric/toggle controls — wraps on small screens */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-3 lg:flex-1 lg:flex-nowrap">
              <Separator
                className="hidden h-4 lg:block"
                orientation="vertical"
              />

              <div className="flex flex-1 items-center gap-2">
                <span className="shrink-0 text-muted-foreground">Size</span>
                <Slider
                  className="min-w-16 flex-1"
                  max={96}
                  min={16}
                  onValueChange={(v) => setSize(Array.isArray(v) ? v[0] : v)}
                  step={1}
                  value={[size]}
                />
                <span className="w-6 shrink-0 tabular-nums">{size}</span>
              </div>

              {variant === "stroke" && (
                <>
                  <Separator
                    className="hidden h-4 lg:block"
                    orientation="vertical"
                  />

                  <div className="flex flex-1 items-center gap-2">
                    <span className="shrink-0 text-muted-foreground">
                      Stroke
                    </span>
                    <Slider
                      className="min-w-16 flex-1"
                      max={3}
                      min={0.5}
                      onValueChange={(v) =>
                        setStrokeWidth(Array.isArray(v) ? v[0] : v)
                      }
                      step={0.25}
                      value={[strokeWidth]}
                    />
                    <span className="w-8 shrink-0 tabular-nums">
                      {strokeWidth.toFixed(2)}
                    </span>
                  </div>
                </>
              )}

              <Separator
                className="hidden h-4 lg:block"
                orientation="vertical"
              />

              <label
                className="flex shrink-0 items-center gap-2"
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
                <>
                  <Separator
                    className="hidden h-4 lg:block"
                    orientation="vertical"
                  />

                  <label
                    className="flex shrink-0 items-center gap-2"
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
                </>
              )}

              <Separator
                className="hidden h-4 lg:block"
                orientation="vertical"
              />

              <label
                className="flex shrink-0 items-center gap-2"
                htmlFor="show-labels"
              >
                <Checkbox
                  checked={showLabels}
                  id="show-labels"
                  onCheckedChange={(checked) => setShowLabels(!!checked)}
                />
                <span className="text-muted-foreground">Labels</span>
              </label>

              <Separator
                className="hidden h-4 lg:block"
                orientation="vertical"
              />

              <button
                className="shrink-0 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  reset();
                  setShowLabels(false);
                }}
                type="button"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        <main className="mx-auto max-w-6xl px-6 py-6">
          {filtered.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground text-sm">
              No icons match &ldquo;{query}&rdquo;.
            </p>
          ) : (
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-px border border-border/40 bg-border/40">
              {filtered.map(({ name, Component }) => (
                <li className="relative" key={name}>
                  <GridNode />
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
                            setSelected((prev) => (prev === name ? null : name))
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
              {!query &&
                placeholders.map(({ name }) => (
                  <li className="relative" key={name}>
                    <GridNode />
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
        </main>
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
            <div className="mx-auto flex max-w-6xl items-start gap-6 px-6 py-4 sm:items-center">
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
