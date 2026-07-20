import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import { useMemo } from "react";
import { FooterCta } from "@/components/home/footer-cta";
import { HeroSection } from "@/components/home/hero-section";
import { IconPreviewGrid } from "@/components/home/icon-preview-grid";
import { SiteFooter } from "@/components/site-footer";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { VARIANT_ICONS } from "@/lib/icons";
import { baseOptions } from "@/lib/layout.shared";
import { appName, pageTitle, siteUrl, socialMeta } from "@/lib/shared";

const homeTitle = pageTitle("Sharp, squared icons for modern interfaces");
const homeDescription = `${appName} — sharp, squared, open-source SVG icons for React and vanilla JS. Browse the full set, customize size, stroke, and color, then copy the code.`;

export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => ({
    meta: [
      { title: homeTitle },
      { name: "description", content: homeDescription },
      ...socialMeta({
        title: homeTitle,
        description: homeDescription,
        url: `${siteUrl}/`,
      }),
    ],
    links: [{ rel: "canonical", href: `${siteUrl}/` }],
  }),
});

function HomePage() {
  const navigate = useNavigate();
  const totalIcons = VARIANT_ICONS.stroke.length + VARIANT_ICONS.fill.length;

  // Keyboard shortcuts mirroring the TiltButton chips: E → browse icons, R → docs.
  useKeyboardShortcuts(
    useMemo(
      () => [
        { key: "e", handler: () => navigate({ to: "/icons" }) },
        {
          key: "r",
          handler: () => navigate({ params: { _splat: "" }, to: "/docs/$" }),
        },
      ],
      [navigate]
    )
  );

  return (
    <HomeLayout {...baseOptions()}>
      <div className="bg-background">
        <div className="relative mx-auto w-full max-w-6xl border-border border-x">
          <HeroSection totalIcons={totalIcons} />
          <IconPreviewGrid totalIcons={totalIcons} />
          <FooterCta />
          <SiteFooter />
        </div>
      </div>
    </HomeLayout>
  );
}
