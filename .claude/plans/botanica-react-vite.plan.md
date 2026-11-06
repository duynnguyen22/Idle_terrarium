# Plan: Botanica — Living Biosphere (React + Vite port)

**Spec**: `docs/reference/design-doc.md` (game design doc) and `docs/reference/prototype.html` (the single-file prototype, 3,346 lines — the executable reference for every constant, formula and drawing routine).
**Complexity**: Large
**Goal**: Feature parity with the prototype, rebuilt as a maintainable React + Vite + TypeScript app, deployable as a static site.

Line numbers below refer to `docs/reference/prototype.html`. Implementers read the cited ranges directly rather than relying on prose paraphrase; **the prototype is the source of truth for every numeric constant, colour, label string and formula**.

## Global Constraints

These bind every task.

1. **Stack**: Vite 6, React 19, TypeScript `strict: true`, Tailwind v4 via `@tailwindcss/vite`, Zustand 5 with `persist` middleware, Vitest + React Testing Library + jsdom, Playwright, ESLint (typescript-eslint, react-hooks) + Prettier. Node 22. Package manager: npm.
2. **Hot path never touches React**: all per-frame mutable simulation state (items' live positions, particles, streams, grains, contour, mold, motes, fireflies, fauna AI state) lives in a mutable `EngineWorld` object held in a `useRef`, defined in `src/engine/world.ts`. Zustand holds only UI/settings/persisted state. The engine reads the store with `useStudioStore.getState()` and writes telemetry back at most 4 times per second. No React component may re-render per animation frame.
3. **Pure render functions**: every drawing routine has the signature `(ctx: CanvasRenderingContext2D, world: EngineWorld, state: StudioState, R: Rect, timestamp: number) => void` (plus explicit extra args when needed) and lives under `src/engine/render/`. No DOM access, no store access inside render functions — state is passed in.
4. **Sprites**: every catalog entry is drawn procedurally into a 256×256 offscreen canvas once (sprite cache keyed by catalog id), mirroring prototype lines 783–1376. No image assets.
5. **Coordinates**: item positions are normalized `{x, y}` in `[0,1]` relative to the vessel rect `R` (width `R.w`, height `R.h`, origin `R.x`,`R.y`), exactly as the prototype. `terrainContour` is a 21-element array of normalized height offsets. Substrate depths are in millimetres and `getTotalSubstrateDepth` / `getSoilSurfaceNormalizedY` (lines 1386–1406) define the soil surface.
6. **Persistence**: Zustand `persist` under localStorage key `botanica_studio_v1` with `version: 1` and a `migrate` function. A one-time importer reads the prototype key `existence_botanica_paludarium_v5` (format at lines 1419–1468) if the new key is absent.
7. **Time & lighting**: `timeSpeed ∈ {0, 1, 5}`, `realTimeMode: boolean`, lighting ids `'dawn' | 'sunlight' | 'dusk' | 'night'` (the prototype uses `'sunlight'` for day). Auto light sync maps local hour: `[5.5, 8.5) → dawn`, `[8.5, 17.5) → sunlight`, `[17.5, 20) → dusk`, else `night`.
8. **Design tokens**: the prototype's hex literals become Tailwind v4 `@theme` tokens in `src/index.css` (`--color-forest-deep: #1b3b2b`, `--color-parchment: #f0ede4`, etc.). Components use token classes (`bg-forest-deep`), never `bg-[#1b3b2b]`.
9. **Testing discipline**: each task lists its tests. Engine/data/store code is unit-tested in Vitest (jsdom, `canvas` calls stubbed where needed). UI components get RTL tests. Playwright covers pixel/drag smoke only. Test output must be pristine (no `act()` warnings, no console errors).
10. **Commits**: conventional commit subjects (`feat(engine): …`, `test: …`, `chore: …`). Every commit message ends with the line `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
11. **Scripts** that must exist and pass from Task 1 onward: `npm run dev`, `npm run build`, `npm run test` (vitest run), `npm run lint`, `npm run typecheck` (`tsc --noEmit`), and from Task 11 `npm run e2e`.
12. **Catalog ids, vessel ids, substrate ids, preset ids and label strings are copied verbatim** from the prototype — no renaming (the saved-state importer depends on them).

## Directory layout

```
src/
  main.tsx, App.tsx, index.css
  data/        types.ts, vessels.ts, substrates.ts, catalog.ts, presets.ts, soundPresets.ts
  store/       useStudioStore.ts, migrations.ts, importPrototypeSave.ts, selectors.ts
  engine/
    world.ts            EngineWorld (mutable) + createWorld()
    geometry.ts         substrate depth, soil surface Y, contour sampling, vessel path, pointer→normalized
    simulation/         tick.ts (orchestrator), fauna.ts, growth.ts, mold.ts, particles.ts, pouring.ts, clock.ts
    interaction.ts      hit-test, drag, snap, tool application
    persistence.ts      world ↔ serializable WorldSnapshot
    sprites/            drawSprite.ts (switch over catalog ids), spriteCache.ts
    render/             background.ts, lamp.ts, vessel.ts, substrates.ts, water.ts, specimens.ts,
                        pouring.ts, particles.ts, frame.ts, renderFrame.ts
    audio/              audioContext.ts, asmr.ts, ambient.ts
  hooks/       useTerrariumEngine.ts, useRelaxMode.ts, useLocalClock.ts, useKeyboardShortcuts.ts, useSpriteThumbnail.ts
  components/
    layout/    StudioLayout.tsx, TopNav.tsx, LeftSidebar.tsx, RightTelemetry.tsx
    nav/       ClockSpeedPill.tsx, LightingControls.tsx, UtilityActions.tsx
    catalog/   VesselTab.tsx, VesselGrid.tsx, HardwareToggles.tsx, BiomeRecipes.tsx, PourContainersGrid.tsx,
               SubstrateSliders.tsx, CatalogGrid.tsx, CatalogCard.tsx, PlantingStageToggle.tsx
    stage/     TerrariumCanvas.tsx, CareToolbar.tsx, ItemInspector.tsx, RelaxDock.tsx, Toast.tsx
    telemetry/ GaugeBar.tsx, MicroEcologyPanel.tsx, BotanistNotes.tsx
  lib/         ids.ts, clamp.ts, format.ts
tests/
  unit/   (vitest; mirrors src/ paths)
  e2e/    (playwright)
```

## Tasks

### Task 1: Scaffold the Vite + React + TypeScript project

**Files**: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `vitest.config.ts` (or vitest section in vite config), `tests/setup.ts`, `eslint.config.js`, `.prettierrc`, `.gitignore`, `playwright.config.ts`, `tests/e2e/smoke.spec.ts`, `README.md`.

**Steps**:
1. Scaffold with `npm create vite@latest . -- --template react-ts` (or equivalent manual files). Install: `react@19`, `react-dom@19`, `zustand@5`, `tailwindcss@4`, `@tailwindcss/vite`, dev: `typescript`, `vite@6`, `@vitejs/plugin-react`, `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `eslint`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `prettier`, `@playwright/test`.
2. `tsconfig.app.json`: `strict`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, path alias `@/* → src/*` (mirrored in `vite.config.ts` via `resolve.alias`).
3. `index.html`: title "Botanica — Living Biosphere", Google Fonts link for Fraunces (400,600,700 + italic), Inter (400,500,600,700), JetBrains Mono (400,600) — copy the `<link>` from prototype lines 1–20. `<body>` gets `overflow:hidden` as in prototype CSS (lines 21–60).
4. `src/index.css`: `@import "tailwindcss";` then an `@theme` block defining colour tokens for every hex literal used in prototype markup lines 1–518 (at minimum: `forest-deep #1b3b2b`, `parchment #f0ede4`, `ink #5c5649`, plus the others found by `grep -o '#[0-9a-fA-F]\{6\}' | sort -u` on lines 1–518, each named descriptively) and font tokens `--font-display: Fraunces`, `--font-sans: Inter`, `--font-mono: JetBrains Mono`. Port the custom CSS (scrollbar, `.relax-mode` rules, `.tool-btn`, animations) from prototype lines 21–60 into `@layer components` / plain CSS.
5. `src/App.tsx`: placeholder `<main>` with the brand heading using `font-display` — enough to prove Tailwind tokens apply.
6. Vitest: `environment: 'jsdom'`, `globals: true`, `setupFiles: ['tests/setup.ts']` (imports `@testing-library/jest-dom/vitest`), `include: ['tests/unit/**/*.test.{ts,tsx}']`.
7. Playwright config: `webServer` runs `npm run dev -- --port 4173 --strictPort`, `baseURL http://localhost:4173`, chromium only, `testDir: tests/e2e`. `tests/e2e/smoke.spec.ts` asserts the page title.
8. Scripts: `dev`, `build` (`tsc -b && vite build`), `preview`, `test` (`vitest run`), `test:watch`, `lint` (`eslint .`), `typecheck` (`tsc -b --noEmit` or `tsc --noEmit -p tsconfig.app.json`), `format`, `e2e` (`playwright test`).
9. `.gitignore`: `node_modules`, `dist`, `coverage`, `playwright-report`, `test-results`, `.superpowers/`.
10. README: one paragraph + script table.

**Tests**: `tests/unit/App.test.tsx` renders `<App/>` and finds the heading text "Botanica". Run `npm run build`, `npm run test`, `npm run lint`, `npm run typecheck` — all green. Install Playwright chromium (`npx playwright install chromium`) and run `npm run e2e` once; if the browser download is blocked in this environment, report it as a concern instead of failing the task.

### Task 2: Domain data, types and geometry helpers

**Files**: `src/data/types.ts`, `src/data/vessels.ts`, `src/data/substrates.ts`, `src/data/catalog.ts`, `src/data/presets.ts`, `src/data/soundPresets.ts`, `src/engine/geometry.ts`, `src/lib/clamp.ts`, `src/lib/ids.ts`, `src/lib/format.ts`, tests under `tests/unit/data/` and `tests/unit/engine/geometry.test.ts`.

**Source ranges**: `VESSEL_TYPES` 522–553; `SUBSTRATE_LAYERS` 555–565; `CATALOG` 567–664 (flora, hardscape, fauna objects — port every field including `mountPoints`, `mountable`, `floatsOnWater`, `habitat`, `behavior`, `growthStages`, `idealHumidity`, `evapMultiplier`; keep unused fields, they are spec); preset recipe bodies live in `applyFallsLakePreset` 1470–1556 and the biome recipe buttons in markup ~230–260 (the four recipes: read their substrate values and item lists from the click handlers in 2874–3320 — grep `recipe` / `preset`); sound presets from `startAmbientSoundscape` 1667–1708 (ids `stream`, `rain`, `forest`, `night` — verify names in source); geometry from 1378–1406 (`findCatalogDef`, `getTotalSubstrateDepth`, `getSoilSurfaceNormalizedY`), vessel path tracing 2022–2064 (`traceVesselPath` — port as `traceVesselPath(ctx, vessel, R)`), contour sampling (search `terrainContour` uses in 2101–2240 for the interpolation used to read contour height at normalized x — expose `sampleContour(contour, nx): number`), pointer→normalized conversion (search `pointerNorm` in 2874–3320 — expose `toNormalized(clientX, clientY, canvasRect, R)`).

**Steps**:
1. `types.ts`: `VesselId`, `SubstrateId`, `CatalogId`, `FloraDef | HardscapeDef | FaunaDef` discriminated on `kind: 'flora' | 'hardscape' | 'fauna'`, `MountPoint`, `GrowthStage = 'sprout' | 'mature' | 'lush'`, `LightingId`, `SoundPresetId`, `Rect {x,y,w,h}`, `PlacedItem` (id, defId, x, y, scale, rotation, flipX, z, growthStage, parentId?, mountOffset?, plus fauna runtime fields the prototype stores on items — list them from `addItemToTerrarium` 1558–1599 and the fauna branch of `updateBiologicalSimulation` 2544–2674).
2. Data modules export `as const` arrays plus lookup maps (`VESSELS_BY_ID`, `findCatalogDef(id)`), and derived id unions.
3. `geometry.ts`: `getTotalSubstrateDepth(substrates)`, `getSoilSurfaceNormalizedY(substrates, vessel)` (same formula as 1392–1406), `sampleContour`, `toNormalized`, `traceVesselPath`.
4. `lib/ids.ts`: `createItemId()` (prefix + random base36, same shape as the prototype's id generation); `lib/clamp.ts`; `lib/format.ts` (`formatClock(date)` → `HH:MM:SS`, `formatDepthMm`).

**Tests**: catalog counts (12 flora / 10 hardscape / 8 fauna / 6 vessels / 9 pour containers / 4 presets), every `mountPoints` entry is within `[0,1]`, every preset item `defId` exists in the catalog; `getTotalSubstrateDepth` with the default substrate object equals the prototype's value (compute by hand from 555–565 + 1386–1390 and assert the number); `getSoilSurfaceNormalizedY` is clamped and monotonic in depth; `sampleContour` interpolates between neighbours and clamps at the ends; `toNormalized` round-trips a point.

### Task 3: Zustand store, migrations and prototype save import

**Files**: `src/store/useStudioStore.ts`, `src/store/migrations.ts`, `src/store/importPrototypeSave.ts`, `src/store/selectors.ts`, `src/engine/world.ts`, `src/engine/persistence.ts`, tests under `tests/unit/store/` and `tests/unit/engine/persistence.test.ts`.

**Source ranges**: state defaults 671–716 (every scalar listed there is store state; every array listed there is `EngineWorld` state); `saveTerrariumState` 1419–1440 and `loadTerrariumState` 1442–1468 (exact saved shape of the prototype); `STORAGE_KEY` 666.

**Steps**:
1. `StudioState` = the scalar fields at 671–689 plus `substrates`, `selectedId`, `activePourMaterial`, `dayCount`, and a `telemetry` sub-object written by the engine (`humidity`, `soilMoisture`, `nutrients`, `o2Balance`, `moldCount`, `cleanupCrewCount`, `mossCoverPct`, `waterCycle: string`, `note: string`). Actions: one setter per field group (`setVessel`, `toggleHardware(key)`, `setLighting`, `setAutoLightSync`, `setTimeSpeed`, `setRealTimeMode`, `setActiveTab`, `setActiveTool`, `setPlantingStage`, `setRelaxMode`, `setAudioEnabled`, `setSoundPreset`, `setSubstrate(id, mm)`, `setSubstrates(obj)`, `selectItem(id|null)`, `setActivePourMaterial`, `advanceDay`, `setTelemetry(partial)`, `setWorldSnapshot(snapshot)`, `resetStudio()`).
2. Persist: `persist(..., { name: 'botanica_studio_v1', version: 1, partialize })` — persist settings, substrates, dayCount, `worldSnapshot` (see step 4); never persist `selectedId`, `activeTool`, `relaxMode`, `telemetry`, `activePourMaterial`. `migrations.ts` exports `migrate(persisted, version)` with a version-0→1 identity branch and a test.
3. `importPrototypeSave.ts`: `importPrototypeSave(storage: Storage): Partial<StudioState> | null` reads `existence_botanica_paludarium_v5`, validates shape, maps it to the new state (items → `worldSnapshot.items`, substrates, hardware flags, lighting, vessel, dayCount). Called once from the store's `onRehydrateStorage` when the new key had no value. Never deletes the old key.
4. `engine/world.ts`: `EngineWorld` interface with every array from 690–716 plus `items: PlacedItem[]`, `terrainContour: number[]` (21), `draggingId`, `dragOffset`, `hoveredSnapTarget`, `isPouring`, `pointerNorm`, `lastTelemetryPush`, `clockAccumulatorMs`; `createWorld(): EngineWorld`.
5. `engine/persistence.ts`: `WorldSnapshot = { items, terrainContour, substrateGrains? }`, `snapshotWorld(world)`, `restoreWorld(world, snapshot)`. Particles are never persisted.
6. `selectors.ts`: typed selector helpers used by components (`selectLighting`, `selectSubstrates`, etc.).

**Tests**: store defaults equal prototype defaults (vessel `paludarium_tank`, lid/lamp/fogger true, lighting `sunlight`, autoLightSync true, timeSpeed 1, realTimeMode true, dayCount 1, activeTab `vessel`, tool `select`, stage `mature`, soundPreset `stream`, humidity 82, soilMoisture 76, nutrients 88, o2 96, substrates `{pebbles:10, lavarock:8, charcoal:6, moss:8, soil:16, rivergravel:16, sand:0, water:24}`); `partialize` excludes transient fields; `migrate` v0→v1; `importPrototypeSave` maps a fixture built to the exact shape written by lines 1419–1440 and returns `null` on garbage; `snapshotWorld`/`restoreWorld` round-trip; `createWorld().terrainContour.length === 21`.

### Task 4: Procedural sprites and sprite cache

**Files**: `src/engine/sprites/drawSprite.ts` (one exported function per sprite id grouped into `flora.ts`, `hardscape.ts`, `fauna.ts` if `drawSprite.ts` would exceed ~400 lines — the plan allows three files + an index), `src/engine/sprites/spriteCache.ts`, `src/hooks/useSpriteThumbnail.ts`, tests `tests/unit/engine/sprites.test.ts`.

**Source ranges**: 783–796 `buildAllVectorSprites`; 798–1376 `drawVectorSpriteOnCanvas` with one `case` per catalog id (moss_wall_cliff 803, root_slate_waterfall 841, golden_river_boulders 887, peacock_fern 915, cryptanthus_pink 943, pogostemon_star 963, subwassertang 983, boston_fern 998, fittonia 1022, moss_mound 1051, anubias_nana 1065, trailing_ivy 1080, frogbit_pads 1099, echeveria 1118, barrel_cactus 1137, dragon_peak 1153, cliff_waterfall 1173, bonsai_driftwood 1187, quartz 1204, amethyst_geode 1224, lantern 1236, river_stones 1252, tree_frog 1268, vampire_crab 1286, medaka_fish 1299, cherry_shrimp 1313, isopod 1323, ducky_isopod 1337, springtails 1349, garden_snail 1359, default 1370).

**Steps**:
1. Port each `case` body verbatim into `drawSprite(ctx, id: CatalogId, size = 256)`; keep the exact colours and path numbers. A `default` branch draws the fallback blob.
2. `spriteCache.ts`: `getSprite(id): HTMLCanvasElement` lazily creates a 256×256 canvas (DPR-independent), draws once, memoizes in a `Map`; `warmSpriteCache(ids)`; `getSpriteDataUrl(id)` memoized for catalog thumbnails. Accept an injectable `createCanvas` factory so tests can pass a stub.
3. `useSpriteThumbnail(id)` returns the memoized data URL (for Task 8's catalog cards).

**Tests**: with a stubbed 2D context (record method calls), every catalog id draws without throwing and issues at least one path/fill call; the cache returns the same canvas instance on repeat calls; `warmSpriteCache` creates exactly N canvases for N ids.

### Task 5: Render pipeline, canvas component and engine hook

**Files**: `src/engine/render/background.ts`, `lamp.ts`, `vessel.ts`, `substrates.ts`, `water.ts`, `specimens.ts`, `pouring.ts`, `particles.ts`, `frame.ts`, `renderFrame.ts`; `src/components/stage/TerrariumCanvas.tsx`; `src/hooks/useTerrariumEngine.ts`; `src/engine/simulation/tick.ts` (no-op stub); `src/App.tsx` (mount the canvas inside a temporary full-screen stage); tests `tests/unit/engine/render.test.ts`, `tests/unit/hooks/useTerrariumEngine.test.tsx`.

**Source ranges**: `drawGooseneckHaloLamp` 2066–2099; `drawSubstratesAndLake` 2101–2240 (substrate layers, terrain contour mounds, lake, waterfall streams, fog); `drawInteractivePouringContainerAndParticles` 2242–2357 (draw only — particle *spawning/physics* belongs to Task 6, but this task must draw whatever is already in `world.fallingStreams` / `substrateGrains`); `renderPlacedSpecimens` 2359–2506 (sprite blit with scale/rotate/flip, sway, selection halo, snap target highlight, growth-stage scale); `drawPaludariumFrontFrame` 2508–2542; the frame orchestration inside `animateLoop` 2676–2818 (order: background sky by lighting → lamp → clip to vessel path → lighting tint → lamp cone → substrates/lake → specimens → pouring → motes/fireflies/vapor/mist → rim highlight → front frame → lid) — read the order from the source and keep it.

**Steps**:
1. Port each drawing block into its file with the Global Constraint 3 signature. `renderFrame(ctx, world, state, R, timestamp)` composes them in the prototype's order.
2. `computeVesselRect(canvasW, canvasH, vessel): Rect` — the vessel-fit math from `animateLoop`.
3. `TerrariumCanvas.tsx`: `<canvas>` sized by `ResizeObserver`, DPR = `min(devicePixelRatio, 2)`, calls `useTerrariumEngine(canvasRef)`. Exposes nothing else; pointer handlers arrive in Task 9.
4. `useTerrariumEngine`: creates the `EngineWorld` in a ref, warms the sprite cache, runs one rAF loop; each frame: `dt = min(timestamp - last, 100)`, calls `tick(world, dt, timestamp)` (a stub that Task 6 fills — create `src/engine/simulation/tick.ts` exporting a no-op `tick` now), then `renderFrame`. Pauses the loop when `document.hidden`. Cleans up on unmount. Restores `world` from `state.worldSnapshot` on mount and subscribes to store `vessel`/`substrates` changes only to recompute `R`.
5. Temporary: `App.tsx` renders `TerrariumCanvas` full-bleed with the default (empty) world, and a dev-only button that loads the Falls Lake preset items into the world via `setWorldSnapshot` so the render can be eyeballed.

**Tests**: `renderFrame` with a recording 2D-context stub and a world holding one of each item kind runs without throwing and calls `clip` once and `drawImage` once per item; `computeVesselRect` keeps aspect ratio and centres; `useTerrariumEngine` (fake rAF) starts exactly one loop, stops on unmount, and does not call `setState` on the store during a frame when telemetry is unchanged.

### Task 6: Simulation tick

**Files**: `src/engine/simulation/tick.ts`, `clock.ts`, `fauna.ts`, `growth.ts`, `mold.ts`, `particles.ts`, `pouring.ts`, `telemetry.ts`; tests under `tests/unit/engine/simulation/`.

**Source ranges**: `updateBiologicalSimulation` 2544–2674 (fauna 4-state AI with habitat bounds, swim bobbing for aquatic fauna; growth timers sprout→mature→lush; mold spawn chance, scrub decay and detritivore cleanup rate; cleanup crew count); the per-frame spawning/physics inside `animateLoop` 2676–2818 (ambient motes, evap vapors, fireflies at night, morning mist at dawn, mist droplets, spray particles, falling drops; pouring streams: spawn while `isPouring`, gravity `vy += 0.00085`, on landing raise `substrates[material]` and bump the nearest `terrainContour` index, siphon lowers water); `initParticlesAndGrains` 729–781; local clock + auto lighting handling (search `autoLightSync` in 2676–2818 and `syncLightingButtons` 2820–2838); `+1 Day` handler (search `dayCount` in 2874–3320).

**Steps**:
1. `clock.ts`: `lightingForHour(hour)` per Global Constraint 7; `advanceClock(world, state, dt)` applying `timeSpeed` (0 pauses biology but not ambient motes — match the prototype) and `realTimeMode`.
2. `fauna.ts`: `updateFauna(world, state, dt, R)` — port the state machine verbatim including bounds (terrestrial above soil surface, aquatic within water band, semi-aquatic either).
3. `growth.ts`: `updateGrowth(world, dt)`; `advanceDay(world, store)` implements `+1 Day` exactly as the prototype (all plants → lush, dayCount+1).
4. `mold.ts`: spawn/decay/cleanup; `addSporePatch(world)` for the "+Spore" button.
5. `particles.ts`: ambient motes/fireflies/vapor/mist/droplets/spray with the prototype's caps; `pouring.ts`: `spawnPourStream`, `stepPourParticles` (gravity constant 0.00085, landing → depth increase + contour bump), `siphonStep`.
6. `telemetry.ts`: `pushTelemetry(world, state, now)` throttled to ≥250 ms, writes only when a value changed.
7. `tick.ts`: orchestrates in the prototype's order; replace the Task 5 stub.

**Tests** (fake timers / direct calls): `lightingForHour` boundaries (5.5, 8.5, 17.5, 20); fauna never leaves its habitat band after 10,000 steps with a seeded RNG (inject `rng` into the functions — default `Math.random`); a sprout reaches `mature` then `lush` after the prototype's durations; mold count decreases when a detritivore is present and grows when none; pouring 200 particles of `soil` raises `substrates.soil` and the targeted contour index; `siphonStep` never drops water below 0; `pushTelemetry` writes at most 4× per simulated second and skips unchanged values.

### Task 7: Layout shell, top nav, telemetry sidebar and toast

**Files**: `src/components/layout/StudioLayout.tsx`, `TopNav.tsx`, `RightTelemetry.tsx`, `LeftSidebar.tsx` (shell with tab bar only — panels come in Task 8), `src/components/nav/ClockSpeedPill.tsx`, `LightingControls.tsx`, `UtilityActions.tsx`, `src/components/telemetry/GaugeBar.tsx`, `MicroEcologyPanel.tsx`, `BotanistNotes.tsx`, `src/components/stage/Toast.tsx`, `src/hooks/useLocalClock.ts`, `src/store/toastStore.ts` (tiny separate store: `showToast(msg, ms=2200)`), `src/engine/engineBridge.ts` (`registerWorld(world)` / `getWorld()` / `mutateWorld(fn)` which also writes a snapshot to the store — the engine hook registers its world), `src/App.tsx`; tests under `tests/unit/components/`.

**Source ranges**: markup 61–210 (header/top nav), 211–230 (layout frame), 400–518 (right telemetry, toast, relax dock markup — dock is Task 10), `showToast` 1408–1417, `syncLightingButtons` 2820–2838, `syncSpeedButtons` 2860–2872, the clock label logic in `animateLoop` (search `cycle-resp-badge`, `clock`), utility handlers for Relax/Audio/Biome/Clear/Snapshot in 2874–3320 (wire Biome/Clear now via `mutateWorld`; Snapshot, Relax and Audio buttons render but dispatch to no-op handlers with a `TODO(task-10)` / `TODO(task-11)` comment — never a missing button).

**Steps**:
1. Reproduce the three-column flex layout and every control from the markup with token classes; copy label strings and emoji verbatim.
2. `ClockSpeedPill`: date label from the real `Date` (`toLocaleDateString('en-US',{month:'short',day:'numeric'})` — this replaces the hard-coded "Nov 6"), `Day N`, `HH:MM:SS` from `useLocalClock` (1 s interval), cycle badge text per lighting (`DAWN · DEW CONDENSATION`, `DAY · PHOTOSYNTHESIS`, `DUSK · GOLDEN HOUR`, `NIGHT · RESPIRATION`), speed buttons with `aria-pressed`.
3. `LightingControls`: four phase buttons + Auto Sync; selecting a phase sets `autoLightSync` false, Auto Sync toggles it.
4. `RightTelemetry`: four `GaugeBar`s bound to `telemetry`, `MicroEcologyPanel` (spores + `+Spore` button calling `mutateWorld(addSporePatch)`, cleanup crew, moss carpet %, water cycle), `BotanistNotes` showing `telemetry.note`.
5. `Toast`: bottom-centre, reads `toastStore`, auto-hides.
6. `App.tsx` now renders `StudioLayout` with `TerrariumCanvas` in the centre.

**Tests**: TopNav speed buttons update `timeSpeed`/`realTimeMode` and reflect `aria-pressed`; clicking `🌙 Night` sets lighting `night` and `autoLightSync` false; Auto Sync re-enables it; cycle badge text matches lighting; `GaugeBar` width style equals the value %; `+Spore` adds a mold patch to a registered test world; toast appears and disappears with fake timers; `Clear` empties the registered world's items and the stored snapshot; `mutateWorld` throws a clear error when no world is registered.

### Task 8: Left sidebar catalog panels, sliders and inspector

**Files**: `src/components/layout/LeftSidebar.tsx` (fill the panels), `src/components/catalog/VesselTab.tsx`, `VesselGrid.tsx`, `HardwareToggles.tsx`, `BiomeRecipes.tsx`, `PourContainersGrid.tsx`, `SubstrateSliders.tsx`, `CatalogGrid.tsx`, `CatalogCard.tsx`, `PlantingStageToggle.tsx`, `src/components/stage/ItemInspector.tsx`, `src/components/stage/CareToolbar.tsx`, `src/lib/vesselPreview.ts` (SVG string builders ported from `getVesselPreviewSVG` 1720–1767 and `getContainerVectorSVG` 1810–1834), `src/engine/items.ts` (`addItem(world, defId, stage)` porting `addItemToTerrarium` and inspector operations `scaleItem`, `rotateItem`, `flipItem`, `reorderItem`, `advanceGrowth`, `duplicateItem`, `deleteItem`); tests under `tests/unit/components/` and `tests/unit/engine/items.test.ts`.

**Source ranges**: markup 230–400 (vessel tab, flora/hardscape/fauna panels, stage toggle, care toolbar, inspector); `renderVesselGrid` 1769–1795; `syncHardwareButtons` 1797–1808; `selectPourContainer` 1836–1854; `renderPourContainersGrid` 1856–1878; `syncCareToolbarButtons` 1880–1904; `renderSubstrateSliders` 1906–1938; `syncSlidersLiveReadout` 1940–1950; `renderCatalogLists` 1952–1982; `updateInspectorUI` 1984–2020; `syncPlantingStageButtons` 2840–2858; `addItemToTerrarium` 1558–1599; inspector button handlers (scale ±, rotate ±, flip, z back/front, grow, duplicate, delete) in 2874–3320.

**Steps**:
1. Port each panel; catalog cards show the sprite thumbnail via `useSpriteThumbnail`, name, and the one-line blurb from the catalog; clicking a card calls `mutateWorld(w => addItem(w, defId, plantingStage))` (placement at the prototype's default position, `plantingStage` applied to flora, fauna runtime fields initialised) and shows the prototype's toast text.
2. Pour containers: selecting one sets `activePourMaterial` and `activeTool = 'pour'`; re-selecting clears it.
3. Substrate sliders: range inputs in mm with the prototype's min/max/step per layer and live readout; writes `setSubstrate`.
4. `CareToolbar`: Move/Mount, active-pour indicator (shows the container SVG when pouring material is set), Mist, Prune, Bio-Feed, Scrub; `aria-pressed` on the active tool.
5. `ItemInspector`: visible only when `selectedId` is set; each button applies the prototype's exact delta (scale step, rotation step, z reorder, growth advance, duplicate offset) through `mutateWorld`; shows item name and stage. Because the inspector reads item fields from the mutable world, it re-reads after each `mutateWorld` via a local `useReducer` tick — never subscribe per frame.
6. Biome recipes: each button sets substrates and replaces world items with the recipe's list via `mutateWorld`, then toasts.

**Tests**: tab switching shows the right panel; vessel grid click sets `vessel`; hardware toggles flip flags with `aria-pressed`; a recipe button sets the expected substrates and item count; pour container select/deselect; slider change writes mm; flora card click adds an item with the current planting stage; inspector hidden without selection, scale-up increases `scale` by the prototype step, delete removes the item and clears selection, duplicate adds one with an offset; `items.ts` functions tested directly on a `createWorld()`.

### Task 9: Pointer interactions, snapping, care tools and keyboard shortcuts

**Files**: `src/engine/interaction.ts`, `src/components/stage/TerrariumCanvas.tsx` (attach pointer handlers), `src/hooks/useKeyboardShortcuts.ts`, `src/hooks/useTerrariumEngine.ts` (save snapshot on pointer-up; dev-only `window.__botanica` debug handle when `import.meta.env.DEV`), tests `tests/unit/engine/interaction.test.ts`, `tests/e2e/drag.spec.ts`.

**Source ranges**: `setupEventListeners` 2874–3320 — the canvas `pointerdown`/`pointermove`/`pointerup`/`pointerleave` branches: hit testing (sprite bounds × scale, topmost z first), drag with `dragOffset`, magnetic mount snapping (`hoveredSnapTarget`, snap radius 0.045, parent/child offsets so children follow a dragged parent), tool application on click/drag for mist/prune/boost/scrub (what each does to telemetry/items/mold and which ASMR cue name it requests), pour hold (`isPouring` true while pressed with an `activePourMaterial`, cursor container tilts toward pointer), siphon; keyboard: `R` toggles relax mode, `Escape` exits relax / clears selection.

**Steps**:
1. `interaction.ts` pure functions: `hitTest(world, nx, ny, R): PlacedItem | null`, `beginDrag`, `updateDrag` (applies snapping and moves children), `endDrag`, `applyTool(world, state, tool, nx, ny): ToolEffect` returning `{ telemetryDelta?, sound?: AsmrCue, toast?: string }` so audio (Task 10) and store writes stay outside the engine.
2. Canvas handlers convert pointer events via `toNormalized`, call the above, set `world.pointerNorm`, and on pointer-up persist a snapshot and set `selectedId` in the store.
3. `useKeyboardShortcuts`: `R`, `Escape`; ignores key events from inputs.
4. Cursor: `cursor-grab`/`grabbing`/tool-specific classes via a data attribute on the canvas.

**Tests**: hit-test picks the topmost of two overlapping items; drag moves the item by the pointer delta; dragging a `mountable` plant within 0.045 of a mount point snaps to it and sets `parentId`/`mountOffset`; moving the parent moves the child; dragging the child beyond the radius unmounts it; `applyTool('mist')` returns a positive humidity delta and the mist cue; `applyTool('scrub')` removes a mold patch under the pointer; keyboard `R` toggles `relaxMode`. Playwright `drag.spec.ts`: apply the Falls Lake biome, add a `peacock_fern` from the Flora tab, drag it onto the moss wall, assert via `window.__botanica.world()` that `parentId` is set.

### Task 10: Audio and relax mode

**Files**: `src/engine/audio/audioContext.ts`, `asmr.ts`, `ambient.ts`, `src/hooks/useAudio.ts`, `src/hooks/useRelaxMode.ts`, `src/components/stage/RelaxDock.tsx`, `src/components/nav/UtilityActions.tsx` (wire Relax + Audio), `src/components/stage/TerrariumCanvas.tsx` (play `ToolEffect.sound`), tests `tests/unit/engine/audio.test.ts`, `tests/unit/hooks/useRelaxMode.test.tsx`.

**Source ranges**: `ensureAudioContext` 1601–1609; `playTactileASMR` 1611–1665 (every cue name and its oscillator/noise recipe); `startAmbientSoundscape` 1667–1708 and `stopAmbientSoundscape` 1710–1718 (4 presets, interval scheduler); relax-mode handlers in 2874–3320 (body class toggle, 2.6 s idle timer hiding dock and cursor, dock buttons for sound preset + weather, exit button); dock markup ~470–518; `.relax-mode` CSS from lines 21–60 (already ported in Task 1 — verify).

**Steps**:
1. `audioContext.ts`: lazy singleton created on first user gesture; `resume()` on visibility change. All audio modules accept an injected `AudioContext`-like interface for tests.
2. `asmr.ts`: `playCue(ctx, cue: AsmrCue)` with the prototype's recipes; `ambient.ts`: `startAmbient(ctx, preset)` returns a handle with `stop()` that clears every timer and disconnects nodes.
3. `useAudio`: subscribes to `audioEnabled`/`soundPreset`; starts/stops ambient accordingly; exposes `play(cue)` that no-ops when audio is disabled.
4. `useRelaxMode`: toggles `relax-mode` class on `document.body`, idle timer 2600 ms hides dock + cursor (`data-idle` attribute), any pointer move shows them again; `Escape` exits.
5. `RelaxDock`: sound-preset buttons, weather buttons (whatever the prototype offers — read the dock markup), exit; hidden unless `relaxMode`.

**Tests**: with a fake AudioContext, `startAmbient` schedules intervals and `stop()` clears them all (no timers left with fake timers) and disconnects nodes; `playCue` creates and starts at least one oscillator for every cue name; `useRelaxMode` adds/removes the body class and sets idle after 2600 ms, clears on pointer move; audio toggle button starts ambient only after a user gesture.

### Task 11: Snapshot export, polish, accessibility, responsiveness, deploy and e2e

**Files**: `src/lib/snapshot.ts`, `src/components/nav/UtilityActions.tsx` (wire Snapshot), `src/components/layout/LeftSidebar.tsx` and `RightTelemetry.tsx` (drawer behaviour under 1024 px), `src/index.css`, `vite.config.ts` (`base` from `VITE_BASE_PATH` env, default `/`), `.github/workflows/ci.yml` (lint, typecheck, test, build, e2e), `README.md` (deploy section for Vercel/Netlify/GitHub Pages), `tests/e2e/studio.spec.ts`, plus targeted fixes.

**Steps**:
1. `snapshot.ts`: `exportSnapshotPng(canvas, filename)` — renders the current frame at DPR 2 into an offscreen canvas via `renderFrame` and triggers a download, mirroring the prototype's snapshot handler (search `Snapshot` / `toDataURL` in 2874–3320).
2. A11y: every icon button has an accessible name (`aria-label` or visible text), toggles use `aria-pressed`, focus-visible rings via tokens, `prefers-reduced-motion` disables plant sway and particle bob in `specimens.ts`/`particles.ts` (pass a `reducedMotion` flag in `StudioState`).
3. Responsive: below 1024 px the sidebars become slide-over drawers with toggle buttons in the top nav; canvas keeps full width.
4. Perf: confirm DPR cap, `document.hidden` pause, no per-frame object allocation in `renderFrame` hot loops where a module-level scratch object suffices (gradient caching keyed by `R` + lighting).
5. CI workflow and deploy docs.
6. `tests/e2e/studio.spec.ts`: loads, applies the Falls Lake biome, switches speed to 5×, enters relax mode with `R`, exits with `Escape`, takes a screenshot (saved as artifact, not pixel-compared), and verifies localStorage key `botanica_studio_v1` exists with the expected item count after reload.

**Tests**: unit test for `exportSnapshotPng` using a stubbed canvas (`toBlob` called once, anchor `download` set); RTL test that the drawer toggle shows/hides the sidebar at a mocked narrow viewport; `npm run lint`, `typecheck`, `test`, `build`, `e2e` all green.

## Known prototype gaps (ruled: port as-is, phase 2 later)

O₂ gauge, moss cover %, water-cycle label and botanist note are static strings in the prototype; nutrients/humidity never decay; `+1 Day` sets every plant lush; `evapMultiplier`, `idealHumidity`, `floatsOnWater` are unused. **Ruling**: parity first — port the static values exactly as the prototype shows them (the telemetry fields exist so a later "living ecosystem" phase can drive them). The one deliberate deviation is the date label, which reads the real date instead of the hard-coded "Nov 6".

## Risks
| Risk | Likelihood | Mitigation |
|---|---|---|
| 60fps state in React causes jank | High if ignored | Global Constraint 2; hook test asserts no store writes per frame |
| Port drift from ~1,800 lines of imperative code | Medium | Every task cites exact line ranges; reviewers compare against them |
| localStorage schema changes break saves | Medium | `version` + migrations from Task 3 |
| AudioContext blocked until user gesture | Certain | Lazy init on first gesture |
| Canvas tests in jsdom | Medium | Pure render functions + recording context stubs; Playwright for pixels |
| Playwright browser download blocked | Medium | Task 1 reports instead of failing; e2e verified at Task 11 |

## Acceptance
- [ ] Falls Lake preset renders equivalently to the prototype
- [ ] All interactions, tools, speeds, lighting, relax mode, audio, persistence, snapshot work
- [ ] `npm run build`, `npm run lint`, `npm run typecheck`, `npm run test`, `npm run e2e` pass
- [ ] No per-frame React re-renders
