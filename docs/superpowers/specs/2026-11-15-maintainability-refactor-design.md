# Maintainability refactor: design

Date: 2026-11-15. Status: approved (option B chosen by Duy on 2026-11-15).

## Intent

Make Botanica easy for a newcomer to read and safe to change. Files and functions stay short,
the folder structure tells the truth about what depends on what, and the rules are checked by
CI instead of living only in a document.

## Goals

1. No source file over 300 lines and no function over 80 lines (blank lines and comments not counted).
2. Dependencies between top-level folders run one way, and ESLint fails a change that breaks this.
3. A contributor can find out how to work here from `CONTRIBUTING.md` and `docs/ARCHITECTURE.md`.

## Non-goals

- No behavior change. No new features, no visual changes, no save-format changes.
- No new runtime or dev dependencies.
- No rename of public concepts (atoms, actions, catalog ids, storage keys).

## Anti-goals

- A test assertion edited to make a refactor pass. Tests are the proof that behavior is unchanged;
  only their import paths and mock paths may change.
- Compatibility re-exports left at old locations. A moved symbol is imported from its new home.
- Files split by line count alone ("part1/part2"). Every new file has one nameable responsibility.

## Baseline (main at 987e415)

985 unit tests pass, typecheck clean, lint 0 errors and 1 warning. Against the new limits:
11 files exceed 300 lines and 30 functions exceed 80 lines.

## Approaches considered

- **A. Rules and splits only.** Lowest risk, but `engine` and `store` keep importing each other,
  so no boundary rule could be written.
- **B. A plus one-way layers (chosen).** More files touched, but the architecture document is
  true and enforced.
- **C. Feature folders.** Rewrites every import and obscures history for little gain. Rejected.

## Target layers

Each folder may import only from the folders listed for it (and from itself).

| Folder | Holds | May import |
|---|---|---|
| `lib` | Small generic helpers with no app knowledge | nothing |
| `data` | Static tables and the domain types shared by every layer | `lib` |
| `store` | Jotai atoms and the shape of app state, persistence of that state | `lib`, `data` |
| `engine` | Simulation, rendering, audio, input on the mutable `EngineWorld` | `lib`, `data`, `store` |
| `auth` | Sign-in and the garden/journal backend | `lib`, `data`, `store` |
| `services` (new) | Use cases that coordinate engine, store and auth | all of the above |
| `hooks` | React hooks | all of the above |
| `components` | React components | everything |

Why `store` sits below `engine`: the engine reads and writes atoms at runtime in about ten
modules, while `store` only needs a handful of engine types and constants. Moving those few
symbols down to `data` is far cheaper than injecting state into the engine.

### Moves that make the table true

Down into `data`:

- From `engine/room.ts`: `WaterSource`, `AirSource`, `AirKind`, `WATER_SOURCES`, `AIR_SOURCES`,
  `DEFAULT_ROOM`, `TDS_RANGE`, `PH_RANGE`. `envModel` stays in the engine.
- From `engine/simulation/pace.ts`: `PaceId`, `PACES`, `PACE_LABELS`, `PACE_SUBTITLES`.
- Types: `WorldEntity`, `WorldSnapshot`, `EventKind`, `ReportItem`, `Hint`, `AwayReport`,
  `CareActionId`, `CareIssue`.
- Constants: `TERRAIN_POINTS`, `MAX_PERSISTED_GRAINS`, `AWAY_LOG_MAX`, `DEFAULT_MUSIC_VOLUME`.

Up into `services`:

- `store/awayFlow.ts` and the functions of `store/gardenSnapshot.ts`. The `GardenSnapshot` type
  stays in `store` (next to `PersistedStudio`) because `auth` needs it.
- All of `store/account.ts`, atoms included. Account state is typed by `auth` (user, session,
  garden records), and `auth` sits above `store`, so the account module cannot live in `store`.
  A service may own the atoms that only it writes.
- The non-hook functions of `hooks/useAudio.ts` (`play`, `startAudioFromGesture`, `stopAudio`
  and the ambient helpers), so `awayFlow` no longer imports a hook file.

Out of `lib`: `vesselPreview.ts` depends on a `data` type and is used only by the catalog
components, so it moves next to them.

Tests move with the code they cover (`tests/unit/` mirrors `src/`).

## Rules and how they are enforced

- ESLint `max-lines` 300 and `max-lines-per-function` 80 on `src/`, both skipping blank lines
  and comments. Tests are exempt. Nothing in `src/` is exempt: `data/catalog.ts` is split by
  category instead, which also makes "add a species" a one-small-file change.
- ESLint `no-restricted-imports` generated from one allow-map in the ESLint config, covering both
  `@/folder` and relative paths.
- `pnpm lint` runs with `--max-warnings 0`. A new `pnpm verify` runs lint, format check,
  typecheck and unit tests; CI already runs each of these.
- While the work is in flight, known offenders sit in one clearly named exception list in the
  ESLint config. The list shrinks as files are fixed and is deleted at the end.
- Documents: `CONTRIBUTING.md`, `docs/ARCHITECTURE.md`, a pull request template, a short
  `CLAUDE.md` pointing AI assistants at the same rules, and a corrected README (the code uses
  Jotai, the README says Zustand).

## Delivery

Three stacked branches, one pull request each:

1. `refactor/1-rules`: rules, exception list, documents.
2. `refactor/2-layers`: the moves above, then the boundary rule switched on.
3. `refactor/3-splits`: every file and function brought under the limits, exception list removed.

Layers come before splits so that split files land in their final folders.

## Verification

Every branch must pass `pnpm verify`, `pnpm build` and `pnpm e2e`. The unit-test count must not
drop below 985.

## Left to the builder

How each oversized file is divided, as long as each new file has one responsibility, public names
stay the same, and no test assertion changes.
