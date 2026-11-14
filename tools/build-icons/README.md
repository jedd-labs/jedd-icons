# build-icons

Internal tooling for normalizing, validating, comparing, and generating data
from the source SVG icons.

Run these commands from the repository root:

| Command | Purpose |
| --- | --- |
| `pnpm icons:clean` | Normalize SVG root attributes and remove unsupported inline attributes |
| `pnpm icons:check` | Validate SVG geometry, metadata and animation files without changing files |
| `pnpm icons:compare` | Compare re-exported SVGs with committed icon geometry, and flag animated icons whose elements moved |
| `pnpm icons` | Clean, check, and build the complete icon pipeline |
| `pnpm test` | Run the tool's Vitest suites as part of the workspace tests |

`build.ts` is the package code generator. Consuming packages invoke it through
their `pnpm gen` scripts to produce React or vanilla TypeScript modules.
`build-animated.ts` is the animated counterpart for `@jedd-icons/react-animated`:
it keeps each icon's elements unmerged and bakes in its animation file from
`animations/<variant>/<name>.ts` (checked by `icons:check`, rules in
`animated.lib.ts`; files loaded by `animation-files.ts`).

The `gen-*` scripts prepare data for other workspace applications:

- `gen-releases.ts` derives icon release history from git tags.
- `gen-contributors.ts` collects contributor metadata.
- `gen-categories.ts` builds category data for the docs site.
- `gen-tags.ts` builds search-tag data for the docs site.
- `gen-icon-nodes.ts` builds source and shipped icon-node data for Jedd Lab.

Use `pnpm --filter www-docs gen-data` or `pnpm --filter lab gen-data` to run the
appropriate generators through their consuming application.
