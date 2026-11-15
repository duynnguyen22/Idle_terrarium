# Maintainability Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring every source file under 300 lines and every function under 80, make folder dependencies run one way, and have ESLint enforce both, without changing behavior.

**Architecture:** Three stacked branches. `refactor/1-rules` adds the size rules with a temporary exception list plus contributor documents. `refactor/2-layers` moves shared types and constants down into `data` and orchestration up into a new `services` folder, then switches on an import-boundary rule. `refactor/3-splits` splits every oversized file and function and deletes the exception list.

**Tech Stack:** React 19, TypeScript 5.9 (strict), Vite 6, Jotai 3, Tailwind 4, Vitest 5 + Testing Library, Playwright, ESLint 9 flat config, Prettier, pnpm.

**Spec:** `docs/superpowers/specs/2026-11-15-maintainability-refactor-design.md`

## Global Constraints

- No behavior change: no new features, no visual changes, no change to storage keys or saved JSON shapes.
- No new dependencies in `package.json`.
- Test assertions are never edited. In test files only import paths, `vi.mock`/`vi.doMock` paths and file locations may change. `tests/unit/` mirrors `src/`, so a test moves with the code it covers.
- The unit-test count never drops below 985.
- A moved symbol is imported from its new home. No re-export left at an old location.
- A module that outgrows one file becomes a folder of the same name whose `index.ts` is its public face (`src/engine/care.ts` → `src/engine/care/index.ts`). Outside code keeps importing the same path and the same names. This is the only allowed re-export.
- Every new file has one nameable responsibility. No `part2`, `utils2`, `helpers` dumping grounds.
- Limits: `max-lines` 300 and `max-lines-per-function` 80, both with `skipBlankLines: true, skipComments: true`, on `src/**`. Tests are exempt.
- Public names (exported functions, atoms, types, component names, catalog ids) do not change.
- Code style follows `.prettierrc` (no semicolons, single quotes, width 100). Keep existing doc comments with the code they describe.
- Each task ends green on: `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test`, `pnpm build`. Do not run `pnpm e2e` (the controller runs it; it shares a port).
- Commit messages follow the repo's Conventional Commits style (`refactor(engine): ...`) and end with the line `Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>`.

## Review Focus

Failure modes a structural refactor can introduce that the unit tests may not catch:

1. **Module load order.** `src/store/appStore.ts` runs side effects on import (binds storage, hydrates prefs). A moved import that creates a cycle can make a `const` undefined at load. Expect: `pnpm build` succeeds and the app boots (controller checks with e2e).
2. **Stale mock paths.** A `vi.mock('@/old/path')` that no longer matches a real module silently stops mocking. Expect: every `vi.mock`/`vi.doMock` path points at the module's new location.
3. **Components defined inside components.** A sub-component declared inside a render function remounts on every render and loses focus and state. Expect: every extracted component is declared at module level and receives what it needs as props.
4. **Shared mutable state copied instead of shared.** `createAccount` and the local auth service close over timers and `let` variables. Expect: after a split, all parts read and write one shared object, never a copy taken at creation time.
5. **Draw order and effect order.** Canvas painters and React effects are order-sensitive. Expect: draw calls and hook calls run in the same order as before the split.

---

## Branch `refactor/1-rules`

### Task 1: Size rules, exception list and contributor documents

**Files:**
- Create: `eslint.legacy.js`, `CONTRIBUTING.md`, `CLAUDE.md`, `.github/pull_request_template.md`
- Modify: `eslint.config.js`, `package.json` (scripts only), `README.md`, `src/components/ui/LineIcon.tsx`

**Interfaces:**
- Produces: `eslint.legacy.js` exporting `LEGACY_LONG_FILES: string[]` and `LEGACY_LONG_FUNCTIONS: string[]` (repo-relative paths). Later tasks delete entries from these arrays.
- Produces: script `pnpm verify`.

