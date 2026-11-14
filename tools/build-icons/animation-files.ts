// Loads the hand-written animation files, `animations/<variant>/<icon>.ts`, for
// `icons:check`, the Lab's data and the animated codegen. They're TypeScript
// modules, so they're imported (these scripts run under tsx) rather than read.
import { existsSync, readdirSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { IconAnimations } from "../../packages/shared/src/animation";
import { checkAnimations } from "./animated.lib";
import type { Issue } from "./check-rules";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ANIMATIONS_DIR = join(resolve(__dirname, "..", ".."), "animations");

/** `animations/<variant>/<name>.ts`, relative to the repo root. */
export const animationFile = (variant: string, name: string) =>
  `animations/${variant}/${name}.ts`;

/** The icon's animation file, or null when it has none. Throws if malformed. */
export async function loadAnimations(
  variant: string,
  name: string
): Promise<IconAnimations | null> {
  const file = join(ANIMATIONS_DIR, variant, `${name}.ts`);
  if (!existsSync(file)) {
    return null;
  }
  const module = (await import(pathToFileURL(file).href)) as {
    default?: IconAnimations;
  };
  if (!module.default?.animations) {
    throw new Error("needs a default export with `animations`");
  }
  return module.default;
}

/**
 * What `icons:check` reports for an icon's animation file: problems loading
 * it, or with how it fits the icon's SVG. Empty without an animation file.
 */
export async function animationIssues(
  svg: string,
  variant: string,
  name: string
): Promise<Issue[]> {
  try {
    const definition = await loadAnimations(variant, name);
    return definition ? checkAnimations(svg, definition) : [];
  } catch (error) {
    return [
      {
        rule: "animation",
        severity: "error",
        message: `can't load ${animationFile(variant, name)}: ${(error as Error).message}`,
      },
    ];
  }
}

/** Animation files of a variant with no `icons/<variant>/<name>.svg`. */
export function orphanAnimations(variant: string, icons: string[]): string[] {
  const dir = join(ANIMATIONS_DIR, variant);
  return existsSync(dir)
    ? readdirSync(dir)
        .filter((f) => f.endsWith(".ts"))
        .map((f) => basename(f, ".ts"))
        .filter((name) => !icons.includes(name))
        .sort()
    : [];
}
