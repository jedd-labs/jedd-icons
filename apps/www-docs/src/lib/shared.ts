export const appName = "Jedd Icons";
export const appDescription =
  "Beautiful, consistent SVG icons as React components and vanilla JS modules.";

// Production host. Used to build absolute URLs for canonical links,
// Open Graph tags, and the sitemap. No trailing slash.
export const siteUrl = "https://jeddicons.com";

export const docsRoute = "/docs";

// fill this with your actual GitHub info, for example:
export const gitConfig = {
  user: "jedd-labs",
  repo: "jedd-icons",
  branch: "main",
} as const;

export const repoUrl = `https://github.com/${gitConfig.user}/${gitConfig.repo}`;

// The release tag series the icon "since version" is derived from. Tags look
// like "@jedd-icons/react@0.0.4"; must match TAG_PREFIX in gen-releases.ts.
const RELEASE_TAG_PREFIX = "@jedd-icons/react@";

/**
 * GitHub release page URL for a given package version. The tag contains "@" and
 * "/", so it's URL-encoded into the path (e.g. "@jedd-icons/react@0.0.4" →
 * ".../releases/tag/%40jedd-icons%2Freact%400.0.4").
 */
export function releaseUrl(version: string) {
  const tag = encodeURIComponent(`${RELEASE_TAG_PREFIX}${version}`);
  return `${repoUrl}/releases/tag/${tag}`;
}

/** GitHub profile URL for a username. */
export function githubProfileUrl(username: string) {
  return `https://github.com/${encodeURIComponent(username)}`;
}

/**
 * GitHub avatar image URL for a username. `https://github.com/<user>.png`
 */
export function githubAvatarUrl(username: string, size = 64) {
  return `https://github.com/${encodeURIComponent(username)}.png?size=${size}`;
}

/**
 * Builds a document title. Pass a page name to get "<page> — <appName>";
 * call with no argument for the site-wide default.
 */
export function pageTitle(page?: string) {
  return page ? `${page} — ${appName}` : `${appName} — Documentation`;
}
