import { createFileRoute, Link } from "@tanstack/react-router";
import { Button, buttonVariants } from "@workspace/ui/components/button";
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
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { HeroBlueprint } from "@/components/hero-blueprint";
import { VARIANT_ICONS, VARIANT_MAPS, type Variant } from "@/lib/icons";
import { baseOptions } from "@/lib/layout.shared";
import { appName, pageTitle, siteUrl } from "@/lib/shared";

export const Route = createFileRoute("/")({
  component: IconsPage,
  head: () => ({
    meta: [
      { title: pageTitle("Sharp, squared icons for modern interfaces") },
      {
        name: "description",
        content: `Browse the full ${appName} set — sharp, squared, open-source SVG icons for React and vanilla JS. Search, customize size, stroke, and color, then copy the code.`,
      },
    ],
    links: [{ rel: "canonical", href: `${siteUrl}/` }],
  }),
});

// Decorative crosshair marker centered on a cell's top-left grid intersection.
// The grid gap line sits at the cell's exact top/left edge (x=0, y=0). Each arm
// is an odd-length 1px bar offset by whole integer pixels so it snaps to the
// device pixel grid instead of landing on a half-pixel (which blurs / shifts it).
const ARM = 7; // total arm length in px (odd, so the 1px line is dead-centered)
const HALF = (ARM - 1) / 2; // 3px on each side of the center pixel

function GridNode() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute top-0 left-0 z-10"
    >
      {/* The gap line occupies the 1px immediately before the cell edge, i.e. at
          x=-1 (vertical) and y=-1 (horizontal). Arms sit on that exact pixel. */}
      {/* horizontal arm: 1px tall, on the gap line at y=-1 */}
      <span
        className="absolute bg-border"
        style={{ left: -HALF - 1, top: -1, width: ARM, height: 1 }}
      />
      {/* vertical arm: 1px wide, on the gap line at x=-1 */}
      <span
        className="absolute bg-border"
        style={{ left: -1, top: -HALF - 1, width: 1, height: ARM }}
      />
    </span>
  );
}

// Bright registration brackets shown on the four corners of the selected cell.
// Reuses the grid's own line language (1px arms, integer-pixel snapped) but at
// full foreground strength and pointing INWARD from each corner — an L-bracket.
const BRACKET = 10; // arm length in px

function SelectedCorners() {
  // Each corner = one horizontal + one vertical arm meeting at the cell corner.
  // Coordinates are integer px relative to the cell box (0,0 top-left).
  const corners = [
    { h: { left: -1, top: -1 }, v: { left: -1, top: -1 } }, // top-left
    { h: { right: -1, top: -1 }, v: { right: -1, top: -1 } }, // top-right
    { h: { left: -1, bottom: -1 }, v: { left: -1, bottom: -1 } }, // bottom-left
    { h: { right: -1, bottom: -1 }, v: { right: -1, bottom: -1 } }, // bottom-right
  ];
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 z-20">
      {corners.map((c, i) => (
        <span key={`corner-${i}`}>
          <span
            className="absolute bg-foreground"
            style={{ ...c.h, width: BRACKET, height: 1 }}
          />
          <span
            className="absolute bg-foreground"
            style={{ ...c.v, width: 1, height: BRACKET }}
          />
        </span>
      ))}
    </span>
  );
}

interface SnippetOptions {
  absolute: boolean;
  color: string | null;
  importPath: string;
  selected: string | null;
  size: number;
  strokeWidth: number;
  variant: Variant;
}

function buildSnippet({
  selected,
  variant,
  importPath,
  size,
  strokeWidth,
  absolute,
  color,
}: SnippetOptions): string {
  if (!selected) {
    return "";
  }

  const importLine = `import { ${selected} } from "${importPath}"`;
  const colorProp = color ? ` color="${color}"` : "";

  if (variant === "stroke") {
    const absoluteProp = absolute ? " absoluteStrokeWidth" : "";
    return `${importLine}\n\n<${selected} size={${size}} strokeWidth={${strokeWidth}}${absoluteProp}${colorProp} />`;
  }

  return `${importLine}\n\n<${selected} size={${size}}${colorProp} />`;
}

