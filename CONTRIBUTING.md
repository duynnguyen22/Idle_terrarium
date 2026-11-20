# Contributing to Botanica

Thanks for helping. This page tells you how to set up, what to check, and the rules the code follows.

## Getting started

You need Node.js 22 and [pnpm](https://pnpm.io).

```sh
pnpm install
pnpm dev
```

Open the address that `pnpm dev` prints. To try saving gardens, sign in with the demo account `demo@botanica.app` / `terrarium1`. Everything stays in your browser.

## Before you open a pull request

Run these two commands. Both must pass.

```sh
pnpm verify   # lint, format check, type check and unit tests
pnpm e2e      # browser tests (needs Chromium: pnpm exec playwright install chromium)
```

Also run `pnpm build` once. CI runs all of them.

## Code rules

These rules keep the code easy to read. Most are checked by the linter.

- **Size limits.** A file has at most 300 lines. A function has at most 80 lines. Blank lines and comments do not count. Small pieces are easier to read, test and change.
- **One responsibility per file.** You should be able to say what a file does in one short sentence. Do not make catch-all files such as `utils2.ts` or `helpers.ts`.
- **When a module gets too big,** turn it into a folder with the same name. Put an `index.ts` inside that exports the public names. Example: `src/engine/weather.ts` becomes `src/engine/weather/index.ts`. Code elsewhere keeps importing the same path.
- **No re-export shims.** If you move a function, update every import to the new place. Do not leave a copy or a re-export at the old place. The `index.ts` of a folder is the only allowed re-export.
- **Imports.** Across layers, always use the `@/` alias (`@/engine/care`). Inside one layer, relative imports (`./` and `../`) are fine.
- **Tests mirror `src/`.** The test for `src/engine/room.ts` lives in `tests/unit/engine/`. When code moves, its test moves with it.
- **A behavior change needs a test.** Add or update a test that fails without your change.
- **A refactor must not edit assertions.** A refactor changes structure, not behavior. If a test assertion needs to change, it is not a pure refactor. In a refactor you may only change import paths, mock paths and file locations in tests.
- **Style.** Prettier sets the style (no semicolons, single quotes, width 100). Run `pnpm format` to fix it.

## The exception list

`eslint.legacy.js` once listed files and functions that were over the size limits. The list is empty now, so no file is exempt from the limits.

Never add an entry. If your change makes something too long, split it.

## Commit and pull request style

- Use [Conventional Commits](https://www.conventionalcommits.org): `feat(engine): add rain`, `fix(view): ...`, `refactor(store): ...`, `docs: ...`, `test: ...`, `chore: ...`.
- Keep pull requests small and about one thing. They are easier to review.
- Fill in the pull request template.

## Where code lives

Imports only point down the layer table. See
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the table and for where to put new code.

To find the code, saved data and tests behind one feature, see
[docs/FEATURE_MAP.md](docs/FEATURE_MAP.md). If your change adds a feature, a storage key or a saved
field, or moves a feature's code, update the map in the same pull request.
