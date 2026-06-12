import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Label } from "@workspace/ui/components/label";
import { Slider } from "@workspace/ui/components/slider";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import { useId, useState } from "react";
import {
  buildReactSnippet,
  buildVanillaSnippet,
  getIconRelease,
  humanizeIconName,
  type SnippetOptions,
  VARIANT_MAPS,
  type Variant,
} from "@/lib/icons";
import { baseOptions } from "@/lib/layout.shared";
import { appName, pageTitle, siteUrl } from "@/lib/shared";

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
  const { variant: initialVariant } = Route.useSearch();

  const [variant, setVariant] = useState<Variant>(initialVariant);
  const Component = VARIANT_MAPS[variant][name];
  const release = getIconRelease(name);

  const [size, setSize] = useState(48);
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [color, setColor] = useState<string | null>(null);
  const [absolute, setAbsolute] = useState(false);
  const [codeTab, setCodeTab] = useState<"react" | "vanilla">("react");

  const absoluteId = useId();

  const snippetOptions: SnippetOptions = {
    name,
    variant,
    size,
    strokeWidth,
    absolute,
    color,
  };
  const reactSnippet = buildReactSnippet(snippetOptions);
  const vanillaSnippet = buildVanillaSnippet(snippetOptions);

  const availableVariants = (["stroke", "fill"] as const).filter(
    (v) => name in VARIANT_MAPS[v]
  );

  const reset = () => {
    setSize(48);
    setStrokeWidth(2);
    setColor(null);
    setAbsolute(false);
  };

  return (
    <HomeLayout {...baseOptions()}>
      <div className="min-h-svh bg-background text-foreground">
        <div className="mx-auto max-w-2xl px-6 py-12">
          <Button
            render={<Link to="/icons">&larr; All icons</Link>}
            size="sm"
            variant="ghost"
          />

          <div className="mt-8 flex flex-col items-center gap-6">
            <div className="flex size-48 items-center justify-center border border-border bg-muted/30">
              {Component ? (
                <Component
                  size={size}
                  {...(variant === "stroke"
                    ? { strokeWidth, absoluteStrokeWidth: absolute }
                    : {})}
                  {...(color ? { color } : {})}
                />
              ) : (
                <div
                  className="bg-muted/40"
                  style={{ width: size, height: size }}
                />
              )}
            </div>

            <h1 className="font-heading text-2xl">{name}</h1>

            {release && (
              <p className="-mt-3 text-muted-foreground text-xs">
                {release.unreleased ? (
                  "Unreleased"
                ) : (
                  <>
                    Added in{" "}
                    <span
                      className="font-medium text-foreground"
                      title={new Date(
                        release.createdRelease.date
                      ).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    >
                      v{release.createdRelease.version}
                    </span>
                  </>
                )}
              </p>
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

          <div className="mt-8 flex flex-wrap items-center gap-6 text-xs">
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
                value={color ?? "#0f172a"}
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

          <div className="mt-8">
            <span className="font-medium text-muted-foreground text-xs">
              Usage
            </span>
            <Tabs
              className="mt-2"
              onValueChange={(value) =>
                setCodeTab(value as "react" | "vanilla")
              }
              value={codeTab}
            >
              <TabsList variant="line">
                <TabsTrigger value="react">React</TabsTrigger>
                <TabsTrigger value="vanilla">Vanilla</TabsTrigger>
              </TabsList>
              <TabsContent value="react">
                <DynamicCodeBlock
                  code={reactSnippet}
                  codeblock={{ className: "rounded-none" }}
                  lang="tsx"
                />
              </TabsContent>
              <TabsContent value="vanilla">
                <DynamicCodeBlock
                  code={vanillaSnippet}
                  codeblock={{ className: "rounded-none" }}
                  lang="js"
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </HomeLayout>
  );
}
