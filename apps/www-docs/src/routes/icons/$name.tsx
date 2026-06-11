import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import { useState } from "react";
import { humanizeIconName, VARIANT_MAPS, type Variant } from "@/lib/icons";
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

  const [size, setSize] = useState(48);
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [color, setColor] = useState<string | null>(null);
  const [absolute, setAbsolute] = useState(false);
  const [copied, setCopied] = useState(false);

  const importPath =
    variant === "stroke" ? "@jedd-icons/react" : `@jedd-icons/react/${variant}`;

  const snippet =
    variant === "stroke"
      ? `import { ${name} } from "${importPath}"\n\n<${name} size={${size}} strokeWidth={${strokeWidth}}${absolute ? " absoluteStrokeWidth" : ""}${color ? ` color="${color}"` : ""} />`
      : `import { ${name} } from "${importPath}"\n\n<${name} size={${size}}${color ? ` color="${color}"` : ""} />`;

  const copy = async () => {
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const availableVariants = (["stroke", "fill"] as const).filter(
    (v) => name in VARIANT_MAPS[v]
  );

  return (
    <HomeLayout {...baseOptions()}>
      <div className="min-h-svh bg-background text-foreground">
        <div className="mx-auto max-w-2xl px-6 py-12">
          <Link
            className="text-muted-foreground text-sm hover:text-foreground"
            to="/icons"
          >
            &larr; All icons
          </Link>

          <div className="mt-8 flex flex-col items-center gap-6">
            <div className="flex items-center justify-center rounded-lg border border-border bg-muted/30 p-12">
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
                  className="rounded-sm bg-muted/40"
                  style={{ width: size, height: size }}
                />
              )}
            </div>

            <h1 className="font-heading text-2xl">{name}</h1>

            {availableVariants.length > 1 && (
              <div className="flex overflow-hidden rounded-md border border-border">
                {availableVariants.map((v) => (
                  <button
                    className={`px-3 py-1 text-xs capitalize transition-colors ${
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

          <div className="mt-8 flex flex-wrap items-center gap-4 text-xs">
            <label className="flex items-center gap-2">
              <span className="text-muted-foreground">Size</span>
              <input
                max={96}
                min={16}
                onChange={(e) => setSize(Number(e.target.value))}
                step={1}
                type="range"
                value={size}
              />
              <span className="w-8 tabular-nums">{size}</span>
            </label>

            {variant === "stroke" && (
              <label className="flex items-center gap-2">
                <span className="text-muted-foreground">Stroke</span>
                <input
                  max={3}
                  min={0.5}
                  onChange={(e) => setStrokeWidth(Number(e.target.value))}
                  step={0.25}
                  type="range"
                  value={strokeWidth}
                />
                <span className="w-10 tabular-nums">
                  {strokeWidth.toFixed(2)}
                </span>
              </label>
            )}

            <label className="flex items-center gap-2">
              <span className="text-muted-foreground">Color</span>
              <input
                className="h-6 w-8 cursor-pointer border border-input bg-transparent p-0"
                onChange={(e) => setColor(e.target.value)}
                type="color"
                value={color ?? "#0f172a"}
              />
            </label>

            {variant === "stroke" && (
              <label className="flex items-center gap-2">
                <input
                  checked={absolute}
                  onChange={(e) => setAbsolute(e.target.checked)}
                  type="checkbox"
                />
                <span className="text-muted-foreground">
                  absoluteStrokeWidth
                </span>
              </label>
            )}

            <button
              className="text-muted-foreground hover:text-foreground"
              onClick={() => {
                setSize(48);
                setStrokeWidth(2);
                setColor(null);
                setAbsolute(false);
              }}
              type="button"
            >
              Reset
            </button>
          </div>

          <div className="mt-8">
            <div className="flex items-center justify-between">
              <span className="font-medium text-muted-foreground text-xs">
                Usage
              </span>
              <button
                className="text-muted-foreground text-xs hover:text-foreground"
                onClick={copy}
                type="button"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <pre className="mt-2 overflow-x-auto rounded-lg border border-border bg-muted/30 p-4 text-sm">
              <code>{snippet}</code>
            </pre>
          </div>
        </div>
      </div>
    </HomeLayout>
  );
}
