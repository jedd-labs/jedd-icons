import { createFileRoute } from "@tanstack/react-router";
import { createSearchAPI } from "fumadocs-core/search/server";
import { VARIANT_ICONS, VARIANTS } from "@/lib/icons";
import { source } from "@/lib/source";

const docsIndexes = source.getPages().map((page) => ({
  title: page.data.title,
  description: page.data.description,
  url: page.url,
  id: page.url,
  structuredData: page.data.structuredData,
  tag: "docs",
}));

const iconIndexes = VARIANTS.flatMap((variant) =>
  VARIANT_ICONS[variant].map(({ name }) => ({
    title: name,
    description: `Jedd ${variant} icon: ${name}`,
    url:
      variant === "stroke"
        ? `/icons/${name}`
        : `/icons/${name}?variant=${variant}`,
    id: `icon-${variant}-${name}`,
    structuredData: {
      headings: [] as { id: string; content: string }[],
      contents: [{ heading: undefined, content: name }],
    },
    tag: "icons",
  }))
);

// Built on the first request, not at module load: Orama yields with
// setTimeout while indexing, which Cloudflare Workers forbids in global scope.
let server: ReturnType<typeof createSearchAPI> | undefined;

function getServer() {
  server ??= createSearchAPI("advanced", {
    language: "english",
    indexes: [...docsIndexes, ...iconIndexes],
  });
  return server;
}

export const Route = createFileRoute("/api/search")({
  server: {
    handlers: {
      GET: async ({ request }) => getServer().GET(request),
    },
  },
});
