#!/usr/bin/env node
// Derives, from git history, the release in which each icon first appeared
// ("since version") and the release it was last changed in. The result is
// written to apps/www-docs/.generated/icon-releases.json for the docs site.

import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { kebabToPascal } from "./naming";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const ICONS_DIR = join(ROOT, "icons");

// The react package's tags are the canonical "since version" series. (react and
// core version together, and the docs gallery is React-centric.)
const TAG_PREFIX = "@jedd-icons/react@";
const REACT_PKG_JSON = join(ROOT, "packages", "react", "package.json");

// Public remote to pull tags from. Overridable via env for forks / mirrors.
const REMOTE_URL =
  process.env.JEDD_RELEASES_REMOTE ??
  "https://github.com/jedd-labs/jedd-icons.git";

// Generated artifact — lives in the app's `.generated/` dir (gitignored),
// mirroring the `.source` convention, not in hand-written `src/`.
const OUTPUT_DIR = join(ROOT, "apps", "www-docs", ".generated");
const OUTPUT = join(OUTPUT_DIR, "icon-releases.json");

interface ReleaseRef {
  date: string;
  version: string;
}

interface IconRelease {
  changedRelease: ReleaseRef;
  createdRelease: ReleaseRef;
  /** True when the icon exists in the working tree but isn't in any tag yet. */
  unreleased?: boolean;
}

function git(args: string[]): string {
  return execFileSync("git", args, {
    cwd: ROOT,
    encoding: "utf-8",
    maxBuffer: 1024 * 1024 * 64,
  }).trim();
}

function tryGit(args: string[]): string | null {
  try {
    return git(args);
  } catch {
    return null;
  }
}

function isShallowClone(): boolean {
  return tryGit(["rev-parse", "--is-shallow-repository"]) === "true";
}

function tagCount(): number {
  const out = tryGit(["tag", "-l", `${TAG_PREFIX}*`]);
  return out ? out.split("\n").filter(Boolean).length : 0;
}

/**
 * Make sure release tags AND their history are present. Shallow CI clones
 * (Cloudflare/Vercel) have neither, so we fetch tags from the public remote.
 * We unshallow when needed so the per-tag diffs can see full history — without
 * it, tag commits may be missing and an icon's "since" version gets misdated.
 */
function ensureTags() {
  // A full clone with tags already present needs nothing.
  if (!isShallowClone() && tagCount() > 0) {
    return;
  }

  // Unshallow first so tag commits and the history between them are reachable.
  if (isShallowClone()) {
    tryGit(["fetch", "--unshallow", "--tags", REMOTE_URL]);
  }

  // Then make sure every tag ref is present (covers the non-shallow-but-no-tags
  // case, e.g. `clone --no-tags`).
  if (tagCount() === 0) {
    const fetched = tryGit([
      "fetch",
      "--force",
      "--tags",
      REMOTE_URL,
      "refs/tags/*:refs/tags/*",
    ]);
    if (fetched === null) {
      console.warn(
        `[gen-releases] Could not fetch tags from ${REMOTE_URL} (offline?). Proceeding with local tags only.`
      );
    }
  }
}

// Minimal x.y.z(-pre)? comparator — enough for our simple version scheme.
function compareSemver(a: string, b: string): number {
  const parse = (v: string) => {
    const [core] = v.split("-", 1);
    return core.split(".").map((n) => Number.parseInt(n, 10) || 0);
  };
  const [a1, a2, a3] = parse(a);
  const [b1, b2, b3] = parse(b);
  return a1 - b1 || a2 - b2 || a3 - b3;
}

function isValidSemver(v: string): boolean {
  return /^\d+\.\d+\.\d+/.test(v);
}

/** Sorted react release tags (oldest → newest) with their version + commit date. */
function getReleaseTags(): { tag: string; version: string; date: string }[] {
  const tags = git(["tag", "-l", `${TAG_PREFIX}*`])
    .split("\n")
    .map((t) => t.trim())
    .filter(Boolean)
    .map((tag) => ({ tag, version: tag.slice(TAG_PREFIX.length) }))
    .filter(({ version }) => isValidSemver(version))
    .sort((a, b) => compareSemver(a.version, b.version));

  return tags.map(({ tag, version }) => {
    // `tag^{commit}` dereferences annotated tags to their commit, so the date
    // is the commit's ISO date — not the tag-object header that a bare
    // `git show <tag>` would print first.
    const date = git(["show", "-s", "--format=%cI", `${tag}^{commit}`]);
    return { tag, version, date };
  });
}

/** Icon name (basename, variant-agnostic) for an `icons/<variant>/<name>.svg` path. */
function iconNameFromPath(file: string): string | null {
  if (!(file.startsWith("icons/") && file.endsWith(".svg"))) {
    return null;
  }
  return basename(file, ".svg");
}

