#!/usr/bin/env node
// The codegen for @jedd-icons/react-animated, invoked as `pnpm gen` from that
// package. Like `build.ts` it turns each source SVG into a module, but keeps
// the elements unmerged (each one can move on its own) and adds the icon's
// animation file, `animations/<variant>/<name>.ts`, if it has one. Icons
// without one still get the presets (draw, pulse…).
//
// Separate from `build.ts` so the static packages' output can't change. It
// refuses to bake an animation file `icons:check` would reject.

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  animatedIconNode,
  checkAnimations,
  renderAnimatedIconFile,
} from "./animated.lib";
import {
  animationFile,
  loadAnimations,
  orphanAnimations,
} from "./animation-files";
import { DEFAULT_VARIANT } from "./build.lib";
import { kebabToPascal } from "./naming";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const ICONS_DIR = join(ROOT, "icons");
const PKG_DIR = join(ROOT, "packages", "react-animated", "src");

const variants = readdirSync(ICONS_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

function aliasExportLines(variant: string, name: string): string[] {
  const metaPath = join(ICONS_DIR, variant, `${name}.json`);
  if (!existsSync(metaPath)) {
    return [];
  }
  const meta = JSON.parse(readFileSync(metaPath, "utf8")) as {
    aliases?: { name: string }[];
  };
  return (meta.aliases ?? []).map(
    (alias) =>
      `export { default as ${kebabToPascal(alias.name)} } from "./${name}"`
  );
}

/** Writes one variant's icons; returns the problems with its animation files. */
async function buildVariant(variant: string): Promise<string[]> {
  // Default variant uses src/icons/, others src/icons-{variant}/ plus a
  // src/{variant}.ts entry, as in the static packages.
  const outDir = join(
    PKG_DIR,
    variant === DEFAULT_VARIANT ? "icons" : `icons-${variant}`
  );
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  const names = readdirSync(join(ICONS_DIR, variant))
    .filter((f) => f.endsWith(".svg"))
    .map((f) => basename(f, ".svg"))
    .sort();
  const errors = orphanAnimations(variant, names).map(
    (name) => `${animationFile(variant, name)}: no icon to animate`
  );
  const indexLines: string[] = [];
  const aliasLines: string[] = [];
  let animated = 0;

  for (const name of names) {
    const svg = readFileSync(join(ICONS_DIR, variant, `${name}.svg`), "utf8");
    let definition: Awaited<ReturnType<typeof loadAnimations>> = null;
    try {
      definition = await loadAnimations(variant, name);
    } catch (error) {
      errors.push(
        `${animationFile(variant, name)}: ${(error as Error).message}`
      );
    }
    if (definition) {
      animated += 1;
      for (const issue of checkAnimations(svg, definition)) {
        errors.push(`${animationFile(variant, name)}: ${issue.message}`);
      }
    }
    writeFileSync(
      join(outDir, `${name}.ts`),
      renderAnimatedIconFile(
        name,
        animatedIconNode(svg, definition?.groups),
        variant,
        definition ?? undefined
      )
    );
    indexLines.push(
      `export { default as ${kebabToPascal(name)} } from "./${name}"`
    );
    aliasLines.push(...aliasExportLines(variant, name));
  }

  writeFileSync(
    join(outDir, "index.ts"),
    `${[...indexLines, ...aliasLines].join("\n")}\n`
  );
  if (variant !== DEFAULT_VARIANT) {
    writeFileSync(
      join(PKG_DIR, `${variant}.ts`),
      `"use client"\nexport * from "./icons-${variant}"\n`
    );
  }
  console.log(
    `[build-animated] ${variant}: generated ${names.length} icons (${animated} with their own animations) → ${outDir}`
  );
  return errors;
}

const errors: string[] = [];
for (const variant of variants) {
  errors.push(...(await buildVariant(variant)));
}
if (errors.length > 0) {
  for (const error of errors) {
    console.error(`[build-animated] ${error}`);
  }
  console.error("[build-animated] run `pnpm icons:check` for the details");
  process.exit(1);
}
