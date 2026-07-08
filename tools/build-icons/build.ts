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
import { kebabToPascal } from "./naming";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const ICONS_DIR = join(ROOT, "icons");

const DEFAULT_VARIANT = "stroke";

type Target = "react" | "vanilla";

const target: Target = process.argv.includes("--target")
  ? (process.argv[process.argv.indexOf("--target") + 1] as Target)
  : "react";

const PKG_DIR =
  target === "vanilla"
    ? join(ROOT, "packages", "core", "src")
    : join(ROOT, "packages", "react", "src");

type IconAttrs = Record<string, string | number>;
type IconNodeChild = [
  tag: string,
  attrs: IconAttrs,
  children?: IconNodeChild[],
];
type IconNode = IconNodeChild[];

const kebabToCamel = (s: string) =>
  s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

// ── SVG Parser ────────────────────────────────────────────────────────

function parseAttrs(attrsStr: string): IconAttrs {
  const attrs: IconAttrs = {};
  const attrRe = /([a-zA-Z:][\w:-]*)\s*=\s*"([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = attrRe.exec(attrsStr)) !== null) {
    attrs[m[1]] = m[2];
  }
  return attrs;
}

function parseChildren(xml: string, pos: number): [IconNode, number] {
  const nodes: IconNode = [];

  while (pos < xml.length) {
    const nextTag = xml.indexOf("<", pos);
    if (nextTag === -1) {
      break;
    }
    pos = nextTag;

    if (xml[pos + 1] === "/") {
      return [nodes, xml.indexOf(">", pos) + 1];
    }

    const tagMatch = xml
      .slice(pos)
      .match(/^<([a-zA-Z][\w-]*)\s*([^>]*?)(\/)?>/);
    if (!tagMatch) {
      pos++;
      continue;
    }

    const [fullMatch, tag, attrsStr, selfClose] = tagMatch;
    const attrs = parseAttrs(attrsStr);
    pos += fullMatch.length;

    if (selfClose) {
      nodes.push([tag, attrs]);
    } else {
      const [children, newPos] = parseChildren(xml, pos);
      pos = newPos;
      if (children.length > 0) {
        nodes.push([tag, attrs, children]);
      } else {
        nodes.push([tag, attrs]);
      }
    }
  }

  return [nodes, pos];
}

function parseSvg(svg: string): IconNode {
  const cleaned = svg
    .replace(/<\?xml[^?]*\?>/g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .trim();

  const svgOpen = cleaned.match(/^<svg[^>]*>/);
  if (!svgOpen) {
    return [];
  }
  const svgClose = cleaned.lastIndexOf("</svg>");
  if (svgClose === -1) {
    return [];
  }

  const inner = cleaned.slice(svgOpen[0].length, svgClose);
  const [nodes] = parseChildren(inner, 0);
  return nodes;
}

const INHERITED_ATTRS = new Set([
  "stroke",
  "fill",
  "stroke-width",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stroke-miterlimit",
  "stroke-opacity",
  "fill-opacity",
  "opacity",
]);

function stripInheritedAttrs(nodes: IconNode): IconNode {
  return nodes.map(([tag, attrs, children]) => {
    const cleaned = Object.fromEntries(
      Object.entries(attrs).filter(([k]) => !INHERITED_ATTRS.has(k))
    );
    if (children) {
      return [tag, cleaned, stripInheritedAttrs(children)];
    }
    return [tag, cleaned];
  });
}

function toCamelAttrs(nodes: IconNode): IconNode {
  return nodes.map(([tag, attrs, children]) => {
    const camelAttrs = Object.fromEntries(
      Object.entries(attrs).map(([k, v]) => [
        k.includes("-") ? kebabToCamel(k) : k,
        v,
      ])
    );
    if (children) {
      return [tag, camelAttrs, toCamelAttrs(children)];
    }
    return [tag, camelAttrs];
  });
}

// ── File renderers ───────────────────────────────────────────────────

function renderReactIconFile(
  name: string,
  iconNode: IconNode,
  variant: string
): string {
  const componentName = kebabToPascal(name);
  const camelNode = toCamelAttrs(iconNode);
  const variantArg = variant === DEFAULT_VARIANT ? "" : `, "${variant}"`;
  return `import createJeddIcon from "../createJeddIcon"
import type { IconNode } from "../types"

const __iconNode: IconNode = ${JSON.stringify(camelNode)}

const ${componentName} = createJeddIcon("${name}", __iconNode${variantArg})

export default ${componentName}
export { __iconNode as ${componentName}Node }
`;
}

function renderVanillaIconFile(name: string, iconNode: IconNode): string {
  const pascalName = kebabToPascal(name);
  return `import type { IconNode } from "@jedd-icons/shared"

const ${pascalName}: IconNode = ${JSON.stringify(iconNode)}

export default ${pascalName}
export { ${pascalName} as ${pascalName}Node }
`;
}

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

function indexExportLine(componentName: string, name: string): string {
  return target === "react"
    ? `export { default as ${componentName} } from "./${name}"`
    : `export { default as ${componentName}, ${componentName}Node } from "./${name}"`;
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
  const iconNode = stripInheritedAttrs(parseSvg(svg));

  if (iconNode.length === 0) {
    console.warn(`[build-icons] ${variant}/${file}: no child elements parsed`);
  }

  const content =
    target === "vanilla"
      ? renderVanillaIconFile(name, iconNode)
      : renderReactIconFile(name, iconNode, variant);

  writeFileSync(join(outDir, `${name}.ts`), content);

  return {
    indexLine: indexExportLine(componentName, name),
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