- [ ] **Step 1: Add the size rules.** In `eslint.config.js` add a config object for `src/**/*.{ts,tsx}` with `'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }]` and `'max-lines-per-function': ['error', { max: 80, skipBlankLines: true, skipComments: true }]`.
- [ ] **Step 2: Run `pnpm lint` and record the failures.** Expected: 11 `max-lines` errors and 30 `max-lines-per-function` errors.
- [ ] **Step 3: Create `eslint.legacy.js`** with the two arrays filled from Step 2 (one entry per offending file, sorted), under a header comment: "Files that predate the size limits. Delete an entry when you fix its file. Never add one." Wire two config objects in `eslint.config.js`, placed after the size rules, that turn `max-lines` off for `LEGACY_LONG_FILES` and `max-lines-per-function` off for `LEGACY_LONG_FUNCTIONS`.
- [ ] **Step 4: Fix the one existing lint warning** (`src/components/ui/LineIcon.tsx:2`, `react-refresh/only-export-components`) by moving the non-component export into a sibling file and updating its importers. Then change the `lint` script to `eslint . --max-warnings 0`.
- [ ] **Step 5: Add `"verify": "pnpm lint && pnpm format:check && pnpm typecheck && pnpm test"`** to `package.json` scripts.
- [ ] **Step 6: Write `CONTRIBUTING.md`** (under 150 lines, plain language) with these sections: Getting started (install, dev, demo account from the README); Before you open a pull request (`pnpm verify`, `pnpm e2e`); Code rules (the Global Constraints of this plan that are permanent: size limits and why, one responsibility per file, folder-with-`index.ts` pattern, no re-export shims, `@/` alias for imports across folders and `./` within a folder, tests mirror `src/`, a behavior change needs a test, a refactor must not edit assertions); The exception list (what `eslint.legacy.js` is, shrink only); Commit and pull request style (Conventional Commits, small pull requests). Leave a `## Where code lives` heading with one line pointing to `docs/ARCHITECTURE.md` (written in Task 4).
- [ ] **Step 7: Write `CLAUDE.md`** (under 25 lines): follow `CONTRIBUTING.md` and `docs/ARCHITECTURE.md`; run `pnpm verify` before reporting work as done; never add to `eslint.legacy.js`; never edit test assertions during a refactor.
- [ ] **Step 8: Write `.github/pull_request_template.md`**: What changed, Why, How it was checked, and a checklist (`pnpm verify` passes; e2e passes; no file over 300 lines or function over 80; no new entry in `eslint.legacy.js`; tests added or updated for behavior changes).
- [ ] **Step 9: Fix `README.md`**: "Zustand" → "Jotai"; add a "Contributing" line linking `CONTRIBUTING.md`; mention `pnpm verify` among the commands.
- [ ] **Step 10: Verify.** Run `pnpm verify && pnpm build`. Expected: lint 0 errors 0 warnings, 985 tests pass, build succeeds.
- [ ] **Step 11: Commit** as `chore(lint): enforce file and function size limits with a legacy list` and `docs: add contributing guide, PR template and assistant rules` (two commits).

---

## Branch `refactor/2-layers`

Target allow-map (each folder may import only from the listed folders and itself):

```js
const LAYERS = {
  lib: [],
  data: ['lib'],
  store: ['lib', 'data'],
  engine: ['lib', 'data', 'store'],
  auth: ['lib', 'data', 'store'],
  services: ['lib', 'data', 'store', 'engine', 'auth'],
  hooks: ['lib', 'data', 'store', 'engine', 'auth', 'services'],
  components: ['lib', 'data', 'store', 'engine', 'auth', 'services', 'hooks'],
}
```

### Task 2: Move shared types and constants down into `data`

**Files:**
- Create: `src/data/room.ts`, `src/data/pace.ts`, `src/data/world.ts`, `src/data/events.ts`, `src/data/care.ts`
- Modify: `src/data/soundPresets.ts`, `src/engine/room.ts`, `src/engine/simulation/pace.ts`, `src/engine/world.ts`, `src/engine/persistence.ts`, `src/engine/simulation/life.ts`, `src/engine/simulation/report.ts`, `src/engine/simulation/catchup.ts`, `src/engine/care.ts`, `src/engine/audio/ambient.ts`, `src/auth/backend.ts`, and every importer of a moved symbol in `src/` and `tests/`

