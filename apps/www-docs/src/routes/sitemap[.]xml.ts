import { createFileRoute } from "@tanstack/react-router";
import { ALL_ICON_NAMES } from "@/lib/icons";
import { siteUrl } from "@/lib/shared";
import { source } from "@/lib/source";

interface SitemapEntry {
  changefreq?: string;
  path: string;
  priority?: number;
}

function urlEntry({ path, changefreq, priority }: SitemapEntry) {
  // siteUrl has no trailing slash; paths start with "/".
  const loc = `${siteUrl}${path}`;
  return `  <url>
    <loc>${loc}</loc>${changefreq ? `\n    <changefreq>${changefreq}</changefreq>` : ""}${
      priority === undefined
        ? ""
        : `\n    <priority>${priority.toFixed(1)}</priority>`
    }
  </url>`;
}

function buildSitemap() {
  // Only final, indexable (200) URLs belong in a sitemap. Bare "/docs" is
  // intentionally omitted: it 307-redirects to "/docs/react", which is itself
  // listed below via source.getPages().
  const entries: SitemapEntry[] = [
    { path: "/", changefreq: "daily", priority: 1.0 },
  ];

  // Docs pages, discovered from the Fumadocs source (page.url is the route path).
  // The default docs landing ("/docs/react") gets a higher priority.
  for (const page of source.getPages()) {
    entries.push({
      path: page.url,
      changefreq: "weekly",
      priority: page.url === "/docs/react" ? 0.8 : 0.7,
    });
  }

  // Individual icon pages, enumerated from the package exports.
  for (const name of ALL_ICON_NAMES) {
    entries.push({
      path: `/icons/${name}`,
      changefreq: "monthly",
      priority: 0.5,
    });
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map(urlEntry).join("\n")}
</urlset>`;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET() {
        return new Response(buildSitemap(), {
          headers: {
            "Content-Type": "application/xml",
            // Cache at the CDN edge; revalidate hourly.
            "Cache-Control": "public, max-age=3600, s-maxage=3600",
          },
        });
      },
    },
  },
});
