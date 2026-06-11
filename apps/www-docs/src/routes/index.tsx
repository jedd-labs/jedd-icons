import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Badge } from "@workspace/ui/components/badge";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import { ArrowRight, BoxIcon } from "lucide-react";
import { useEffect } from "react";
import {
  GridDots,
  gridColumns,
  responsiveGridColumns,
} from "@/components/grid-dots";
import { TiltButton } from "@/components/tilt-button";
import { VARIANT_ICONS } from "@/lib/icons";
import { baseOptions } from "@/lib/layout.shared";
import { appName, pageTitle, siteUrl } from "@/lib/shared";

export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => ({
    meta: [
      { title: pageTitle("Sharp, squared icons for modern interfaces") },
      {
        name: "description",
        content: `${appName} — sharp, squared, open-source SVG icons for React and vanilla JS. Browse the full set, customize size, stroke, and color, then copy the code.`,
      },
    ],
    links: [{ rel: "canonical", href: `${siteUrl}/` }],
  }),
});

const frameColumns = gridColumns(1);
const previewColumns = responsiveGridColumns(4, 8);

// Two full rows of an 8-wide grid. The preview is padded to this size with
// "coming soon" cells when the package ships fewer icons, so the grid always
// reads as a deliberate, complete block rather than a half-empty row.
const PREVIEW_SLOTS = 16;
const previewIcons = VARIANT_ICONS.stroke.slice(0, PREVIEW_SLOTS);
const previewPlaceholders = Math.max(0, PREVIEW_SLOTS - previewIcons.length);

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

function HomePage() {
  const navigate = useNavigate();
  const totalIcons = VARIANT_ICONS.stroke.length + VARIANT_ICONS.fill.length;

  // Keyboard shortcuts mirroring the TiltButton chips: E → browse icons, R → docs.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.repeat ||
        isEditableTarget(event.target)
      ) {
        return;
      }

      if (event.key.toLowerCase() === "e") {
        navigate({ to: "/icons" });
        return;
      }

      if (event.key.toLowerCase() === "r") {
        navigate({ params: { _splat: "" }, to: "/docs/$" });
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [navigate]);

  return (
    <HomeLayout {...baseOptions()}>
      <div className="bg-background">
        <div className="relative mx-auto w-full max-w-6xl border-border border-x">
          {/* Announcement banner */}
          <div className="relative border-border border-b px-6 py-3 text-center">
            <GridDots columns={frameColumns} row={0} y="top" />
            <GridDots columns={frameColumns} row="100%" y="outer-bottom" />
            <span className="text-muted-foreground text-sm">
              <Badge className="mr-2" variant="secondary">
                Open Source
              </Badge>
              {totalIcons} sharp, squared icons — free for any project
            </span>
          </div>

          {/* Hero */}
          <section className="relative border-border border-b px-6 py-20 text-center">
            <GridDots columns={frameColumns} row="100%" y="outer-bottom" />
            <h1 className="relative mx-auto mb-4 max-w-2xl font-semibold text-4xl text-foreground tracking-tight md:text-5xl">
              Sharp, squared icons{" "}
              <span className="text-muted-foreground">
                for modern interfaces
              </span>
            </h1>
            <p className="relative mx-auto mb-8 max-w-lg text-muted-foreground">
              {totalIcons} free, open-source SVG icons as React components and
              vanilla JS modules. Customize size, stroke, and color, then copy
              the code.
            </p>
            <div className="relative flex justify-center gap-3">
              <Link to="/icons">
                <TiltButton rounded={false} shortcut="E">
                  <BoxIcon />
                  Explore icons
                </TiltButton>
              </Link>
              <Link params={{ _splat: "" }} to="/docs/$">
                <TiltButton rounded={false} shortcut="R" variant="outline">
                  <ArrowRight />
                  Get started
                </TiltButton>
              </Link>
            </div>

            {/* <div className="relative mt-12 flex justify-center">
              <HeroBlueprint />
            </div> */}
          </section>

          {/* Live icon preview grid — links to the full gallery */}
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
            <div className="relative grid grid-cols-4 sm:grid-cols-8">
              <GridDots columns={previewColumns} row={0} y="top" />
              <GridDots columns={previewColumns} row="100%" y="outer-bottom" />
              {previewIcons.map(({ name, Component }, i) => (
                <Link
                  className={[
                    "group relative flex aspect-square items-center justify-center border-border border-t transition-colors hover:bg-muted/40",
                    (i + 1) % 8 === 0 ? "" : "sm:border-r",
                    (i + 1) % 4 === 0 ? "" : "max-sm:border-r",
                  ].join(" ")}
                  key={name}
                  params={{ name }}
                  search={{ variant: "stroke" as const }}
                  to="/icons/$name"
                >
                  <Component
                    aria-label={name}
                    className="text-muted-foreground transition-colors group-hover:text-foreground"
                    size={28}
                    strokeWidth={2}
                  />
                </Link>
              ))}
              {Array.from({ length: previewPlaceholders }, (_, p) => {
                const slot = previewIcons.length + p;
                return (
                  <div
                    aria-hidden
                    className={[
                      "relative flex aspect-square items-center justify-center border-border border-t bg-muted/10",
                      (slot + 1) % 8 === 0 ? "" : "sm:border-r",
                      (slot + 1) % 4 === 0 ? "" : "max-sm:border-r",
                    ].join(" ")}
                    key={`preview-placeholder-${slot}`}
                  >
                    <span className="size-7 rounded-sm bg-muted/40" />
                  </div>
                );
              })}
            </div>
          </section>

          {/* Footer CTA */}
          <section className="relative flex min-h-[20rem] items-center justify-center border-border border-b px-6 py-20 text-center">
            <GridDots columns={frameColumns} row="100%" y="outer-bottom" />
            <div>
              <h2 className="mb-2 font-semibold text-3xl text-foreground tracking-tight md:text-4xl">
                Ready to ship?
              </h2>
              <p className="mx-auto mb-8 max-w-md text-muted-foreground">
                Install {appName} and drop sharp, consistent icons into your app
                in minutes.
              </p>
              <Link params={{ _splat: "" }} to="/docs/$">
                <TiltButton rounded={false} shortcut="R">
                  <ArrowRight />
                  Read the docs
                </TiltButton>
              </Link>
            </div>
          </section>
        </div>
      </div>
    </HomeLayout>
  );
}