**Interfaces:**
- Produces, importable from `@/data/...`:
  - `room.ts`: `WaterSource`, `AirSource`, `AirKind`, `WATER_SOURCES`, `AIR_SOURCES`, `DEFAULT_ROOM`, `TDS_RANGE`, `PH_RANGE`
  - `pace.ts`: `PaceId`, `PACES`, `PACE_LABELS`, `PACE_SUBTITLES`
  - `world.ts`: `WorldEntity`, `WorldSnapshot`, `TERRAIN_POINTS`, `MAX_PERSISTED_GRAINS`
  - `events.ts`: `EventKind`, `ReportItem`, `Hint`, `AwayReport`, `AWAY_LOG_MAX`
  - `care.ts`: `CareActionId`, `CareIssue`
  - `soundPresets.ts`: `DEFAULT_MUSIC_VOLUME`

- [ ] **Step 1: Move each symbol** (definition and its doc comment, unchanged) to the file above. If a moved type references another engine type, move that type too when it is a pure type; if it cannot move without pulling engine logic into `data`, stop and report it. Functions stay in the engine (`envModel`, `paceMs`, `snapshotWorld`, ...).
- [ ] **Step 2: Update every importer** in `src/` and `tests/` to import the symbol from `@/data/...`. Engine files that still use a moved symbol import it from `@/data/...`; they do not re-export it.
- [ ] **Step 3: Prove the direction.** Run `grep -rnE "from '@/(engine|auth|services|hooks|components)" src/store src/data src/lib`. Expected output: only lines in `src/store/account.ts`, `src/store/awayFlow.ts`, `src/store/gardenSnapshot.ts` (they move in Task 3). Run `grep -rnE "from '@/engine" src/auth`. Expected: no output.
- [ ] **Step 4: Verify.** `pnpm verify && pnpm build`. Expected: 985 tests pass.
- [ ] **Step 5: Commit** as `refactor(data): move shared domain types and tables out of the engine`.

### Task 3: Move orchestration up into `services`

**Files:**
- Create: `src/services/account.ts` (moved from `src/store/account.ts`), `src/services/awayFlow.ts` (moved from `src/store/awayFlow.ts`), `src/services/gardenSnapshot.ts` (moved from `src/store/gardenSnapshot.ts`), `src/services/audio.ts`, `src/components/catalog/vesselPreview.ts` (moved from `src/lib/vesselPreview.ts`)
- Modify: `src/store/studio.ts`, `src/hooks/useAudio.ts`, `eslint.legacy.js` (path of the account entry), every importer in `src/` and `tests/`
- Test: matching files under `tests/unit/store/` and `tests/unit/lib/` move to `tests/unit/services/` and `tests/unit/components/catalog/`

**Interfaces:**
- Consumes: the `@/data/...` symbols from Task 2.
- Produces: `@/services/account` (everything `@/store/account` exported), `@/services/awayFlow`, `@/services/gardenSnapshot` (all functions it exported), `@/services/audio` exporting `play`, `startAudioFromGesture`, `stopAudio` plus the ambient helpers the hook needs; `GardenSnapshot` type exported from `@/store/studio`; `@/hooks/useAudio` exporting only `useAudio`.

