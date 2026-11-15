# Architecture

Botanica is a terrarium you build and watch in the browser. You place plants, rocks and animals in
a glass vessel, and a small simulation grows them, changes the air and water, and draws it all on a
canvas.

This page tells you where code lives, which folder may use which, and where to put new code. The
reasons behind the layout are in the
[design spec](superpowers/specs/2026-11-15-maintainability-refactor-design.md).

## The layers

All app code is in `src/`. Each top-level folder in `src/` is a **layer**: a group of code with one
job. A layer may import from the layers below it, never from the layers above it. So imports only
point down the table.

| Folder | What it holds | May import |
|---|---|---|
| `lib` | Small helpers that depend on no other layer (clamp, ids, random numbers, formatting, canvas and snapshot helpers) | nothing |
| `data` | Fixed tables (plants, animals, vessels, substrates, presets) and the types every layer shares | `lib` |
| `store` | Jotai atoms: the app state, and how it is saved to and loaded from the browser | `lib`, `data` |
| `engine` | The simulation, canvas drawing, sound and pointer input | `lib`, `data`, `store` |
| `auth` | Sign-in, and the backend that keeps saved gardens and the journal | `lib`, `data`, `store` |
| `services` | Tasks that use several layers at once: the account (`src/services/account/`), the "while you were away" flow, garden saves, audio control | `lib`, `data`, `store`, `engine`, `auth` |
| `hooks` | React hooks that connect React to the layers below | all of the above |
| `components` | React components, the screens you see | all of the above |

`src/App.tsx` and `src/main.tsx` sit on top and may import anything.

Two smaller rules:

- `src/components/ui/` holds the [shadcn/ui](https://ui.shadcn.com) primitives (button, dialog,
  slider and so on). They stay free of app knowledge, so they may import only `lib` and each other.
- Inside one layer, any file may import any other file.

```
   components
       |
     hooks
       |
    services
     /    \
 engine   auth
     \    /
     store
       |
     data
       |
      lib
```

`engine` and `auth` sit side by side. Neither may import the other. When a task needs both, it
goes in `services`.

### Keeping to the table

The table is the rule. A lint rule that enforces it is prepared and will be switched on in
`eslint.config.js`. Until then, check your imports against the table yourself.

When an import breaks the table, move the code, not the rule. Usually a type or a constant needs
to move down to `data`, or a function that uses several layers needs to move up to `services`.

## Two kinds of state

The app keeps state in two places. They are kept apart on purpose.

**1. The engine world.** `EngineWorld` (in `src/engine/world`) is one plain object that the engine
changes in place on every animation frame. It holds what moves fast: placed items, particles,
mist, falling grains, drag state. React does not subscribe to it, so changes to it cause no
re-render. The `useTerrariumEngine` hook creates the world, registers it with the **engine
bridge** (`src/engine/engineBridge`), and runs the frame loop.

A component that needs the world asks the bridge for it when it needs it, then reads it or changes
it. `tryGetWorld()` returns the world (or `null` before the engine starts). `mutateWorld(fn)` runs
a change and then publishes a snapshot of the world to the store. Components never create the
world or keep their own copy of it.

**2. The atoms.** A Jotai **atom** is a small piece of state that React components can read and
that re-renders them when it changes. All atoms live in one store, `appStore` in
`src/store/appStore`. The main modules are:

- `src/store/studio`: the studio state (vessel, hardware, lighting, substrates, room, pace and
  more). Most of it is saved to the browser.
- `src/store/telemetry`: the live gauges (humidity, temperature, soil moisture and so on). Not
  saved.
- `src/store/view`, `overlay`, `toast`: view settings (depth, zoom), which overlay is open (growth
  board, away card, tour), and the toast message.

Importing `appStore` also loads the saved studio state from `localStorage` and keeps it written.

### How the two talk

- **Engine reads atoms.** At the start of each frame the engine reads the studio state from the
  store (`store.get(studioStateAtom)`) and treats it as fixed for that frame.
- **Engine writes atoms, but rarely.** The frame loop runs on every animation frame (usually about
  60 times a second), which is far too often to update React. So `pushTelemetry` in
  `src/engine/simulation/telemetry` writes to the store at most once every 250 ms (about 4 times a
  second). Live gauges go to the telemetry atom. Saved fields (substrate depths, cycle progress,
  water split) are written only when they really change, because each change rewrites the save.
  Two things run on slower timers: the environment seed is written at most every 5 seconds, and a
  snapshot of the world is saved at most every 60 seconds.
- **Components write atoms.** A slider or button sets an atom. The engine sees the new value on
  the next frame.
- **Components change the world** through the engine bridge, or through a service that uses it.

## Where do I put...?

