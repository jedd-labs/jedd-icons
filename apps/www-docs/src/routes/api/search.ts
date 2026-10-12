import * as StrokeLib from "@jedd-icons/react";
import * as FillLib from "@jedd-icons/react/fill";
import { createFileRoute } from "@tanstack/react-router";
import { createSearchAPI } from "fumadocs-core/search/server";
import { source } from "@/lib/source";

const RESERVED = new Set(["Icon", "createJeddIcon", "defaultAttributes"]);

function extractNames(lib: Record<string, unknown>) {
  return Object.keys(lib).filter(
    (name) =>
      !RESERVED.has(name) && typeof lib[name] === "object" && lib[name] !== null
  );
}

const strokeNames = extractNames(
  StrokeLib as unknown as Record<string, unknown>
);
const fillNames = extractNames(FillLib as unknown as Record<string, unknown>);

const docsIndexes = source.getPages().map((page) => ({
  title: page.data.title,
  description: page.data.description,
  url: page.url,
  id: page.url,
  structuredData: page.data.structuredData,
  tag: "docs",
}));

const strokeIndexes = strokeNames.map((name) => ({
  title: name,
  description: `Jedd stroke icon: ${name}`,
  url: `/icons/${name}`,
  id: `icon-stroke-${name}`,
  structuredData: {
    headings: [] as { id: string; content: string }[],
    contents: [{ heading: undefined, content: name }],
  },
  tag: "icons",
}));

const fillIndexes = fillNames.map((name) => ({
  title: name,
  description: `Jedd fill icon: ${name}`,
  url: `/icons/${name}?variant=fill`,
  id: `icon-fill-${name}`,
  structuredData: {
    headings: [] as { id: string; content: string }[],
    contents: [{ heading: undefined, content: name }],
  },
  tag: "icons",
}));

// Built on the first request, not at module load: Orama yields with
// setTimeout while indexing, which Cloudflare Workers forbids in global scope.
let server: ReturnType<typeof createSearchAPI> | undefined;

function getServer() {
  server ??= createSearchAPI("advanced", {
    language: "english",
    indexes: [...docsIndexes, ...strokeIndexes, ...fillIndexes],
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
