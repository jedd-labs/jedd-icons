import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Label } from "@workspace/ui/components/label";
import { Slider } from "@workspace/ui/components/slider";
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import { useId } from "react";
import { GridDots, gridColumns } from "@/components/grid-dots";
import { IconContributors } from "@/components/icon-contributors";
import { IconPreview } from "@/components/icon-preview";
import { IconReleaseInfo } from "@/components/icon-release-info";
import { SiteFooter } from "@/components/site-footer";
import { UsageTabs } from "@/components/usage-tabs";
import {
  getAvailableVariants,
  getIconCategories,
  getIconContributors,
  getIconRelease,
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
  const { variant } = Route.useSearch();
  const navigate = Route.useNavigate();

  // The selected variant lives in the URL search param — the single source of
  // truth — so tab changes stay shareable and keep the canonical URL honest.
  const setVariant = (next: Variant) => {
    navigate({ search: { variant: next }, replace: true });
  };

  const Component = VARIANT_MAPS[variant][name];
  const release = getIconRelease(name);
  const contributors = getIconContributors(name, variant);
  const categories = getIconCategories(name);

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

          {/* Preview + metadata */}
          <section className="relative border-border border-b px-6 py-12">
            <GridDots columns={frameColumns} row="100%" y="outer-bottom" />
            <div className="mx-auto flex max-w-2xl flex-col items-center gap-6">
              <div className="flex size-48 items-center justify-center border border-border bg-muted/30">
                <IconPreview
                  absolute={absolute}
                  color={color}
                  component={Component}
                  size={size}
                  strokeWidth={strokeWidth}
                  variant={variant}
                />
              </div>

              <h1 className="font-heading text-2xl">
                {humanizeIconName(name)}
              </h1>

              <IconReleaseInfo className="-mt-3" release={release} />

              {contributors.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs">
                    {contributors.length > 1 ? "Contributors" : "Contributor"}
                  </span>
                  <IconContributors contributors={contributors} />
                </div>
              )}

              {categories.length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <span className="text-muted-foreground text-xs">
                    {categories.length > 1 ? "Categories" : "Category"}
                  </span>
                  {categories.map((category) => (
                    <Badge key={category} variant="secondary">
                      {humanizeCategory(category)}
                    </Badge>
                  ))}
                </div>
              )}

              {availableVariants.length > 1 && (
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
          </section>

          {/* Customization controls */}
          <section className="relative border-border border-b px-6 py-8">
            <GridDots columns={frameColumns} row="100%" y="outer-bottom" />
            <div className="mx-auto flex max-w-2xl flex-wrap items-center gap-6 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Size</span>
                <div className="w-32">
                  <Slider
                    max={96}
                    min={16}
                    onValueChange={(v) => setSize(Array.isArray(v) ? v[0] : v)}
                    step={1}
                    value={[size]}
                  />
                </div>
                <span className="w-8 tabular-nums">{size}</span>
              </div>

              {variant === "stroke" && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Stroke</span>
                  <div className="w-32">
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
                  <span className="w-10 tabular-nums">
                    {strokeWidth.toFixed(2)}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Color</span>
                <input
                  className="h-6 w-8 cursor-pointer border border-input bg-transparent p-0"
                  onChange={(e) => setColor(e.target.value)}
                  type="color"
                  value={color ?? DEFAULT_COLOR_SWATCH}
                />
              </div>

              {variant === "stroke" && (
                <Label htmlFor={absoluteId}>
                  <Checkbox
                    checked={absolute}
                    id={absoluteId}
                    onCheckedChange={(checked) => setAbsolute(checked === true)}
                  />
                  <span className="text-muted-foreground">
                    absoluteStrokeWidth
                  </span>
                </Label>
              )}

              <Button onClick={reset} size="sm" variant="ghost">
                Reset
              </Button>
            </div>
          </section>

          {/* Usage snippets */}
          <section className="relative border-border border-b px-6 py-8">
            <GridDots columns={frameColumns} row="100%" y="outer-bottom" />
            <div className="mx-auto max-w-2xl">
              <span className="font-medium text-muted-foreground text-xs">
                Usage
              </span>
              <UsageTabs
                className="mt-2"
                heightClassName="h-64"
                reactSnippet={reactSnippet}
                vanillaSnippet={vanillaSnippet}
              />
            </div>
          </section>

          <SiteFooter />
        </div>
      </div>
    </HomeLayout>
  );
}