/** Every icon name present in the working tree (across all variant folders). */
function workingTreeIconNames(): Set<string> {
  const names = new Set<string>();
  if (!existsSync(ICONS_DIR)) {
    return names;
  }
  for (const variant of readdirSync(ICONS_DIR, { withFileTypes: true })) {
    if (!variant.isDirectory()) {
      continue;
    }
    const dir = join(ICONS_DIR, variant.name);
    for (const file of readdirSync(dir)) {
      if (file.endsWith(".svg")) {
        names.add(basename(file, ".svg"));
      }
    }
  }
  return names;
}

function currentPackageVersion(): string {
  const pkg = JSON.parse(readFileSync(REACT_PKG_JSON, "utf-8"));
  return typeof pkg.version === "string" ? pkg.version : "0.0.0";
}

// The empty tree, so the first tag's icons diff as "added" in that release.
const EMPTY_TREE = "4b825dc642cb6eb9a060e54bf8d69288fbee4904";

type Releases = Record<string, IconRelease>;

/** Apply one `git diff --name-status` line to the accumulating release map. */
function applyDiffLine(releases: Releases, line: string, ref: ReleaseRef) {
  const [status, file, renamedFile] = line.split("\t");

  // Renamed (Rxxx): the new path is the icon's current name; carry its original
  // createdRelease forward and bump changedRelease.
  if (status.startsWith("R")) {
    const newName = iconNameFromPath(renamedFile ?? "");
    if (!newName) {
      return;
    }
    const oldName = iconNameFromPath(file);
    const prevCreated =
      (oldName ? releases[oldName]?.createdRelease : undefined) ?? ref;
    releases[newName] = { changedRelease: ref, createdRelease: prevCreated };
    return;
  }

  const name = iconNameFromPath(file);
  if (!name) {
    return;
  }

  const existing = releases[name];
  if (existing) {
    // Any later add/modify only bumps the "changed" version.
    existing.changedRelease = ref;
    return;
  }

  // First time we've seen this icon (A = added, or M before any seen add in a
  // shallow history) → this release is its "since" version.
  if (status === "A" || status === "M") {
    releases[name] = { changedRelease: ref, createdRelease: ref };
  }
}

/** Build the release map by walking adjacent tag diffs over `icons/`. */
function collectReleases(tags: ReturnType<typeof getReleaseTags>): Releases {
  const releases: Releases = {};
  tags.forEach(({ tag, version, date }, i) => {
    const prev = i === 0 ? EMPTY_TREE : tags[i - 1].tag;
    const diff = git([
      "diff",
      "--name-status",
      "-M",
      prev,
      tag,
      "--",
      "icons/",
    ]);
    if (!diff) {
      return;
    }
    const ref: ReleaseRef = { date, version };
    for (const line of diff.split("\n")) {
      if (line) {
        applyDiffLine(releases, line, ref);
      }
    }
  });
  return releases;
}

/** Mark working-tree icons not present in any tag as unreleased (next version). */
function markUnreleased(releases: Releases) {
  const ref: ReleaseRef = {
    date: new Date().toISOString(),
    version: currentPackageVersion(),
  };
  for (const name of workingTreeIconNames()) {
    if (!releases[name]) {
      releases[name] = {
        changedRelease: ref,
        createdRelease: ref,
        unreleased: true,
      };
    }
  }
}

function main() {
  // Pull tags + history first so shallow CI clones can resolve them.
  ensureTags();
  const tags = getReleaseTags();

  // Loud failure mode: with no tags every icon is silently "unreleased" — data
  // that looks real but is wrong. Warn so a misconfigured deploy is obvious.
  if (tags.length === 0) {
    const why = isShallowClone()
      ? "this is a SHALLOW clone with no fetched tags (set fetch-depth: 0 in CI, or check network access to the remote)"
      : `no ${TAG_PREFIX}* tags exist yet`;
    console.warn(
      `[gen-releases] WARNING: no release tags found — ${why}. All icons will be marked "unreleased".`
    );
  }

  const releases = collectReleases(tags);
  markUnreleased(releases);

  // Key by PascalCase component name (matching the codegen's exports) so the
  // docs site can look metadata up directly by component name — no lossy
  // Pascal→kebab reverse transform. Convert only here, at the serialization
  // boundary, so the kebab-keyed rename tracking above stays intact.
  // NOTE: alias components (build.ts `aliasExportLines`) are not keyed here;
  // safe today because no sidecar defines aliases.
  const sorted = Object.fromEntries(
    Object.entries(releases)
      .map(([name, rel]) => [kebabToPascal(name), rel] as const)
      .sort(([a], [b]) => a.localeCompare(b))
  );

  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(OUTPUT, `${JSON.stringify(sorted, null, 2)}\n`, "utf-8");
  console.log(
    `Wrote release metadata for ${Object.keys(sorted).length} icon(s) → ${OUTPUT.replace(`${ROOT}/`, "")}`
  );
}

main();
