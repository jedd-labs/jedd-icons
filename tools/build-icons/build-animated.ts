#!/usr/bin/env node
// The codegen for @jedd-icons/react-animated, invoked as `pnpm gen` from that
// package. Like `build.ts` it turns each source SVG into a module, but keeps
// the elements unmerged (each one can move on its own) and adds the icon's
// animation file from `animations/<variant>/<name>.ts`, if it has one. Icons
// without one still get the presets (draw, pulse…). Stroke variant only for now.
//
// Separate from `build.ts` so the static packages' codegen is untouched.

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { IconAnimations } from "../../animations/types";
import {
  animatedIconNode,
  checkAnimations,
  renderAnimatedIconFile,
} from "./animated.lib";
import { DEFAULT_VARIANT, parseSvg, stripInheritedAttrs } from "./build.lib";
import { kebabToPascal } from "./naming";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const VARIANT = DEFAULT_VARIANT;
const ICONS_DIR = join(ROOT, "icons", VARIANT);
const ANIMATIONS_DIR = join(ROOT, "animations", VARIANT);
const OUT_DIR = join(ROOT, "packages", "react-animated", "src", "icons");

async function loadAnimations(name: string): Promise<IconAnimations | null> {
  const file = join(ANIMATIONS_DIR, `${name}.ts`);
  if (!existsSync(file)) {
    return null;
  }
  const module = (await import(pathToFileURL(file).href)) as {
    default?: IconAnimations;
  };
  if (!module.default?.animations) {
    throw new Error(
      `animations/${VARIANT}/${name}.ts: needs a default export with \`animations\``
    );
  }
  return module.default;
}

function aliasExportLines(name: string): string[] {
  const metaPath = join(ICONS_DIR, `${name}.json`);
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

async function main() {
  const names = readdirSync(ICONS_DIR)
    .filter((f) => f.endsWith(".svg"))
    .map((f) => basename(f, ".svg"))
    .sort();

  const errors: string[] = [];
  const orphans = existsSync(ANIMATIONS_DIR)
    ? readdirSync(ANIMATIONS_DIR)
        .filter((f) => f.endsWith(".ts"))
        .map((f) => basename(f, ".ts"))
        .filter((name) => !names.includes(name))
    : [];
  for (const name of orphans) {
    errors.push(
      `animations/${VARIANT}/${name}.ts: no icons/${VARIANT}/${name}.svg to animate`
    );
  }

  rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(OUT_DIR, { recursive: true });

  const indexLines: string[] = [];
  const aliasLines: string[] = [];
  let animated = 0;

  for (const name of names) {
    const svg = readFileSync(join(ICONS_DIR, `${name}.svg`), "utf8");
    const parts = stripInheritedAttrs(parseSvg(svg));
    const definition = await loadAnimations(name);
    if (definition) {
      const problems = checkAnimations(parts, definition);
      errors.push(
        ...problems.map((p) => `animations/${VARIANT}/${name}.ts: ${p}`)
      );
      animated += 1;
    }

    writeFileSync(
      join(OUT_DIR, `${name}.ts`),
      renderAnimatedIconFile(
        name,
        animatedIconNode(parts, definition?.groups),
        definition?.animations ?? {},
        definition?.default
      )
    );
    indexLines.push(
      `export { default as ${kebabToPascal(name)} } from "./${name}"`
    );
    aliasLines.push(...aliasExportLines(name));
  }

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`[build-animated] ${error}`);
    }
    process.exit(1);
  }

  writeFileSync(
    join(OUT_DIR, "index.ts"),
    `${[...indexLines, ...aliasLines].join("\n")}\n`
  );
  console.log(
    `[build-animated] ${VARIANT}: generated ${names.length} icons (${animated} with their own animations) → ${OUT_DIR}`
  );
}

await main();
