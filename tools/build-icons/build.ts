#!/usr/bin/env node
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
  DEFAULT_VARIANT,
  type IconNode,
  indexExportLine,
  parseSvg,
  renderReactIconFile,
  renderVanillaIconFile,
  stripInheritedAttrs,
  type Target,
} from "./build.lib";
import { kebabToPascal } from "./naming";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const ICONS_DIR = join(ROOT, "icons");

const target: Target = process.argv.includes("--target")
  ? (process.argv[process.argv.indexOf("--target") + 1] as Target)
  : "react";

const PKG_DIR =
  target === "vanilla"
    ? join(ROOT, "packages", "core", "src")
    : join(ROOT, "packages", "react", "src");

// ── Main ──────────────────────────────────────────────────────────────

function discoverVariants(): string[] {
  if (!existsSync(ICONS_DIR)) {
    throw new Error(`icons directory not found: ${ICONS_DIR}`);
  }

  const variants = readdirSync(ICONS_DIR, { withFileTypes: true })
    .filter((d: { isDirectory(): boolean }) => d.isDirectory())
    .map((d: { name: string }) => d.name)
    .sort();

  if (variants.length === 0) {
    throw new Error("no variant directories found under icons/");
  }

  return variants;
}

function resolveOutDir(variant: string): string {
  // Default variant uses src/icons/, others use src/icons-{variant}/
  return variant === DEFAULT_VARIANT
    ? join(PKG_DIR, "icons")
    : join(PKG_DIR, `icons-${variant}`);
}

function aliasExportLines(variantIconsDir: string, name: string): string[] {
  const metaPath = join(variantIconsDir, `${name}.json`);
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

/** Render one icon's source file and return its index/alias export lines. */
function buildIcon(
  variant: string,
  variantIconsDir: string,
  outDir: string,
  file: string
): { indexLine: string; aliasLines: string[] } {
  const name = basename(file, ".svg");
  const componentName = kebabToPascal(name);
  const svg = readFileSync(join(variantIconsDir, file), "utf8");
  const iconNode: IconNode = stripInheritedAttrs(parseSvg(svg));

  if (iconNode.length === 0) {
    console.warn(`[build-icons] ${variant}/${file}: no child elements parsed`);
  }

  const content =
    target === "vanilla"
      ? renderVanillaIconFile(name, iconNode)
      : renderReactIconFile(name, iconNode, variant);

  writeFileSync(join(outDir, `${name}.ts`), content);

  return {
    indexLine: indexExportLine(target, componentName, name),
    aliasLines: aliasExportLines(variantIconsDir, name),
  };
}

function writeVariantEntry(variant: string): void {
  if (variant === DEFAULT_VARIANT) {
    return;
  }

  const entryPath = join(PKG_DIR, `${variant}.ts`);
  const body =
    target === "react"
      ? `"use client"\nexport * from "./icons-${variant}"\n`
      : `export * from "./icons-${variant}"\n`;
  writeFileSync(entryPath, body);
}

function buildVariant(variant: string): void {
  const variantIconsDir = join(ICONS_DIR, variant);
  const outDir = resolveOutDir(variant);

  if (existsSync(outDir)) {
    rmSync(outDir, { recursive: true, force: true });
  }
  mkdirSync(outDir, { recursive: true });

  const files = readdirSync(variantIconsDir)
    .filter((f: string) => f.endsWith(".svg"))
    .sort();

  const indexLines: string[] = [];
  const aliasLines: string[] = [];

  for (const file of files) {
    const { indexLine, aliasLines: aliases } = buildIcon(
      variant,
      variantIconsDir,
      outDir,
      file
    );
    indexLines.push(indexLine);
    aliasLines.push(...aliases);
  }

  writeFileSync(
    join(outDir, "index.ts"),
    `${[...indexLines, ...aliasLines].join("\n")}\n`
  );

  writeVariantEntry(variant);

  console.log(
    `[build-icons] ${target}/${variant}: generated ${files.length} icons → ${outDir}`
  );
}

function main() {
  for (const variant of discoverVariants()) {
    buildVariant(variant);
  }
}

main();