- [ ] **Step 1: Move the three store files** with `git mv` so history follows. Move the `GardenSnapshot` type alias into `src/store/studio.ts` next to `PersistedStudio`; `src/auth/backend.ts` imports it from there.
- [ ] **Step 2: Extract `src/services/audio.ts`** from `src/hooks/useAudio.ts`: every module-level function and the `ambient` variable move, with their comments; the hook file keeps `useAudio` and imports what it needs.
- [ ] **Step 3: Move `vesselPreview.ts`** with `git mv`.
- [ ] **Step 4: Update all importers and mock paths** in `src/` and `tests/`, and move the test files to mirror `src/`. Run `grep -rnE "vi\.(mock|doMock)\(" tests` and confirm each path resolves to an existing module.
- [ ] **Step 5: Prove the direction.** `grep -rnE "from '@/(engine|auth|services|hooks|components)" src/store src/data src/lib` → no output. `grep -rnE "from '@/(services|hooks|components)" src/engine src/auth` → no output. `grep -rnE "from '@/(hooks|components)" src/services` → no output. `grep -rnE "from '@/components" src/hooks` → no output. `grep -rnE "from '@/" src/lib` → no output.
- [ ] **Step 6: Verify.** `pnpm verify && pnpm build`. Expected: 985 tests pass.
- [ ] **Step 7: Commit** as `refactor(services): move account, away flow, garden snapshots and audio control out of store and hooks`.

### Task 4: Enforce the boundaries and document the architecture

**Files:**
- Create: `docs/ARCHITECTURE.md`
- Modify: `eslint.config.js`, `CONTRIBUTING.md`

**Interfaces:**
- Consumes: the folder layout after Task 3 and the `LAYERS` allow-map above.

- [ ] **Step 1: Add the boundary rule.** In `eslint.config.js` define the `LAYERS` constant exactly as above and generate, for each layer, a config object for `src/<layer>/**/*.{ts,tsx}` whose `no-restricted-imports` `patterns` forbid every layer not in its allow-list, both as `@/<other>` / `@/<other>/**` and as a relative path that climbs into it (`**/../<other>/**`). The message names the layer and its allowed imports and points to `docs/ARCHITECTURE.md`. Add one more object: `src/components/ui/**` may import only `lib` (the shadcn primitives stay app-agnostic).
- [ ] **Step 2: Prove the rule bites.** Temporarily add `import '@/components/ui/button'` to `src/lib/clamp.ts` and `import '../store/studio'` to `src/data/vessels.ts`; run `pnpm lint`. Expected: one `no-restricted-imports` error for each. Remove both lines.
- [ ] **Step 3: Run `pnpm lint`.** Expected: 0 errors. A real violation found here is fixed by moving code, never by loosening the map; report any such fix.
- [ ] **Step 4: Write `docs/ARCHITECTURE.md`** (under 200 lines, plain language, for someone new to the project): what the app is in two sentences; the layer table (folder, what it holds, what it may import) with a small text diagram; the two kinds of state (mutable `EngineWorld` owned by the engine, Jotai atoms in `store`) and how they talk (engine reads atoms, flushes telemetry about 4 times a second); a "Where do I put...?" table (a new plant or animal, a new vessel, a new care rule, a new screen, a new saved setting with its migration, a new backend); how to grow a file into a folder with `index.ts`; a link to the design spec for the reasons. Describe only what exists in the code; verify each claim against the source.
- [ ] **Step 5: Update `CONTRIBUTING.md`**: under `## Where code lives` add the one-line rule "imports only point down the layer table" and the link.
- [ ] **Step 6: Verify.** `pnpm verify && pnpm build`.
- [ ] **Step 7: Commit** as `chore(lint): enforce one-way imports between layers` and `docs: add architecture guide` (two commits).

---

## Branch `refactor/3-splits`

Tasks 5 to 10 touch disjoint files and run in parallel, each in its own git worktree. Rules for every split task:

- Edit only the files listed for the task, files you create beside them, and your own entries in `eslint.legacy.js`. Do not edit any other existing file, including tests: the public import path and exported names of every listed file stay the same, so nothing else needs to change.
- Split by responsibility. For a long function, extract named steps that read top to bottom; for a long component, extract module-level sub-components and hooks that take props; for a closure that holds shared state, pass one shared context object to the extracted parts.
- New files sit beside the original (or inside the new same-named folder) and stay inside the same layer.
- Done means: your entries are deleted from both arrays in `eslint.legacy.js` and the task's verification is green.

### Task 5: Split the account service

