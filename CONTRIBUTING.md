# Contributing

Thanks for contributing to jedd-icons!

## Git hooks

We use [Lefthook](https://lefthook.dev) for git hooks. They install
automatically when you run `pnpm install` (via the root `prepare` script) — no
manual setup needed.

| Hook | What it does |
| --- | --- |
| **post-merge** / **post-checkout** | Runs `pnpm install` automatically after a pull or branch switch, but **only when `pnpm-lock.yaml` changed** — keeps your dependencies in sync without slowing down every checkout. |
| **pre-commit** | Lints the staged files with `ultracite check`. |
| **pre-push** | Runs `turbo typecheck` and `ultracite check` before pushing — this is the main quality gate, since CI doesn't lint/typecheck PRs. |

To bypass a hook in an emergency:

```bash
git commit --no-verify     # skip pre-commit
LEFTHOOK=0 git push        # skip pre-push
```

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

You do **not** need a changeset for docs-only, chore, CI, or internal-package
(`@jedd-icons/shared`, `@workspace/ui`) changes.

### Bump levels (we are pre-1.0)

While we are on `0.x`, breaking changes ride on a **minor** bump:

- **patch** — bug fixes, new icons, non-breaking additions
- **minor** — new features, or a breaking change
- **major** — reserved for the eventual `1.0.0` stability commitment

## Releasing (maintainers)

Releases are automated by the `Release` GitHub Actions workflow:

1. As PRs with changesets merge to `main`, the workflow keeps a rolling
   **"Version Packages"** PR up to date, previewing the next versions and
   changelog entries.
2. Merging that PR builds the packages, publishes `@jedd-icons/react` and
   `@jedd-icons/core` to npm, pushes git tags, and creates GitHub Releases.

To do it locally instead:

```bash
pnpm version   # consume changesets: bump versions + write CHANGELOG.md
pnpm release   # turbo build && changeset publish
```