function IconsPage() {
  const [variant, setVariant] = useState<Variant>("stroke");
  const [query, setQuery] = useState("");
  const [size, setSize] = useState(32);
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [color, setColor] = useState<string | null>(null);
  const [absolute, setAbsolute] = useState(false);
  const [showLabels, setShowLabels] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

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

  const importPath =
    variant === "stroke" ? "@jedd-icons/react" : `@jedd-icons/react/${variant}`;

  const snippet = buildSnippet({
    selected,
    variant,
    importPath,
    size,
    strokeWidth,
    absolute,
    color,
  });

  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const placeholderCount = Math.max(0, 60 - allIcons.length);
  const placeholders = Array.from({ length: placeholderCount }, (_, i) => ({
    name: `icon-${i + allIcons.length + 1}`,
  }));

  const totalIcons = VARIANT_ICONS.stroke.length + VARIANT_ICONS.fill.length;

  return (
    <HomeLayout {...baseOptions()}>
      <div className="min-h-svh bg-background text-foreground">
        <section
          className="relative mx-auto max-w-6xl px-6 py-6 text-center"
          style={{
            backgroundImage:
              "linear-gradient(to right, var(--color-border) 0.5px, transparent 0.5px), linear-gradient(to bottom, var(--color-border) 0.5px, transparent 0.5px)",
            backgroundSize: "24px 24px",
            backgroundPosition: "center center",
          }}
        >
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle, var(--color-border) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
              backgroundPosition: "center center",
              opacity: 0.6,
            }}
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at center, transparent 30%, var(--color-background) 80%)",
            }}
          />
          <div className="relative">
            <h1 className="mt-8 font-heading text-3xl sm:text-4xl">
              Sharp, squared icons <br /> for modern interfaces.
            </h1>
            <p className="mt-3 text-base text-muted-foreground">
              With {totalIcons} icons free and open-source
            </p>

            <div className="mt-6 flex items-center justify-center gap-4">
              <a className={buttonVariants({ size: "lg" })} href="#icons">
                Explore all icons
              </a>
              <Button size="lg" variant="ghost">
                Get started
              </Button>
            </div>
            <HeroBlueprint />
          </div>
        </section>

        <div
          className="sticky top-14 z-30 scroll-mt-14 border-b bg-background/80 backdrop-blur"
          id="icons"
        >
          <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-3 text-xs">
            <div className="flex shrink-0 overflow-hidden rounded-md border border-border">
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
              className="w-48 shrink-0"
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search icons..."
              type="search"
              value={query}
            />
            <span className="shrink-0 text-muted-foreground">
              {filtered.length}/{allIcons.length}
            </span>

            <Separator className="h-4" orientation="vertical" />

            <span className="shrink-0 text-muted-foreground">Size</span>
            <Slider
              className="min-w-12 flex-1"
              max={96}
              min={16}
              onValueChange={(v) => setSize(Array.isArray(v) ? v[0] : v)}
              step={1}
              value={[size]}
            />
            <span className="w-6 shrink-0 tabular-nums">{size}</span>

            {variant === "stroke" && (
              <>
                <Separator className="h-4" orientation="vertical" />

                <span className="shrink-0 text-muted-foreground">Stroke</span>
                <Slider
                  className="min-w-12 flex-1"
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
              </>
            )}

            <Separator className="h-4" orientation="vertical" />

            <span className="shrink-0 text-muted-foreground">Color</span>
            <input
              className="h-6 w-8 shrink-0 cursor-pointer border border-input bg-transparent p-0"
              onChange={(e) => setColor(e.target.value)}
              type="color"
              value={color ?? "#0f172a"}
            />

            {variant === "stroke" && (
              <>
                <Separator className="h-4" orientation="vertical" />

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

            <Separator className="h-4" orientation="vertical" />

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

            <Separator className="h-4" orientation="vertical" />

            <button
              className="shrink-0 text-muted-foreground hover:text-foreground"
              onClick={() => {
                setSize(32);
                setStrokeWidth(2);
                setColor(null);
                setAbsolute(false);
                setShowLabels(false);
              }}
              type="button"
            >
              Reset
            </button>
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
                        <Component
                          size={size}
                          {...(variant === "stroke"
                            ? { strokeWidth, absoluteStrokeWidth: absolute }
                            : {})}
                          {...(color ? { color } : {})}
                          aria-hidden
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
              <div className="flex shrink-0 items-center justify-center rounded-md border border-border bg-muted/30 p-4">
                <SelectedComponent
                  size={48}
                  {...(variant === "stroke"
                    ? { strokeWidth, absoluteStrokeWidth: absolute }
                    : {})}
                  {...(color ? { color } : {})}
                />
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-sm">{selected}</h2>
                  <div className="flex items-center gap-3">
                    <button
                      className="text-muted-foreground text-xs hover:text-foreground"
                      onClick={copy}
                      type="button"
                    >
                      {copied ? "Copied!" : "Copy"}
                    </button>
                    <Link
                      className="text-muted-foreground text-xs hover:text-foreground"
                      params={{ name: selected }}
                      search={{ variant }}
                      to="/icons/$name"
                    >
                      Expand &rarr;
                    </Link>
                    <button
                      className="text-muted-foreground text-xs hover:text-foreground"
                      onClick={() => setSelected(null)}
                      type="button"
                    >
                      &times;
                    </button>
                  </div>
                </div>
                <pre className="overflow-x-auto rounded-md border border-border bg-muted/30 p-2 text-xs">
                  <code>{snippet}</code>
                </pre>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </HomeLayout>
  );
}
