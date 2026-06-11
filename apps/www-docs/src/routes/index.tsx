import { createFileRoute, Link } from "@tanstack/react-router";
import { buttonVariants } from "@workspace/ui/components/button";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import { HeroBlueprint } from "@/components/hero-blueprint";
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

function HomePage() {
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
            <h1 className="mt-8 font-semibold text-3xl tracking-normale sm:text-4xl">
              Sharp, squared icons <br /> for modern interfaces.
            </h1>
            <p className="mt-3 text-base text-muted-foreground">
              With {totalIcons} icons free and open-source
            </p>

            <div className="mt-6 flex items-center justify-center gap-4">
              <Link className={buttonVariants({ size: "lg" })} to="/icons">
                Explore all icons
              </Link>
              <a
                className={buttonVariants({ size: "lg", variant: "ghost" })}
                href="/docs"
              >
                Get started
              </a>
            </div>
            <HeroBlueprint />
          </div>
        </section>
      </div>
    </HomeLayout>
  );
}