| I want to add... | Put it here |
|---|---|
| A plant, rock or animal | Its entry in the catalog folder `src/data/catalog/`: `FLORA` in `flora.ts`, `HARDSCAPE` in `hardscape.ts`, `FAUNA` in `fauna.ts`. Its drawing in `src/engine/sprites/`: `FLORA_SPRITES` in `flora.ts`, `HARDSCAPE_SPRITES` in `hardscape.ts`, and for animals `FAUNA_SPRITES` in `fauna/index.ts` (or `FAUNA_EXTRA_SPRITES` in `faunaExtra/index.ts`), all keyed by catalog id. An animal's draw function goes in the file for its family inside that folder (`fauna/fish.ts`, `faunaExtra/snails.ts` and so on). If it blooms or grows fronds, an entry in `LIFE` in `src/engine/simulation/life`. |
| A vessel | Its entry in `VESSELS` in `src/data/vessels`. Its shape in `src/engine/geometry`, and its catalog thumbnail in `src/components/catalog/vesselPreview`. |
| A care rule or care action | The folder `src/engine/care/`: a rule in `report.ts` (`computeCareReport`), or in `envIssues.ts` if it comes from the room (water, air, glass) or `faunaMix.ts` if it is about tankmates; an action in `actions.ts` (`runCareAction`). A new action id or issue type in `src/data/care`. |
| A screen, panel or dialog | A component in the matching folder of `src/components/` (`layout`, `stage`, `catalog`, `account` and so on). If other code needs to open it, add an atom in `src/store/overlay`. |
| A saved setting | See "Adding a saved setting" below. |
| A new backend | See "Adding a backend" below. |
| A task that needs the engine and auth together | A module in `src/services/`. |
| A generic helper | `src/lib/`, only if it depends on no other layer. Otherwise put it next to the code that uses it. |

### Adding a saved setting

Studio settings are saved under one `localStorage` key, `botanica_studio_v1`, as
`{ state, version }`. A **migration** is a step that upgrades a save written by an older version
of the app to the current shape. The steps, all in `src/store/`:

1. Add the field to `StudioState` and give it a default in `createDefaultState` (both in
   `src/store/studio/state.ts`). A base atom is made for every default automatically.
2. Add it to `partialize` in `src/store/studio/persisted.ts`, the function that picks which fields
   are saved. Fields not listed there are not saved.
3. Export the field's atom next to the others in `src/store/studio/atoms.ts`: `base.yourField` as
   it is, or wrapped in `guarded` (a helper that checks or adjusts a value, such as clamping it,
   before writing it). Then add its name to the list in `src/store/studio/index.ts`.
4. Bump `STUDIO_VERSION` (in `src/store/studio/persisted.ts`) and add a migration step in
   `src/store/migrations`, for example `migrateV4toV5`, that gives old saves the new field. Call
   it from `migrate`. `migrate` runs only when a save's version differs from `STUDIO_VERSION`, and
   garden snapshots go through it too.
5. If a hand-edited save could hold a bad value, add a `sanitize...` function in
   `src/store/migrations` and call it from `sanitizeSaved` in `src/store/studio/storage.ts`. That
   runs on every load.

Never rename the storage key or change the shape of saved JSON. Old saves must keep loading.

Small view preferences (true/false switches) are saved separately by `hydrateViewPrefs` in
`src/store/view`.

### Adding a backend

Code in the app talks to two interfaces, never to a concrete implementation:

- `AuthService` (`@/auth`, defined in `src/auth/types`) for sign-in. The app's instance is
  `authService`, exported from `@/auth`.
- `GardenBackend` (`@/auth/backend`) for saved gardens and the journal. `createBackend` in the same
  module builds one per account.

Today both are local and keep everything in the browser. To add a real server, write a new
implementation of the interface in `src/auth/` and point `authService` or `createBackend` at it.

## Growing a file into a folder

A file may have at most 300 lines and a function at most 80 (blank lines and comments do not
count). When a module grows past that, turn it into a folder with the same name. For a
hypothetical module `src/engine/weather.ts`:

```
src/engine/weather.ts   ->   src/engine/weather/index.ts
                             src/engine/weather/rain.ts
                             src/engine/weather/wind.ts
```

`index.ts` is the folder's public face. It exports the same names the old file did, so every
import of `@/engine/weather` keeps working. Usually it holds no code of its own, only lines like
`export { rainFall } from './rain'`. Each new file inside gets one job you can name, and the file
name says it. Code outside the folder imports only the folder (`@/engine/weather`), never a file
inside it. The folder stays in the same layer.

Real examples: `src/engine/care/` (rules split by kind, plus `actions.ts`),
`src/data/catalog/` (one file per family: flora, hardscape, fauna), `src/store/studio/` (state and
defaults, saved fields, atoms, storage) and `src/services/account/`.

The files listed in `eslint.legacy.js` are the ones still over the limits. They will become
folders like this.

## More

- How to set up, test and send a change: `CONTRIBUTING.md`.
- Why the layers look like this: the
  [design spec](superpowers/specs/2026-11-15-maintainability-refactor-design.md).
