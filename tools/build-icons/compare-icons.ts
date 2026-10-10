#!/usr/bin/env node
/**
 * Checks re-exported source SVGs against the committed icons and reports
 * whether the packages would still ship the same shapes. Works on raw design
 * tool exports too; they're cleaned in memory the same way `icons:clean` would.
 *
 * Usage:
 *   tsx tools/build-icons/compare-icons.ts [--ref <git-ref>]
 *     Every icon changed or added under icons/ since the ref (default HEAD).
 *   tsx tools/build-icons/compare-icons.ts --from <dir> [--variant stroke]
 *     Every SVG in <dir>, against the committed icon of the same name. Also
 *     lists committed icons missing from <dir>.
 *   Add --verbose to list the icons in every group, not just the changed ones.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { type Comparison, compareIcon } from "./compare-icons.lib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");

const arg = (name: string) => {
  const i = process.argv.indexOf(name);
  return i === -1 ? undefined : process.argv[i + 1];
};
const ref = arg("--ref") ?? "HEAD";
const from = arg("--from");
const verbose = process.argv.includes("--verbose");

interface Pair {
  after: string | null;
  before: string | null;
  label: string;
  variant: string;
}

const git = (...args: string[]) =>
  execFileSync("git", args, { cwd: ROOT, encoding: "utf8" });
const lines = (out: string) => out.split("\n").filter(Boolean);
const readOrNull = (path: string) =>
  existsSync(path) ? readFileSync(path, "utf8") : null;

function gitPairs(): Pair[] {
  const changed = lines(git("diff", "--name-only", ref, "--", "icons/*.svg"));
  const untracked = lines(
    git("ls-files", "--others", "--exclude-standard", "--", "icons/*.svg")
  );
  return [...new Set([...changed, ...untracked])].sort().map((file) => {
    let before: string | null = null;
    try {
      before = git("show", `${ref}:${file}`);
    } catch {
      // Not in the ref: a new (or misnamed) icon.
    }
    return {
      label: file.replace(/^icons\//, ""),
      variant: basename(dirname(file)),
      before,
      after: readOrNull(join(ROOT, file)),
    };
  });
}

/** Pairs for a folder of exports, plus committed icons the folder lacks. */
function folderPairs(dir: string): { missing: string[]; pairs: Pair[] } {
  const variant = arg("--variant") ?? "stroke";
  const committedDir = join(ROOT, "icons", variant);
  const svgs = (d: string) => readdirSync(d).filter((f) => f.endsWith(".svg"));
  const exported = svgs(dir).sort();
  const pairs = exported.map((file) => ({
    label: `${variant}/${file}`,
    variant,
    before: readOrNull(join(committedDir, file)),
    after: readFileSync(join(dir, file), "utf8"),
  }));
  const missing = svgs(committedDir)
    .filter((f) => !exported.includes(f))
    .map((f) => `${variant}/${f}`);
  return { pairs, missing };
}

const fmtPoint = (p: string) => `(${p.replace(",", ", ")})`;

/** "dot (12, 16)", "(3, 3.71) → (21, 3.71)" or a curve's end points. */
function describeSegment(key: string): string {
  const style = key.match(/^\[([^\]]*)\] /)?.[1];
  const body = key.replace(/^\[[^\]]*\] /, "");
  const suffix = style ? ` [${style}]` : "";
  if (body.startsWith("<")) {
    return body;
  }
  if (body.startsWith("dot ")) {
    return `dot ${fmtPoint(body.slice(4))}${suffix}`;
  }
  const pts = body.split(" ");
  const kind = pts.length === 4 ? " (curve)" : "";
  return `${fmtPoint(pts[0])} → ${fmtPoint(pts.at(-1) ?? "")}${kind}${suffix}`;
}

type Group = Comparison["verdict"] | "new" | "deleted" | "missing" | "error";
const LABELS: Record<Group, string> = {
  identical: "identical (packages ship the same bytes)",
  "same-geometry": "same geometry (reordered, reversed, or other element type)",
  restructured: "restructured (same segments, split into strokes differently)",
  changed: "CHANGED",
  new: "NEW (no committed icon with this name)",
  deleted: "DELETED",
  missing: "MISSING from the export folder",
  error: "ERROR (could not compare)",
};
const groups = new Map<Group, string[]>();
const add = (group: Group, line: string) =>
  groups.set(group, [...(groups.get(group) ?? []), line]);

function compare({ label, variant, before, after }: Pair): void {
  if (before === null) {
    add("new", label);
    return;
  }
  if (after === null) {
    add("deleted", label);
    return;
  }
  let result: Comparison;
  try {
    result = compareIcon(before, after, variant);
  } catch (error) {
    add("error", `${label}: ${(error as Error).message}`);
    return;
  }
  if (result.verdict !== "changed") {
    add(result.verdict, label);
    return;
  }
  const shift =
    result.maxShift === null
      ? "segments added, removed or reshaped"
      : `moved up to ${result.maxShift.toFixed(2)}px`;
  add(
    "changed",
    [
      `${label}  (${shift})`,
      ...result.removed.map((k) => `      - ${describeSegment(k)}`),
      ...result.added.map((k) => `      + ${describeSegment(k)}`),
    ].join("\n")
  );
}

let pairs: Pair[];
let missing: string[] = [];
if (from) {
  ({ pairs, missing } = folderPairs(resolve(process.cwd(), from)));
  console.log(`[compare-icons] ${pairs.length} SVG(s) in ${from}:`);
} else {
  pairs = gitPairs();
  console.log(`[compare-icons] ${pairs.length} icon(s) changed since ${ref}:`);
}
for (const pair of pairs) {
  compare(pair);
}
for (const label of missing) {
  add("missing", label);
}

const DETAILED: Group[] = ["changed", "new", "deleted", "missing", "error"];
for (const group of Object.keys(LABELS) as Group[]) {
  const items = groups.get(group);
  if (!items) {
    continue;
  }
  console.log(`\n${items.length} ${LABELS[group]}`);
  if (verbose || DETAILED.includes(group) || group === "restructured") {
    for (const item of items) {
      console.log(`  ${item}`);
    }
  }
}

if (DETAILED.some((g) => groups.has(g))) {
  process.exitCode = 1;
}
