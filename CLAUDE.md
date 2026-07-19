# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A pnpm + Turbo monorepo that builds and distributes a set of SVG icons as published npm packages. Source SVGs are the source of truth; a codegen tool turns them into per-icon TypeScript files that are then bundled by tsdown. The published surface is `@jedd-icons/react` (React components) and `@jedd-icons/core` (framework-agnostic icon nodes).

## Commands

- `pnpm icons` — full pipeline: normalize source SVGs (`clean-svgs`) then build every package via Turbo. **Run this after adding/changing any icon.**
- `pnpm build` — build all packages (Turbo, respects `^build` dependency order).
- `pnpm dev` — Turbo dev across the workspace.
- `pnpm --filter www-docs dev` — run just the gallery/docs site (`http://localhost:3000`).
- `pnpm --filter @jedd-icons/react gen` — regenerate icon `.ts` files only (no bundle).
- `pnpm --filter @jedd-icons/react dev` — gen + tsdown `--watch` for the React package.
- `pnpm lint` / `pnpm check` — `ultracite check` (Biome). `pnpm format` / `pnpm fix` — `ultracite fix`.
- `pnpm typecheck` — `turbo typecheck` (per-package `tsc --noEmit`).
- `pnpm knip` — find unused files, exports, and dependencies. **Run after removing code or deps.**

There is **no test suite** in this repo. The quality gate is lint + typecheck + knip. Locally it's enforced by Lefthook git hooks (pre-commit lints staged files; pre-push runs `turbo typecheck` + `ultracite check`). In CI, the `verify` job runs build → typecheck → lint → `pnpm knip` on every PR and push to `main`, and is a required status check on `main`. Bypass the local hooks with `git commit --no-verify` or `LEFTHOOK=0 git push`.

Node >= 20, pnpm 11.5.1. Dependency versions are pinned centrally in `pnpm-workspace.yaml` under `catalog:` — packages reference `"catalog:"` instead of literal versions, so add/bump deps there.

## Architecture: the icon build pipeline

The whole system exists to turn `icons/**/*.svg` into typed, tree-shakeable component modules. The chain is worth understanding before touching anything under `packages/`, because most of `packages/{react,core}/src` is **generated and gitignored/lint-ignored** (see `biome.jsonc` `files.includes` exclusions for `src/icons`, `src/icons-*`, `src/fill.ts`).

1. **`icons/<variant>/<name>.svg` + `<name>.json`** — source of truth. Note the layout is `icons/stroke/` and `icons/fill/` (variant subdirectories), **not** flat `icons/<name>.svg` as the README's "Adding icons" section implies. Each variant directory is discovered dynamically. `stroke` is the `DEFAULT_VARIANT`; `fill` is a secondary variant exported under the `/fill` subpath. `<name>.json` metadata is validated against `icon.schema.json` (required: `contributors`, `tags`, `categories` where `categories` is a closed enum).

2. **`tools/build-icons/clean-svgs.ts`** — normalizes source SVGs in place: sets canonical root attributes and strips inline presentation attributes (`stroke`, `fill`, etc.) from child elements so they inherit from the root at render time. Icons must be 24×24 viewBox, stroke-only, flat geometry (no `<g>`/`<defs>`/`<mask>` — the parser is intentionally simple and regex-based, not a real XML parser).

3. **`tools/build-icons/build.ts`** — the codegen. Invoked as `pnpm gen` from each package. `--target react` (default) or `--target vanilla` selects the output package (`packages/react/src` vs `packages/core/src`). For each SVG it: parses to an `IconNode` tuple tree (`[tag, attrs, children?]`), strips inherited attrs again, camelCases attrs (React target only), and writes one `<name>.ts` per icon plus an `index.ts` barrel with `export { default as PascalName }` lines (plus alias re-exports from each icon's JSON `aliases`). Non-default variants also get a `<variant>.ts` entry file (e.g. `fill.ts`) that re-exports `./icons-<variant>`.

4. **tsdown** (`--config-loader tsx`) bundles the generated `src/` into `dist/` with the CJS/ESM/`.d.ts` matrix declared in each package's `exports`.

Naming: `chevron-right.svg` (kebab) → `ChevronRight` component (Pascal). This transform lives in both `build.ts` and `createJeddIcon.tsx` — keep them consistent.

### React runtime (hand-written, not generated)

`packages/react/src/{Icon.tsx,createJeddIcon.tsx,types.ts,defaultAttributes.ts}` are the real source. `createJeddIcon(name, iconNode, variant)` wraps the shared `Icon` component, injecting `jedd jedd-<name>` classes. `Icon` applies consumer props (`size`, `color`, `strokeWidth`, `absoluteStrokeWidth`) and pulls variant defaults + `resolveStrokeWidth` from `@jedd-icons/shared`. `absoluteStrokeWidth` keeps stroke visually constant across sizes.

## Packages

- `@jedd-icons/shared` (private) — types + variant defaults + `resolveStrokeWidth`. Built first; `react`/`core` depend on it.
- `@jedd-icons/react` / `@jedd-icons/core` — the two **published** packages (npm, public). Both expose `.` and `./fill` subpath exports.
- `@workspace/ui` (private) — shadcn/ui component library consumed by the docs app. Add components with `pnpm dlx shadcn@latest add <name> -c apps/www-docs`; they land in `packages/ui/src/components/` and import as `@workspace/ui/components/<name>`.
- `apps/www-docs` — the gallery + docs site. TanStack Start + Vite + Fumadocs (MDX), deployed to Cloudflare via Wrangler. `predev`/`prebuild` run `gen-data` (`gen-releases` + `gen-contributors`) and fumadocs generation; the TanStack `routeTree.gen.ts` is generated and lint-ignored.

## Releasing

Changesets-driven. A PR that changes a **published** package (`@jedd-icons/react`/`@jedd-icons/core`) needs `pnpm changeset` — the summary you write *is* the public changelog line. Docs-only and internal-package (`shared`, `ui`) changes don't need one. Pre-1.0: breaking changes ride a **minor** bump. Publishing is automated via the `Release` GitHub Actions workflow (rolling "Version Packages" PR); locally it's `pnpm version` then `pnpm release`.
