import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Label } from "@workspace/ui/components/label";
import { Slider } from "@workspace/ui/components/slider";
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import { Check, Copy, Download } from "lucide-react";
import { useId, useRef, useState } from "react";
import { GridDots, gridColumns } from "@/components/grid-dots";
import { IconContributors } from "@/components/icon-contributors";
import { IconInContext } from "@/components/icon-in-context";
import { IconPreview } from "@/components/icon-preview";
import { IconReleaseInfo } from "@/components/icon-release-info";
import { SiteFooter } from "@/components/site-footer";
import { UsageTabs } from "@/components/usage-tabs";
import {
  FILL_COMING_SOON,
  getAvailableVariants,
  getIconCategories,
  getIconContributors,
  getIconRelease,
  getIconTags,
  humanizeCategory,
  humanizeIconName,
  VARIANT_MAPS,
  type Variant,
} from "@/lib/icons";
import { baseOptions } from "@/lib/layout.shared";
import { appName, pageTitle, siteUrl } from "@/lib/shared";
import { useIconCustomization } from "@/lib/use-icon-customization";

const frameColumns = gridColumns(1);
const DEFAULT_COLOR_SWATCH = "#71717a";
const SIZE_LADDER = [16, 24, 40] as const;
const COPY_RESET_DELAY_MS = 1200;

export const Route = createFileRoute("/icons/$name")({
  component: IconPage,
  validateSearch: (search: Record<string, unknown>) => ({
    variant: (search.variant === "fill" ? "fill" : "stroke") as Variant,
  }),
  loader: ({ params }) => {
    const inStroke = params.name in VARIANT_MAPS.stroke;
    const inFill = params.name in VARIANT_MAPS.fill;
    if (!(inStroke || inFill)) {
      throw notFound();
    }
  },
  head: ({ params }) => {
    const label = humanizeIconName(params.name);
    return {
      meta: [
        { title: pageTitle(`${label} icon`) },
        {
          name: "description",
          content: `${label} (${params.name}) — a free, open-source ${appName} SVG icon for React and vanilla JS. Preview it live and copy the code, with adjustable size, stroke, and color.`,
        },
      ],
      // Canonical without the ?variant search param so stroke/fill variants
      // collapse to a single indexable URL.
      links: [{ rel: "canonical", href: `${siteUrl}/icons/${params.name}` }],
    };
  },
});

