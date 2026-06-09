export const appName = "Jedd Icons";
export const appDescription =
  "Beautiful, consistent SVG icons as React components and vanilla JS modules.";

// Production host. Used to build absolute URLs for canonical links,
// Open Graph tags, and the sitemap. No trailing slash.
export const siteUrl = "https://jeddicons.com";

export const docsRoute = "/docs";
export const docsImageRoute = "/og/docs";

// fill this with your actual GitHub info, for example:
export const gitConfig = {
  user: "jedd-labs",
  repo: "jedd-icons",
  branch: "main",
} as const;

export const repoUrl = `https://github.com/${gitConfig.user}/${gitConfig.repo}`;

/**
 * Builds a document title. Pass a page name to get "<page> — <appName>";
 * call with no argument for the site-wide default.
 */
export function pageTitle(page?: string) {
  return page ? `${page} — ${appName}` : `${appName} — Documentation`;
}
