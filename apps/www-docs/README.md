# www-docs

The public [Jedd Icons](https://jeddicons.com/) gallery and documentation site,
built with TanStack Start, Vite, and Fumadocs and deployed to Cloudflare.

## Development

From the repository root:

```bash
pnpm --filter www-docs dev
```

The `predev` and `prebuild` hooks generate release, contributor, category, and
tag data from the repository. Run the generators directly when needed:

```bash
pnpm --filter www-docs gen-data
```

Other useful commands:

| Command | Purpose |
| --- | --- |
| `pnpm --filter www-docs build` | Generate data and create a production build |
| `pnpm --filter www-docs typecheck` | Generate MDX/data and run TypeScript checks |
| `pnpm --filter www-docs preview` | Preview the production build locally |
| `pnpm --filter www-docs deploy:dry` | Build and validate a Cloudflare deployment |

Documentation content lives in `content/`; application routes, components, and
generated-data consumers live in `src/`.