function IconPage() {
  const { name } = Route.useParams();
  const { variant: searchVariant } = Route.useSearch();
  const navigate = Route.useNavigate();

  // While fill is "coming soon" its tab is disabled, so the effective variant is
  // pinned to stroke — this also neutralizes any stale `?variant=fill` link.
  const variant: Variant = FILL_COMING_SOON ? "stroke" : searchVariant;

  // The selected variant lives in the URL search param — the single source of
  // truth — so tab changes stay shareable and keep the canonical URL honest.
  const setVariant = (next: Variant) => {
    navigate({ search: { variant: next }, replace: true });
  };

  const Component = VARIANT_MAPS[variant][name];
  const release = getIconRelease(name);
  const contributors = getIconContributors(name, variant);
  const categories = getIconCategories(name);
  const tags = getIconTags(name);

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
  } = useIconCustomization({ name, variant, defaultSize: 48 });

  const absoluteId = useId();
  const availableVariants = getAvailableVariants(name);

  const previewRef = useRef<HTMLDivElement>(null);
  const [copiedSvg, setCopiedSvg] = useState(false);

  const getSvgMarkup = () =>
    previewRef.current?.querySelector("svg")?.outerHTML;

  const copySvg = async () => {
    const markup = getSvgMarkup();
    if (!markup) {
      return;
    }
    await navigator.clipboard.writeText(markup);
    setCopiedSvg(true);
    setTimeout(() => setCopiedSvg(false), COPY_RESET_DELAY_MS);
  };

  const downloadSvg = () => {
    const markup = getSvgMarkup();
    if (!markup) {
      return;
    }
    const blob = new Blob([markup], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${name}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <HomeLayout {...baseOptions()}>
      <div className="bg-background text-foreground">
        <div className="relative mx-auto min-h-svh w-full max-w-6xl border-border border-x">
          {/* Back-nav bar */}
          <div className="relative border-border border-b px-6 py-3">
            <GridDots columns={frameColumns} row="100%" y="outer-bottom" />
            <Button
              render={<Link to="/icons">&larr; All icons</Link>}
              size="sm"
              variant="ghost"
            />
          </div>

          {/* Preview + controls + metadata */}
          <section className="relative border-border border-b px-6 py-10">
            <GridDots columns={frameColumns} row="100%" y="outer-bottom" />
            <div className="mx-auto grid max-w-5xl gap-y-6 lg:grid-cols-[380px_1fr] lg:gap-x-10 lg:gap-y-0">
              {/*
                Each column below is `contents` on mobile (its box disappears, so
                its children flatten into the outer grid and follow the `order-*`
                classes) and becomes a real flex column at `lg`, restoring the
                original two-column desktop layout in source order (`lg:order-none`
                cancels the mobile ordering).
              */}

              {/* Left column (desktop): preview + size ladder, then controls */}
              <div className="contents lg:col-start-1 lg:flex lg:flex-col lg:gap-4">
                <div className="order-3 flex gap-3 lg:order-none">
                  <div
                    className="relative flex aspect-square flex-1 items-center justify-center border border-border bg-muted/20 [&>svg]:h-full [&>svg]:w-full"
                    ref={previewRef}
                    style={{
                      backgroundImage:
                        "linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)",
                      backgroundSize: "calc(100% / 24) calc(100% / 24)",
                    }}
                  >
                    <IconPreview
                      absolute={absolute}
                      color={color}
                      component={Component}
                      size={size}
                      strokeWidth={strokeWidth}
                      variant={variant}
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    {SIZE_LADDER.map((s) => (
                      <div className="flex flex-col items-center gap-1" key={s}>
                        <div className="flex size-[72px] items-center justify-center border border-border bg-muted/20">
                          <IconPreview
                            absolute={absolute}
                            color={color}
                            component={Component}
                            size={s}
                            strokeWidth={strokeWidth}
                            variant={variant}
                          />
                        </div>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {s}px
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="order-4 border border-border p-5 lg:order-none">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-foreground">Size</span>
                          <span className="font-mono text-muted-foreground">
                            {size}px
                          </span>
                        </div>
                        <Slider
                          max={96}
                          min={16}
                          onValueChange={(v) =>
                            setSize(Array.isArray(v) ? v[0] : v)
                          }
                          step={1}
                          value={[size]}
                        />
                      </div>

                      {variant === "stroke" && (
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-foreground">
                              Stroke width
                            </span>
                            <span className="font-mono text-muted-foreground">
                              {strokeWidth.toFixed(1)}px
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
                    </div>

                    <div className="flex flex-col gap-4">
                      {variant === "stroke" && (
                        <Label
                          className="flex items-center justify-between text-xs"
                          htmlFor={absoluteId}
                        >
                          <span className="text-foreground">
                            Absolute stroke width
                          </span>
                          <Checkbox
                            checked={absolute}
                            id={absoluteId}
                            onCheckedChange={(checked) =>
                              setAbsolute(checked === true)
                            }
                          />
                        </Label>
                      )}

                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-foreground">Color</span>
                        <input
                          className="h-6 w-8 cursor-pointer border border-input bg-transparent p-0"
                          onChange={(e) => setColor(e.target.value)}
                          type="color"
                          value={color ?? DEFAULT_COLOR_SWATCH}
                        />
                        <span className="font-mono text-muted-foreground">
                          {(color ?? DEFAULT_COLOR_SWATCH).toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end border-border border-t pt-3">
                    <Button onClick={reset} size="sm" variant="ghost">
                      Reset
                    </Button>
                  </div>
                </div>
              </div>

              {/* Right column (desktop): title, metadata, actions, usage */}
              <div className="contents lg:col-start-2 lg:flex lg:min-w-0 lg:flex-col lg:gap-6">
                <div className="order-1 flex flex-col gap-3 lg:order-none">
                  <div>
                    <h1 className="font-heading text-3xl">
                      {humanizeIconName(name)}
                    </h1>
                    {tags.length > 0 && (
                      <p className="text-muted-foreground text-sm">
                        {tags.join(" · ")}
                      </p>
                    )}
                  </div>

                  {!FILL_COMING_SOON && availableVariants.length > 1 && (
                    <Tabs
                      onValueChange={(value) => setVariant(value as Variant)}
                      value={variant}
                    >
                      <TabsList>
                        {availableVariants.map((v) => (
                          <TabsTrigger className="capitalize" key={v} value={v}>
                            {v}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                    </Tabs>
                  )}
                </div>

                <div className="order-2 flex flex-wrap items-start justify-between gap-4 border-border border-t pt-4 lg:order-none">
                  <div className="flex flex-wrap items-center gap-2">
                    {categories.map((category) => (
                      <Badge key={category} variant="secondary">
                        {humanizeCategory(category)}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <IconReleaseInfo release={release} />
                    {contributors.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-xs">
                          {contributors.length > 1
                            ? "Contributors"
                            : "Contributor"}
                        </span>
                        <IconContributors contributors={contributors} />
                      </div>
                    )}
                  </div>
                </div>

                <div className="order-5 flex flex-wrap gap-3 lg:order-none">
                  <Button onClick={downloadSvg} variant="outline">
                    <Download />
                    Download SVG
                  </Button>
                  <Button onClick={copySvg} variant="outline">
                    {copiedSvg ? <Check /> : <Copy />}
                    Copy SVG
                  </Button>
                </div>

                <div className="order-6 flex min-h-0 flex-col lg:order-none lg:flex-1">
                  <h2 className="font-heading text-lg">Usage</h2>
                  <UsageTabs
                    className="mt-3 lg:min-h-0 lg:flex-1"
                    heightClassName="h-56 lg:h-full"
                    reactSnippet={reactSnippet}
                    snippetClassName="lg:h-full"
                    vanillaSnippet={vanillaSnippet}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* In context */}
          <section className="relative border-border border-b px-6 py-12">
            <GridDots columns={frameColumns} row="100%" y="outer-bottom" />
            <div className="mx-auto max-w-5xl">
              <h2 className="font-heading text-lg">In context</h2>
              <p className="mt-1 text-muted-foreground text-sm">
                A few ways this icon shows up across real UI, at different sizes
                and pairings.
              </p>
              <IconInContext className="mt-6" component={Component} />
            </div>
          </section>

          <SiteFooter />
        </div>
      </div>
    </HomeLayout>
  );
}