**Files:**
- Modify: `src/services/account.ts` → `src/services/account/` (folder with `index.ts`), `eslint.legacy.js`

- [ ] **Step 1:** Delete the account entries from `eslint.legacy.js`; run `pnpm lint`. Expected: `max-lines` and `max-lines-per-function` errors for the account file.
- [ ] **Step 2:** Split into a folder: state types and atoms; pure view helpers (`chipStatus`, `timeAgo`, `initialsOf`, `avatarColor`); and `createAccount` divided by use case (session and sign-in flows, garden saving and sync, garden list management, journal, panel/view state), each a factory receiving one shared context (store, deps, timers, shared helpers). `createAccount(store, deps)` keeps its signature and returns the same `Account` object; the `account` singleton stays exported.
- [ ] **Step 3:** Verify: `pnpm verify && pnpm build`; `tests/unit/services/account.test.ts` passes unedited.
- [ ] **Step 4:** Commit as `refactor(services): split the account service by use case`.

### Task 6: Split the local auth service and backend

**Files:**
- Modify: `src/auth/localAuthService.ts`, `src/auth/backend.ts`, `eslint.legacy.js`

- [ ] **Step 1:** Delete the two files' entries from `eslint.legacy.js`; run `pnpm lint`. Expected: errors for both files.
- [ ] **Step 2:** Split `localAuthService.ts` (one 368-line factory) by concern: storage and record access, password and token handling, and the auth flows (sign-up and verification, sign-in and providers, recovery, profile). Split the 102-line function in `backend.ts` the same way. Exports and `src/auth/index.ts` stay as they are.
- [ ] **Step 3:** Verify: `pnpm verify && pnpm build`; `tests/unit/auth/` passes unedited.
- [ ] **Step 4:** Commit as `refactor(auth): split the local auth service and backend by concern`.

### Task 7: Split engine logic

**Files:**
- Modify: `src/engine/care.ts`, `src/engine/simulation/fauna.ts`, `src/engine/simulation/pouring.ts`, `src/engine/geometry.ts`, `eslint.legacy.js`

- [ ] **Step 1:** Delete these files' entries from `eslint.legacy.js`; run `pnpm lint`. Expected: errors for all four.
- [ ] **Step 2:** `care.ts` becomes `src/engine/care/` (nitrogen cycle and ideal ranges; environment issues; the care report with fauna-mix issues; care actions), with `envCareIssues`, `computeCareReport` and `faunaMixIssues` each broken into named rule functions under 80 lines. Extract named steps from the long functions in the other three files. Order of rule evaluation and of emitted issues must not change.
- [ ] **Step 3:** Verify: `pnpm verify && pnpm build`; `tests/unit/engine/` passes unedited.
- [ ] **Step 4:** Commit as `refactor(engine): split care rules and long simulation functions`.

### Task 8: Split render, sprites and the catalog

**Files:**
- Modify: `src/engine/render/backdropPainters.ts`, `src/engine/render/specimens.ts`, `src/engine/render/substrates.ts`, `src/engine/render/frame.ts`, `src/engine/render/mist.ts`, `src/engine/sprites/fauna.ts`, `src/engine/sprites/faunaExtra.ts`, `src/data/catalog.ts`, `eslint.legacy.js`

- [ ] **Step 1:** Delete these files' entries from `eslint.legacy.js`; run `pnpm lint`. Expected: errors for each.
- [ ] **Step 2:** `backdropPainters.ts` → `src/engine/render/backdropPainters/` grouped by backdrop family. `sprites/fauna.ts` and `faunaExtra.ts` → files grouped by kind of animal, with the original two paths still exporting the same names. `data/catalog.ts` → `src/data/catalog/` with one file per category (flora, hardscape, fauna, ...) and `index.ts` assembling the same exported arrays, in the same order, plus the lookup functions. Extract named drawing steps from the long functions in `specimens.ts`, `substrates.ts`, `frame.ts`, `mist.ts`. Canvas calls run in exactly the same order with the same arguments.
- [ ] **Step 3:** Verify: `pnpm verify && pnpm build`; `tests/unit/engine/render.test.ts`, `tests/unit/data/` pass unedited.
- [ ] **Step 4:** Commit as `refactor(render): split painters, sprites and the catalog by family`.

