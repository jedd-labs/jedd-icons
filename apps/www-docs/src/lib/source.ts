import { docs } from "collections/server";
import { loader } from "fumadocs-core/source";
import { lucideIconsPlugin } from "fumadocs-core/source/lucide-icons";
import { frameworkIconsPlugin } from "./framework-icons";
import { docsRoute } from "./shared";

const MD_EXTENSION = /\.md$/;

export const source = loader({
  source: docs.toFumadocsSource(),
  baseUrl: docsRoute,
  // frameworkIconsPlugin runs first and resolves our custom SVG names;
  // lucideIconsPlugin resolves every remaining name from Lucide.
  plugins: [frameworkIconsPlugin(), lucideIconsPlugin()],
});

export function markdownPathToSlugs(segs: string[]) {
  if (segs.length === 0) {
    return [];
  }

  const out = [...segs];
  out[out.length - 1] = out.at(-1)?.replace(MD_EXTENSION, "") ?? "";
  if (out.length === 1 && out[0] === "index") {
    out.pop();
  }
  return out;
}

export function slugsToMarkdownPath(slugs: string[]) {
  const segments = [...slugs];
  if (segments.length === 0) {
    segments.push("index.md");
  } else {
    segments[segments.length - 1] += ".md";
  }

  return {
    segments,
    url: `${docsRoute}/${segments.join("/")}`,
  };
}

export async function getLLMText(page: (typeof source)["$inferPage"]) {
  const processed = await page.data.getText("processed");

  return `# ${page.data.title} (${page.url})

${processed}`;
}
