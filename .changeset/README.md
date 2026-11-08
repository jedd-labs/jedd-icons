# Changesets

This folder is managed by [Changesets](https://github.com/changesets/changesets).
It is how we version the published packages (`@jedd-icons/react`,
`@jedd-icons/core`), generate their changelogs, and create GitHub releases.

## If your PR changes a published package

Run:

```bash
pnpm changeset
```

Pick the package(s) you changed, choose a bump level, and write a one-line
summary. **That summary becomes the public changelog line** — write it for
users, not for yourself. Commit the generated `.changeset/*.md` file with your
PR.

Bump levels (we are pre-1.0, so breaking changes ride on `minor`):

- **patch** — bug fixes, including fixes to existing icon geometry
- **minor** — new icons, new features, or a breaking change (while we are on `0.x`)
- **major** — reserved for the eventual `1.0.0` stability commitment

Docs-only / chore / CI PRs do not need a changeset.

## How a release happens

A maintainer (or the `changesets/action` CI workflow) runs `pnpm version` to
consume pending changesets — bumping versions and writing `CHANGELOG.md` — then
`pnpm release` to build and publish to npm.

See the full Changesets docs:
https://github.com/changesets/changesets/blob/main/docs/intro-to-using-changesets.md