### Task 9: Split the stage components and the engine hook

**Files:**
- Modify: `src/components/stage/TerrariumCanvas.tsx`, `src/components/stage/AwayCard.tsx`, `src/components/stage/ItemInspector.tsx`, `src/components/stage/RelaxDock.tsx`, `src/hooks/useTerrariumEngine.ts`, `eslint.legacy.js`

- [ ] **Step 1:** Delete these files' entries from `eslint.legacy.js`; run `pnpm lint`. Expected: errors for each.
- [ ] **Step 2:** Extract pointer/gesture handling and sizing out of `TerrariumCanvas` into hooks beside it; extract module-level sub-components from the three cards; divide `useTerrariumEngine` into smaller hooks or plain setup functions called in the same order. Effects keep their dependencies and order; no component is declared inside another.
- [ ] **Step 3:** Verify: `pnpm verify && pnpm build`; `tests/unit/components/`, `tests/unit/hooks/` pass unedited.
- [ ] **Step 4:** Commit as `refactor(stage): split the canvas, stage cards and engine hook`.

### Task 10: Split the remaining components

**Files:**
- Modify: `src/components/growth/GrowthBoard.tsx`, `src/components/account/auth/AuthPieces.tsx`, `src/components/account/auth/OtpInput.tsx`, `src/components/account/auth/SignInScreen.tsx`, `src/components/account/auth/SignUpScreen.tsx`, `src/components/catalog/BackdropSection.tsx`, `src/components/catalog/HardwarePanel.tsx`, `src/components/catalog/RoomTab.tsx`, `src/components/layout/RightTelemetry.tsx`, `src/components/nav/UtilityActions.tsx`, `eslint.legacy.js`

- [ ] **Step 1:** Delete these files' entries from `eslint.legacy.js`; run `pnpm lint`. Expected: errors for each.
- [ ] **Step 2:** Extract module-level sub-components and hooks beside each file. `AuthPieces.tsx` is split into files by piece; its path keeps exporting the same names only if it becomes a folder with `index.ts`. Markup, class names, labels and ARIA attributes are unchanged.
- [ ] **Step 3:** Verify: `pnpm verify && pnpm build`; `tests/unit/components/` passes unedited.
- [ ] **Step 4:** Commit as `refactor(components): split long screens and panels`.

### Task 11: Split the studio store, delete the exception list, finish the documents

**Files:**
- Modify: `src/store/studio.ts`, `eslint.config.js`, `CONTRIBUTING.md`, `CLAUDE.md`, `.github/pull_request_template.md`, `docs/ARCHITECTURE.md`
- Delete: `eslint.legacy.js`

**Interfaces:**
- Consumes: all of Tasks 5 to 10 merged into `refactor/3-splits`.

- [ ] **Step 1:** `src/store/studio.ts` becomes `src/store/studio/` with `index.ts`: state shape and defaults; atoms; persistence (`partialize`, storage binding, hydration). `@/store/studio` keeps exporting the same names.
- [ ] **Step 2:** Confirm both arrays in `eslint.legacy.js` are empty, delete the file and its two config objects in `eslint.config.js`, and remove every mention of the exception list from `CONTRIBUTING.md`, `CLAUDE.md` and the pull request template (the rule becomes simply "no file over 300 lines, no function over 80").
- [ ] **Step 3:** Run `pnpm lint`. Expected: 0 errors, 0 warnings, with no exceptions configured.
- [ ] **Step 4:** Re-read `docs/ARCHITECTURE.md` against the final tree and correct any path that changed during the splits.
- [ ] **Step 5:** Verify: `pnpm verify && pnpm build`. Expected: at least 985 tests pass.
- [ ] **Step 6:** Commit as `refactor(store): split the studio store` and `chore(lint): remove the legacy size exception list` (two commits).
