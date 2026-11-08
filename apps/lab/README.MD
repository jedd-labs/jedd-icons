# Jedd Lab

An internal playground for inspecting source and generated icon geometry. It
visualizes grids, keylines, anchor points, control handles, bounds, and the
issues reported by `pnpm icons:check`.

## Development

From the repository root:

```bash
pnpm --filter lab dev
```

The app generates `generated/icon-nodes.json` before development, builds, and
typechecks. To refresh that data explicitly, run:

```bash
pnpm --filter lab gen-data
```

Use `pnpm --filter lab build` for a production build and
`pnpm --filter lab typecheck` for TypeScript validation.
