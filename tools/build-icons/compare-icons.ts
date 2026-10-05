#!/usr/bin/env node
/**
 * Checks re-exported source SVGs against a committed version: for every icon
 * changed or added under icons/ since `--ref` (default HEAD), reports whether
 * the packages would still ship the same geometry. Works on raw exports too;
 * they're cleaned in memory the same way `clean-svgs` would.
 *
 * Usage: tsx tools/build-icons/compare-icons.ts [--ref <git-ref>]
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { type Comparison, compareIcon } from "./compare-icons.lib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");

const refIdx = process.argv.indexOf("--ref");
const ref = refIdx === -1 ? "HEAD" : process.argv[refIdx + 1];

const git = (...args: string[]) =>
  execFileSync("git", args, { cwd: ROOT, encoding: "utf8" });

const lines = (out: string) => out.split("\n").filter(Boolean);

const changed = lines(git("diff", "--name-only", ref, "--", "icons/*.svg"));
const untracked = lines(
  git("ls-files", "--others", "--exclude-standard", "--", "icons/*.svg")
);
const files = [...new Set([...changed, ...untracked])].sort();

if (files.length === 0) {
  console.log(`[compare-icons] no icon changes since ${ref}`);
  process.exit(0);
}

const LABELS: Record<Comparison["verdict"], string> = {
  identical: "identical",
  "same-geometry": "same geometry (reordered/reformatted)",
  changed: "CHANGED",
};

const counts: Record<string, number> = {};
const count = (key: string) => {
  counts[key] = (counts[key] ?? 0) + 1;
};

function readAt(file: string): string | null {
  try {
    return git("show", `${ref}:${file}`);
  } catch {
    return null;
  }
}

function report(file: string): void {
  const icon = file.replace(/^icons\//, "");
  const variant = basename(dirname(file));
  const before = readAt(file);
  let after: string | null = null;
  try {
    after = readFileSync(join(ROOT, file), "utf8");
  } catch {
    // Deleted in the working tree.
  }

  if (before === null) {
    count("new");
    console.log(`  NEW        ${icon} (no version at ${ref}; misnamed?)`);
    return;
  }
  if (after === null) {
    count("deleted");
    console.log(`  DELETED    ${icon}`);
    return;
  }

  const result = compareIcon(before, after, variant);
  count(result.verdict);
  const [was, now] = result.elements;
  console.log(
    `  ${LABELS[result.verdict].padEnd(10)} ${icon}  (elements ${was} → ${now})`
  );
  for (const sub of result.removed) {
    console.log(`      - ${sub}`);
  }
  for (const sub of result.added) {
    console.log(`      + ${sub}`);
  }
}

console.log(`[compare-icons] ${files.length} icon(s) changed since ${ref}:`);
for (const file of files) {
  report(file);
}
console.log(
  `[compare-icons] ${Object.entries(counts)
    .map(([k, n]) => `${n} ${k}`)
    .join(", ")}`
);
if (counts.changed || counts.new) {
  console.log(
    "[compare-icons] CHANGED can still render the same (a closed shape starting at another corner, or drawn in reverse); check those visually."
  );
  process.exitCode = 1;
}
