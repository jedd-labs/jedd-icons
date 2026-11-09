# Contributing

Thanks for contributing to jedd-icons!

## Adding or updating icons

The step-by-step guide (SVG rules, metadata, build) is on the site:
[Adding icons](https://jeddicons.com/docs/react/adding-icons). In short, after
adding or changing an icon run:

```bash
pnpm icons   # clean + check the source SVGs, then build every package
```

When you re-export icons that are already in the repo, run
`pnpm icons:compare` to check the shipped geometry didn't change by accident
(it compares every icon SVG changed since `HEAD`; pass `--ref <git-ref>` or
`--from <export-dir>` to compare against something else).

## Commands

Run from the repository root:

| Command | What it does |
| --- | --- |
| `pnpm icons` | Full pipeline: clean + check SVGs, then build all packages |
| `pnpm icons:clean` | Normalize source SVGs in place |
| `pnpm icons:check` | Check source SVGs and metadata without changing them |
| `pnpm icons:compare` | Compare re-exported SVGs with the committed icons |
| `pnpm build` | Build all packages via Turbo |
| `pnpm dev` | Run every package and app in dev mode |
| `pnpm --filter www-docs dev` | Run just the gallery / docs site |
| `pnpm lint` | Lint and format-check with Ultracite (Biome) |
| `pnpm format` | Apply Ultracite lint and format fixes |
| `pnpm test` | Run the Vitest suites |
| `pnpm typecheck` | Type-check every package |
| `pnpm knip` | Find unused files, exports, and dependencies (run after a build) |

## Git hooks

We use [Lefthook](https://lefthook.dev) for git hooks. They install
automatically when you run `pnpm install` (via the root `prepare` script) — no
manual setup needed.

| Hook | What it does |
| --- | --- |
| **post-merge** / **post-checkout** | Runs `pnpm install` automatically after a pull or branch switch, but **only when `pnpm-lock.yaml` changed** — keeps your dependencies in sync without slowing down every checkout. |
| **pre-commit** | Lints the staged files with `ultracite check`. |
| **pre-push** | Runs `turbo typecheck` then `knip`, alongside `ultracite check`, before pushing — a quick local version of the CI checks. |

To bypass a hook in an emergency:

```bash
git commit --no-verify     # skip pre-commit
LEFTHOOK=0 git push        # skip pre-push
```

## CI

CI (`.github/workflows/ci.yml`) runs on every PR and push to `main` as two
jobs, both required status checks on `main`:

- **Icons** — `pnpm icons:check`. Issues show as annotations on the PR's files.
- **Lint, typecheck & build** — lint → test → build → knip → typecheck. Knip
  findings show as PR annotations.

## Changesets

We use [Changesets](https://github.com/changesets/changesets) to version the
published packages and generate their changelogs. **PR titles and commit
messages have no required format** — the changelog comes from changeset files,
not from your commits.

### When you need a changeset

If your PR changes a **published** package — `@jedd-icons/react` or
`@jedd-icons/core` — add a changeset:

```bash
pnpm changeset
```

Pick the package(s), choose a bump level, and write a one-line summary. The
summary you write **becomes the public changelog line**, so write it for users.
Commit the generated `.changeset/*.md` file with your PR.

`@jedd-icons/react` and `@jedd-icons/core` always share a version number (a
`fixed` group in `.changeset/config.json`): a changeset for either one releases
both.

You do **not** need a changeset for docs-only, chore, CI, or internal-package
(`@jedd-icons/shared`, `@workspace/ui`) changes.

### Bump levels (we are pre-1.0)

While we are on `0.x`, breaking changes ride on a **minor** bump:

- **patch** — bug fixes, including fixes to existing icon geometry
- **minor** — new icons, new features, or a breaking change
- **major** — reserved for the eventual `1.0.0` stability commitment

## Releasing (maintainers)

Releases go through the `Release` GitHub Actions workflow:

1. As PRs with changesets merge to `main`, the workflow keeps a rolling
   **"Version Packages"** PR up to date, previewing the next versions and
   changelog entries.
2. Merging that PR bumps the versions and writes the changelogs on `main`. It
   does **not** publish anything.
3. To publish, run the workflow manually: **Actions → Release → Run workflow**,
   with the **`publish`** box ticked. That builds the packages, publishes
   `@jedd-icons/react` and `@jedd-icons/core` to npm, pushes git tags, and
   creates GitHub Releases.

To do it locally instead:

```bash
pnpm version   # consume changesets: bump versions + write CHANGELOG.md
pnpm release   # turbo build && changeset publish
```
