# Living Time Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the tank run on wall-clock tank days with per-species life cycles, reconstruct what happened while the app was closed, and surface it through a Growth board, a Time-away card (with tour) and journal auto-entries.

**Architecture:** A new tank-day layer in `src/engine/simulation/` (`pace`, `ecology`, `life`, `breed`, `moss`, `dayTick`, `report`, `catchup`) runs beside the existing per-frame environment/fauna/mold code and replaces `growth.ts`. Life state lives on `PlacedItem` and `EngineWorld` and is persisted through `WorldSnapshot`; pace, catch-up settings and the away log are persisted in the studio store (v4). UI reads engine state through the bridge (`getWorld`) on a 1 s cadence; an unpersisted `useOverlayStore` holds which overlay is open; canvas rings/pings are `world.marks` drawn by a new render pass.

**Tech Stack:** React 19, Vite 6, TypeScript strict, Zustand 5 + persist, Tailwind 4, vitest + @testing-library/react (jsdom), Playwright, pnpm. No new runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-11-11-living-time-design.md` — every number, table and line of copy below comes from it; read it first.

## Global Constraints

- pnpm; no new runtime deps. `pnpm typecheck`, `pnpm lint`, `pnpm vitest run tests/unit`, `pnpm build` pass at every commit; `pnpm e2e` at Task 15. Branch: create `feat/living-time` from `main` before Task 1.
- Unit tests under `tests/unit/**/*.test.{ts,tsx}` (jsdom, globals); e2e under `tests/e2e` with `dismissWelcomePrompt` from `tests/e2e/helpers.ts`.
- `src/engine/**` imports no React, no audio, no store instances (only `StudioStore`/`StudioState` types); `EngineWorld` never enters Zustand.
- All copy strings verbatim from the spec. Pace defaults to `'garden'` (2 h per tank day). `CATCHUP_MIN_GAP_MS = 600_000`, `CATCHUP_MAX_DAYS = 30`, `AWAY_LOG_MAX = 12`, `CYCLE_DAYS = 21` (existing, `src/engine/care.ts`).
- `STUDIO_VERSION` becomes 4; the `botanica_studio_v1` storage key stays.
- Relax dock, music presets, `updateEnvironment`, `updateFauna`, `updateMold`, mist and pouring are not modified.
- Subagents run on opus/sonnet/haiku with explicit model and effort (never Fable). Commits end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

## Review Focus

1. **A clock that jumped backwards** (laptop clock reset, `lastSimulatedAt > now`): the gap is negative, no catch-up must run and `lastSimulatedAt` must be reset to `now` so the next return is measured correctly. Pinned in Task 8 (`ignores a negative gap and resets the clock`).
2. **A 3-week absence on the Brisk pace**: 1008 tank hours would run 1008 steps and spawn into caps; `tankHours` must cap at 720 and `capped` must be true so the card says `(capped)`. Pinned in Task 8 (`caps a long gap at 720 tank hours`).
3. **A saved item that is not in `LIFE` or `BREED`** (hardscape, tree frog, vampire crab, medaka): life/breed steps must skip it and the board must render `Mature`/`Does not breed in this tank` rather than throw on an undefined table entry. Pinned in Task 4 (`skips items without a life entry`) and Task 12 (`fauna without a breed entry`).
4. **A v3 save with items lacking `life`** loaded after the migration: `restoreWorld` must initialise `life` for every plant with a table entry, with `cyc` in `[0, 0.45)`, or the board shows NaN and no events ever fire. Pinned in Task 2 (`restoreWorld initialises life on old items`).
5. **Catch-up while the card for the previous gap is still open** (tab hidden and shown twice quickly): the second return is under 10 min and must be quiet; a report with the same `key` must not create a duplicate journal entry. Pinned in Task 8 (`a gap under 10 minutes is quiet`) and Task 10 (`skips an auto entry whose key matches the newest entry`).

---

### Task 1: Pace table, seeded RNG and store v4 fields

**Files:**
- Create: `src/engine/simulation/pace.ts`, `src/lib/rng.ts`, `src/engine/simulation/report.ts` (placeholder type only)
- Modify: `src/store/useStudioStore.ts`, `src/store/migrations.ts`, `src/store/selectors.ts`
- Test: `tests/unit/engine/simulation/pace.test.ts`, `tests/unit/lib/rng.test.ts`, `tests/unit/store/migrations.test.ts`, `tests/unit/store/useStudioStore.test.ts`

**Interfaces:**
- Produces `pace.ts`: `type PaceId = 'brisk' | 'garden' | 'calm' | 'real'`; `PACES: Record<PaceId, number>`; `PACE_LABELS: Record<PaceId, string>` (`Brisk`, `Garden`, `Calm`, `Real life`); `PACE_SUBTITLES: Record<PaceId, string>`; `paceMs(pace: PaceId): number`; `MAX_FRAME_MS = 250`; `dtDayForFrame(dtMs: number, timeSpeed: number, pace: PaceId): number`.
- Produces `rng.ts`: `export type Rng = () => number`; `hashStr(s: string): number` (FNV-1a 32-bit, unsigned); `mulberry32(seed: number): Rng`. Every later `rng: Rng` parameter is this type.
- Produces store: `StudioState` fields `pace: PaceId`, `lastSimulatedAt: number | null`, `catchupEnabled: boolean`, `worldSeed: string`, `awayLog: AwayReport[]` (`AwayReport` from `report.ts`; in this task declare it as `interface AwayReport { from: number; to: number }` — Task 7 extends it); actions `setPace(p)`, `setLastSimulatedAt(ts)`, `setCatchupEnabled(v)`, `pushAwayReport(r)` (unshift, slice to `AWAY_LOG_MAX`), `setDayCount(n)`. Selectors `selectPace`, `selectCatchupEnabled`, `selectAwayLog`. The `advanceDay` action stays until Task 6 removes it.
- `migrations.ts`: `migrateV3toV4(persisted)` adds the five fields with defaults (`worldSeed` = `Math.random().toString(36).slice(2, 10)`); sanitizers `sanitizePace(v): PaceId` (unknown → `'garden'`), `sanitizeAwayLog(v): AwayReport[]` (non-array → `[]`, keep ≤ 12 records with finite `from`/`to`), applied in `merge`.

- [ ] **Step 1: Write failing tests**

```ts
// pace.test.ts
it('garden pace is 2 hours per tank day', () => expect(paceMs('garden')).toBe(2 * 36e5))
it('dtDayForFrame caps the frame at 250 ms and scales 5x', () => {
  expect(dtDayForFrame(1000, 1, 'garden')).toBeCloseTo(250 / (2 * 36e5))
  expect(dtDayForFrame(100, 5, 'brisk')).toBeCloseTo(500 / (30 * 60e3))
  expect(dtDayForFrame(100, 0, 'garden')).toBe(0)
})
// rng.test.ts
it('mulberry32 is deterministic and in [0,1)', ...)   // same seed → same first 5 values; 1000 draws all in range
it('hashStr is stable and differs between strings', () => { expect(hashStr('a:1')).toBe(hashStr('a:1')); expect(hashStr('a:1')).not.toBe(hashStr('a:2')) })
// migrations.test.ts
it('v3 → v4 adds pace, lastSimulatedAt, catchupEnabled, worldSeed and awayLog defaults', ...)  // 'garden', null, true, 8-char string, []
it('merge sanitises a bad pace and a non-array awayLog', ...)
// useStudioStore.test.ts
it('pushAwayReport keeps the newest 12 reports, newest first', ...)
it('persists pace, lastSimulatedAt, catchupEnabled, worldSeed and awayLog', ...)
```

- [ ] **Step 2: Run** `pnpm vitest run tests/unit/engine/simulation/pace.test.ts tests/unit/lib/rng.test.ts tests/unit/store` — expect FAIL (module not found / undefined fields).
- [ ] **Step 3: Implement** `pace.ts`, `rng.ts`, the placeholder `report.ts`, the store fields/actions/partialize keys, `STUDIO_VERSION = 4`, `migrateV3toV4` in the migrate chain, sanitizers in `merge`.
- [ ] **Step 4: Run** the same tests — PASS. `pnpm typecheck` PASS.
- [ ] **Step 5: Commit** `feat(sim): pace table, seeded rng and studio store v4 fields`

---

### Task 2: Life state on items and the world; snapshot persistence

**Files:**
- Modify: `src/data/types.ts`, `src/engine/world.ts`, `src/engine/persistence.ts`, `src/engine/items.ts`
- Create: `src/engine/simulation/life.ts` (tables + `initLife`/`ensureLife` only; stepping comes in Task 4)
- Test: `tests/unit/engine/persistence.test.ts`, `tests/unit/engine/items.test.ts`, `tests/unit/engine/simulation/life.test.ts`

**Interfaces:**
- `types.ts`: `interface LifeState { cyc: number; n: number; tendrils: number }`; `interface MossTuft { x: number; r: number; w: number; seed: number }`; `PlacedItem` gains `life?: LifeState; born?: boolean; baby?: number; resting?: boolean; lush?: number`.
- `world.ts`: `EngineWorld` gains `mossTufts: MossTuft[]`, `ecoTime: number` (0), `breed: Record<string, number>` ({}), `moldClearAcc: number` (0), `marks: { rings: string[]; pings: Map<string, number> }`, `lastSnapshotCommit: number` (0), `lastLiveToast: number` (0), `wasMisting: boolean` (false).
- `persistence.ts`: `WorldSnapshot` gains optional `mossTufts`, `ecoTime`, `breed`; `snapshotWorld` writes them; `restoreWorld` reads them with defaults and calls `ensureLife(world, Math.random)`.
- `life.ts`: `type LifeKind = 'bloom' | 'frond' | 'shoot' | 'moss'`; `interface LifeDef { kind: LifeKind; days: number; bloom?: string }`; `LIFE: Readonly<Partial<Record<string, LifeDef>>>` (12 species from the spec); `type EventKind = 'bud'|'open'|'fade'|'seed'|'fiddle'|'frond'|'tendril'|'spread'|'seedling'|'grown'|'hatch'|'rest'`; `LIFE_STEPS: Record<LifeKind, { name: EventKind; at: number }[]>`; `initLife(item: PlacedItem, rng: Rng): void` (sets `life` only when `LIFE[item.id]` exists and `item.life` is undefined); `ensureLife(world: EngineWorld, rng: Rng): void`.
- `items.ts`: `addItem` calls `initLife(item, rng)` (add an optional trailing `rng: Rng = Math.random` parameter if `addItem` has none).

- [ ] **Step 1: Write failing tests**

```ts
// life.test.ts
it('initLife gives a bloom plant cyc in [0, 0.45) and leaves hardscape alone', ...)
// persistence.test.ts
it('snapshot round-trips mossTufts, ecoTime and breed', ...)
it('restoreWorld initialises life on old items', ...)   // snapshot fittonia without life → after restore, life.cyc is a number < 0.45
// items.test.ts
it('addItem seeds life for a plant in the LIFE table', ...)
```

- [ ] **Step 2: Run** `pnpm vitest run tests/unit/engine` — FAIL.
- [ ] **Step 3: Implement** the types, world defaults, snapshot fields, `LIFE`/`LIFE_STEPS`/`initLife`/`ensureLife`, and the `addItem` hook.
- [ ] **Step 4: Run** `pnpm vitest run tests/unit/engine` — PASS; `pnpm typecheck` PASS.
- [ ] **Step 5: Commit** `feat(sim): life state on items, moss tufts and ecoTime in the world snapshot`

---

### Task 3: Stress, vitality, resting and pool score

**Files:**
- Create: `src/engine/simulation/ecology.ts`
- Modify: `src/engine/care.ts` (`runCareAction` 'mist' wakes resting plants), `src/engine/simulation/tick.ts` (the mist and water-pour tools wake on the frame `world.isMisting` / `world.isPouring` turns true)
- Test: `tests/unit/engine/simulation/ecology.test.ts`, `tests/unit/engine/care.test.ts`

**Interfaces:**
- `plantStress(def: FloraDef, env: EnvState): number`; `faunaStress(def: FaunaDef, env: EnvState): number`; `itemStress(item: PlacedItem, env: EnvState): number` (0 for hardscape/unknown); `poolScore(cycleProgress: number): number`; `REST_FLOOR = 55`; `ecologyStep(world: EngineWorld, dtDay: number, opts: { away: boolean }, emit?: Emit): void` (emits `{ kind: 'rest' }` when a plant starts resting; `Emit` from Task 4 — declare it in `life.ts` now as `type Emit = (e: { kind: EventKind; uid: string; id: string }) => void`); `wakeResting(world: EngineWorld): string[]` (species names woken; +8 vitality; clears `resting`); `wokeToast(names: string[]): string` → `The ${names.join(', ')} woke up and perked up.`.
- Vitality is `item.vitality` (existing field; `ecologyStep` clamps 3..100). Babies and hardscape are skipped.

- [ ] **Step 1: Write failing tests**

```ts
it('plantStress is 0 inside the ideal humidity band and 1 twenty points outside', ...)
it('poolScore is 100 when cycled and below 60 mid-cycle', () => { expect(poolScore(1)).toBe(100); expect(poolScore(0.3)).toBeLessThan(60) })
it('ecologyStep moves vitality toward target at 0.32/day up and 1.1/day down', ...)   // v 50 → target 100, dt 1 → 66; v 100 → target 40, dt 0.5 → 67
it('a stressed plant starts resting only when away, floors at 55 and emits rest', ...)
it('resting clears when target > 75 and vitality > 75', ...)
it('grows scale up to base*1.35 above 68 vitality and shrinks below 32 to base*0.62', ...)
it('stage becomes lush when lush > 0.75 and vitality > 85', ...)
it('wakeResting adds 8 vitality, clears resting and returns the names', ...)
// care.test.ts
it("runCareAction('mist') wakes resting plants and appends the woke toast", ...)   // 'Misted the plants. The Fittonia woke up and perked up.'
// ecology.test.ts (tick integration)
it('tick wakes resting plants once when misting or pouring starts', ...)   // isMisting true for 2 frames → one toast; isPouring true → one toast
```

- [ ] **Step 2: Run** `pnpm vitest run tests/unit/engine/simulation/ecology.test.ts tests/unit/engine/care.test.ts` — FAIL.
- [ ] **Step 3: Implement** `ecology.ts` per spec §Stress; in `runCareAction` case `'mist'` call `wakeResting` and append `' ' + wokeToast(names)` when non-empty; in `tick.ts` when `(world.isMisting && !world.wasMisting) || (world.isPouring && !world.wasPouring)` call `wakeResting` and `deps.onToast?.(wokeToast(names))` when non-empty, then `world.wasMisting = world.isMisting; world.wasPouring = world.isPouring` (add `wasPouring: boolean` next to `wasMisting` in `EngineWorld`).
- [ ] **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat(sim): stress, vitality, resting plants and pool score`

---

### Task 4: Life cycles, seedlings and moss spread

**Files:**
- Modify: `src/engine/simulation/life.ts`
- Create: `src/engine/simulation/moss.ts`
- Test: `tests/unit/engine/simulation/life.test.ts`, `tests/unit/engine/simulation/moss.test.ts`

**Interfaces:**
- `life.ts` adds: `interface LifeEvent { kind: EventKind; uid: string; id: string }` (`Emit = (e: LifeEvent) => void`); `lightDose(state: Pick<StudioState, 'hasGrowLamp'>): number`; `lifePace(item: PlacedItem, dose: number): number`; `nextStep(item: PlacedItem): { name: EventKind; at: number } | null` (first threshold `> cyc`; null without life); `interface LifeEnv { lightDose: number; terrain: TerrainInput }`; `lifeStep(world: EngineWorld, dtDay: number, rng: Rng, emit: Emit, env: LifeEnv): void`; `spawnSeedling(world: EngineWorld, parent: PlacedItem, rng: Rng, terrain: TerrainInput): PlacedItem | null`; `FLORA_CAP = 18`, `SPECIES_CAP = 3`, `ITEM_CAP = 70`.
- `moss.ts`: `spreadMoss(world: EngineWorld, parent: PlacedItem, rng: Rng): void`; `mossCover(tufts: MossTuft[]): number` (percent).
- Uses `getLandSurfaceNormY(terrain, x)` from `src/engine/geometry.ts` for seedling y and `findCatalogDef(id)` for `baseScale`. Leaf drop: push one mote into the particle list `updateAmbientMotes` maintains, at the plant's position.

- [ ] **Step 1: Write failing tests**

```ts
it('lifePace is 0 resting, 1 above 70, 0.4 above 55, else 0; bloom halves in low light', ...)
it('crossing 0.5 on a bloom plant emits bud once', ...)          // fittonia cyc 0.49, dt 0.1 → [{ kind: 'bud' }]
it('wrapping at 1 emits seed, decrements cyc and increments n', ...)
it('seed spawns a seedling 40% of the time with the spec fields', ...)   // rng 0.3 → child born, sprout, gp 0.2, vitality 90, scale base*0.62
it('refuses a seedling at 18 flora, 3 of a species, or 70 items', ...)
it('frond grows scale 2% up to base*1.35', ...)
it('tendril counts up to 4', ...)
it('skips items without a life entry', ...)        // quartz + tree_frog present: no throw, no events
// moss.test.ts
it('spreadMoss widens a nearby tuft, else adds one, else widens a random one at 18', ...)
it('mossCover sums r over 18', () => expect(mossCover([{ x: 0, r: 9, w: 0, seed: 0 }])).toBe(50))
```

- [ ] **Step 2: Run** `pnpm vitest run tests/unit/engine/simulation` — FAIL.
- [ ] **Step 3: Implement** per spec §Life cycles and §Moss tufts.
- [ ] **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat(sim): life cycles with buds, fronds, runners, seedlings and moss spread`

---

### Task 5: Breeding and babies

**Files:**
- Create: `src/engine/simulation/breed.ts`
- Test: `tests/unit/engine/simulation/breed.test.ts`

**Interfaces:**
- `interface BreedConditions { nutrients: number; soilMoisture: number; humidity: number; leaflitter: number; poolHasWater: boolean; cycleProgress: number; poolScore: number }`; `interface BreedDef { days: number; cap: number; needs: (c: BreedConditions) => string | null }` (null = satisfied; otherwise the short "needs" phrase — builder's wording, e.g. `richer soil`, `damp leaf litter`, `a cycled pool`, `more humidity`); `BREED: Readonly<Partial<Record<string, BreedDef>>>`; `breedConditions(world: EngineWorld, state: Pick<StudioState, 'substrates' | 'waterSplit'>): BreedConditions`; `spawnBaby(world: EngineWorld, adult: PlacedItem, rng: Rng): PlacedItem`; `babyScale(item: PlacedItem, adultScale: number): number`; `breedStep(world: EngineWorld, dtDay: number, rng: Rng, emit: Emit, cond: BreedConditions): void` (also grows babies `baby += dt/3`, deletes the field at ≥ 1). Progress lives in `world.breed[id]`.

- [ ] **Step 1: Write failing tests**

```ts
it('springtails breed after 4 days when nutrients > 30 and moisture > 55, emitting hatch', ...)
it('does not breed at cap, when the needs are unmet, or when mean stress ≥ 0.4', ...)
it('babies grow up over 3 days and lose the baby field', ...)
it('cherry shrimp need water, a cycled pool and poolScore > 60', ...)
```

- [ ] **Step 2: Run** — FAIL. **Step 3: Implement** per spec §Breeding. **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat(sim): breeding colonies with young that grow up`

---

### Task 6: Tank-day tick, dayCount flush, snapshot cadence; retire `growth.ts`

**Files:**
- Create: `src/engine/simulation/dayTick.ts`
- Modify: `src/engine/simulation/tick.ts`, `src/engine/simulation/telemetry.ts`, `src/engine/render/specimens.ts`, `src/hooks/useTerrariumEngine.ts`, `src/components/nav/ClockSpeedPill.tsx`, `src/store/useStudioStore.ts` (remove `advanceDay`)
- Delete: `src/engine/simulation/growth.ts`
- Test: `tests/unit/engine/simulation/simulation.test.ts` (replace the growth/advanceDay block), `tests/unit/engine/simulation/dayTick.test.ts`, `tests/unit/hooks/useTerrariumEngine.test.tsx`, `tests/unit/store/useStudioStore.test.ts` (drop the advanceDay test)

**Interfaces:**
- `dayTick.ts`: `type DayState = Pick<StudioState, 'timeSpeed' | 'pace' | 'hasGrowLamp' | 'pumpFlow' | 'substrates' | 'waterSplit'>`; `slowStep(world: EngineWorld, dtDay: number, state: DayState, opts: { away: boolean; nutrientFloor?: number }): void` (ecoTime, sprout `growthProgress` and `grown` promotion at ≥ 1 for `born` sprouts, `cycleProgress`, nutrients, mold clearing via `moldClearAcc`); `dayTick(world: EngineWorld, state: DayState, dtMs: number, rng: Rng, emit: Emit): void` = `dtDayForFrame` then `ecologyStep({ away: false }, emit)`, `lifeStep`, `breedStep`, `slowStep`; no-op when dtDay is 0. `sproutScale(item: PlacedItem, base: number): number` = `base · (0.58 + min(0.42, gp · 0.42))`.
- `tick.ts`: `updateGrowth` call → `dayTick(world, store, dtMs, rng, liveEmit)`; `liveEmit` toasts `eventText(kind, id)` (Task 7; until then the plain kind) for NOTABLE kinds except `grown`, at most once per 20 s via `world.lastLiveToast`, through `deps.onToast`. New `TickDeps.commit?: () => void`.
- `telemetry.ts` `flushTelemetry`: `const day = Math.floor(world.ecoTime) + 1; if (day !== state.dayCount) store.setDayCount(day)`; add `'dayCount'` to the `state` Pick. `SNAPSHOT_INTERVAL_MS = 60_000`: `pushTelemetry(world, store, now, state, commit?)` calls `commit()` and `store.setLastSimulatedAt(Date.now())` when `now − world.lastSnapshotCommit ≥ SNAPSHOT_INTERVAL_MS`.
- `useTerrariumEngine.ts`: passes `commit: commitWorld` in deps; on hide and on unmount calls `commitWorld()` and `setLastSimulatedAt(Date.now())` after `flushEnvSeed`.
- `specimens.ts`: sprout draw scale via `sproutScale`; baby fauna via `babyScale`.
- `ClockSpeedPill.plusDay` (temporary until Task 10): `mutateWorld(w => dayTick(w, s, paceMs(s.pace), Math.random, () => {}))` keeping its toast and journal lines; `s.dayCount` read after `flushTelemetry`.

- [ ] **Step 1: Write failing tests**

```ts
// dayTick.test.ts
it('one garden tank day of 250 ms frames advances ecoTime by ~1 and a sprout by 0.6', ...)
it('does nothing when paused', ...)
it('nutrients fall with flora and rise with cleanup crew on leaf litter', ...)
it('nutrientFloor keeps nutrients at min(start, 30)', ...)
// simulation.test.ts
it('flushTelemetry sets dayCount to floor(ecoTime)+1 once', ...)
it('pushTelemetry commits a snapshot and lastSimulatedAt once per minute', ...)
// useTerrariumEngine.test.tsx
it('hiding the tab commits the world snapshot and lastSimulatedAt', ...)
```

- [ ] **Step 2: Run** `pnpm vitest run tests/unit/engine/simulation tests/unit/hooks tests/unit/store` — FAIL.
- [ ] **Step 3: Implement**; delete `growth.ts`; remove the store `advanceDay` action and test.
- [ ] **Step 4: Run** `pnpm vitest run tests/unit`, `pnpm typecheck`, `pnpm lint` — PASS (the `+1 day` tests in `studio.test.tsx` must still pass with the temporary `plusDay`).
- [ ] **Step 5: Commit** `feat(sim): wall-clock tank days drive growth; snapshot every minute and on hide`

---

### Task 7: Report builder and labels

**Files:**
- Modify: `src/engine/simulation/report.ts` (replace the placeholder), `src/engine/simulation/tick.ts` (`liveEmit` uses `eventText`)
- Test: `tests/unit/engine/simulation/report.test.ts`

**Interfaces:**
- `NOTABLE: Record<EventKind, 0 | 1>`; `EVENT_ORDER: EventKind[]`; `eventText(kind: EventKind, id: string): string` (species name from `findCatalogDef`, bloom word from `LIFE`); `interface ReportItem { kind: EventKind; uid: string; id: string; text: string; count: number }`; `interface Hint { uid: string; text: string; eta: number }` (eta in tank days); `interface AwayReport { from: number; to: number; hours: number; tankHours: number; capped: boolean; mode: 'away' | 'preview' | 'day'; reason: string; items: ReportItem[]; more: number; rest: string[]; hints: Hint[] }`; `buildReport(events: LifeEvent[], restNames: string[]): Pick<AwayReport, 'items' | 'more' | 'rest'>`; `restLine(names: string[]): string`; `upcomingHints(world: EngineWorld, state: Pick<StudioState, 'hasGrowLamp'>, limit?: number): Hint[]`; `durationLabel(hours: number): string`; `sinceLabel(ts: number, now?: number): string`; `etaLabel(days: number, paceMs: number): string`; `DOT_COLOURS: Record<string, string>` with a `default` key.

- [ ] **Step 1: Write failing tests**

```ts
it('eventText fills name and bloom word', () => expect(eventText('open', 'fittonia')).toBe(`The ${FITTONIA_NAME} opened small flower spikes.`))   // name from the catalog
it('buildReport drops bud when the same uid opened and fiddle when it fronded', ...)
it('keeps 4 lines without rest, 3 with rest, and counts more', ...)
it('restLine uses "it" for one name and "them" for two', ...)
it('durationLabel: 0.5 h → "30 min", 5 h → "5 h", 48 h → "2 days"', ...)
it('etaLabel at garden pace: 0.0005 d → "in a minute or so"; 0.1 d → "in about 12 min"; 2 d → "in about 4 h"; 20 d → "in about 2 days"', ...)
it('sinceLabel says today / last night / yesterday / weekday', ...)   // fixed `now`
it('upcomingHints puts an open first then the soonest, one per species', ...)
```

- [ ] **Step 2: Run** — FAIL. **Step 3: Implement** per spec §Report copy. **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat(sim): away report builder and time labels`

---

### Task 8: Catch-up simulation

**Files:**
- Create: `src/engine/simulation/catchup.ts`
- Test: `tests/unit/engine/simulation/catchup.test.ts`

**Interfaces:**
- `CATCHUP_MIN_GAP_MS`, `CATCHUP_MAX_DAYS`, `AWAY_LOG_MAX` (move from the store if it defined it in Task 1; the store imports from here); `type CatchUpState = DayState & Pick<StudioState, 'worldSeed'>`; `interface CatchUpOpts { reason: string; away: boolean; preview: boolean; mode: AwayReport['mode']; tankHours?: number }`; `advanceWorld(world, tankHours: number, state: CatchUpState, rng: Rng, emit: Emit, away: boolean): void` (1-hour steps per spec; away passes `nutrientFloor = min(start, 30)` to `slowStep`); `nudgeOne(world, emit): boolean`; `catchUpSpan(world, state: CatchUpState, from: number, to: number, opts: CatchUpOpts): AwayReport` (seeded rng, `snapshotWorld`/`restoreWorld` on throw, rest names = plants that started resting during the span, hints via `upcomingHints`); `runCatchUpIfDue(world, store: StudioStore, now: number): AwayReport | null` (negative gap → `setLastSimulatedAt(now)`, null; gap < 10 min → null; `catchupEnabled` false → `setLastSimulatedAt(now)`, null; else run with `mode: 'away'`, `reason: 'return'`, `pushAwayReport`, `setLastSimulatedAt(now)`, return the report). Never touches UI stores.

- [ ] **Step 1: Write failing tests**

```ts
it('same seed and span give the same report twice', ...)                        // two structuredClone'd worlds
it('a 2 h garden gap gives 24 tank hours, hours 2 and ecoTime ≈ 1', ...)
it('caps a long gap at 720 tank hours', ...)                                      // 3 weeks on brisk → tankHours 720, capped true
it('nudges one plant to its next step when ≥ 8 tank hours pass with nothing notable', ...)
it('restores the world when advanceWorld throws', ...)                            // vi.spyOn(life, 'lifeStep') throws
it('a gap under 10 minutes is quiet', ...)                                         // null, awayLog unchanged, lastSimulatedAt unchanged
it('ignores a negative gap and resets the clock', ...)
it('does nothing but reset the clock when catch-up is off', ...)
it('pushes the report to awayLog newest first', ...)
```

- [ ] **Step 2: Run** — FAIL. **Step 3: Implement** per spec §Catch-up. **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat(sim): deterministic catch-up for time away`

---

### Task 9: Overlay store, canvas marks, moss tufts and the mark render pass

**Files:**
- Create: `src/store/useOverlayStore.ts`, `src/engine/marks.ts`, `src/engine/render/marks.ts`
- Modify: `src/engine/render/renderFrame.ts` (call `drawMarks` right after `drawSpecimens`), `src/engine/render/substrates.ts` (draw moss tufts at the end of the `'soil'` pass)
- Test: `tests/unit/store/useOverlayStore.test.ts`, `tests/unit/engine/render.test.ts`

**Interfaces:**
- `useOverlayStore` (plain `create`, unpersisted): `{ growthBoardOpen: boolean; awayIndex: number | null; tour: { steps: { uid: string; text: string }[]; i: number } | null; openGrowthBoard(); closeGrowthBoard(); openAway(index?: number); closeAway(); setAwayIndex(i: number); startTour(steps): void; nextTour(): void; endTour(): void }`. `openAway` closes the board; `openGrowthBoard` closes the card.
- `marks.ts`: `PING_MS = 2600`, `TOUR_PING_MS = 4200`; `setRings(world, uids: string[])`; `clearRings(world)`; `pingItem(world, uid: string, ms: number, now?: number)`; `activePings(world, now: number): string[]` (drops expired entries).
- `render/marks.ts`: `drawMarks(ctx, world, state, R, timestamp)` — dashed white ring (`setLineDash([4, 4])`) for each `world.marks.rings` uid still in `world.items`; solid yellow ring with a `0.5 + 0.5·sin(timestamp/180)` alpha pulse for active pings; radius from the same item box `drawSpecimens` uses.
- `substrates.ts`: `drawMossTufts(ctx, world, state, R)` — for each tuft, a soft green ellipse (`rgba(86,140,60,0.55)`, radius `R.w · 0.03 · r`, height `R.h · w`) centred on `getLandSurfaceNormY(terrain, x)`; called at the end of the `'soil'` pass only.

- [ ] **Step 1: Write failing tests** — overlay store: `openAway` closes the board, `nextTour` past the last step ends the tour; `activePings` drops expired entries; `drawMarks` with a ringed uid records `setLineDash` and `stroke` on `tests/unit/helpers/recordingContext.ts`, nothing without marks; `drawSubstrates(…, 'soil')` with one tuft records one `ellipse`, and the `'water'` pass records none.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat(stage): overlay store, moss tufts and canvas rings/pings`

---

### Task 10: "+1 day" through catch-up; journal events, key and pool

**Files:**
- Create: `src/store/awayFlow.ts`
- Modify: `src/auth/backend.ts` (`JournalEntry.events?`, `key?`, `metrics.pool?`), `src/store/useAccountStore.ts`, `src/components/account/JournalTab.tsx` (events list, `Pool N` chip, helper copy), `src/components/nav/ClockSpeedPill.tsx`
- Test: `tests/unit/store/awayFlow.test.ts`, `tests/unit/store/useAccountStore.test.ts`, `tests/unit/components/account/journal.test.tsx`, `tests/unit/components/studio.test.tsx`

**Interfaces:**
- `awayFlow.ts`: `journalFromReport(r: AwayReport): { note: string; events: { kind: EventKind; text: string }[]; key: string }` (key = `${r.mode}:${r.from}:${r.to}`; note per spec §Journal); `recordReport(r: AwayReport, opts: { journal: boolean }): void` — `pushAwayReport` unless the newest log entry has the same `from`/`to`/`mode`, `openAway(0)`, and when `journal` and the account is `phase === 'cloud'` with `activeId`, `addJournalEntry('', true, { events, key })` with errors to `handleCloudError`; `plusOneDay(): string` — `play('chime')`, `mutateWorld` running `catchUpSpan(w, s, now − paceMs(s.pace), now, { mode: 'day', reason: '+1 day', away: false, preview: true, tankHours: 24 })`, the 60 %-in-first-3-days mold rule (moved from the deleted `advanceDay`: `moldPatches.push({ x: randomLandX(terrain), size: 9 + rng()·5 })`), `refreshCareReport`, `flushTelemetry`; then `recordReport(report, { journal: true })`; returns the toast text in the existing `Day N: plants grew…` format.
- `addJournalEntry(note: string, auto: boolean, extra?: { events?: JournalEntry['events']; key?: string }): Promise<boolean>`; returns false without writing when `extra.key` equals `get().journal[0]?.key`; sets `metrics.pool = poolScore(s.cycleProgress)` always; `key`/`events` stored when given.
- `ClockSpeedPill.plusDay` becomes `showToast(plusOneDay())`.

- [ ] **Step 1: Write failing tests**

```ts
// awayFlow.test.ts
it('journalFromReport writes "One day later: …" for day mode and the quiet line when empty', ...)
it('recordReport opens the card and logs once per key', ...)
// useAccountStore.test.ts
it('addJournalEntry stores events, key and pool', ...)
it('skips an auto entry whose key matches the newest entry', ...)
// journal.test.tsx
it('renders event bullets and the Pool chip', ...)
it('shows the helper copy', ...)   // exact spec string
// studio.test.tsx — existing +1 day tests stay; add:
it('+1 day opens the away card with the eyebrow "One tank day later"', ...)
```

- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** `pnpm vitest run tests/unit` — PASS.
- [ ] **Step 5: Commit** `feat(journal): +1 day runs a tank day and journals what changed`

---

### Task 11: Time-away card and the return trigger

**Files:**
- Create: `src/components/stage/AwayCard.tsx`
- Modify: `src/components/layout/StudioLayout.tsx` (mount `<AwayCard />` after `<Toast />`), `src/hooks/useTerrariumEngine.ts` (after `seedInitialScene` and in the visible branch: `const r = runCatchUpIfDue(world, useStudioStore.getState(), Date.now()); if (r) recordReport(r, { journal: true })`), `src/index.css` (relax hides `#away-card`)
- Test: `tests/unit/components/awayCard.test.tsx`, `tests/unit/hooks/useTerrariumEngine.test.tsx`

**Interfaces:**
- `AwayCard` (no props) reads `awayIndex` and `awayLog`; renders nothing when the index is null or the log is empty; `section#away-card role="dialog" aria-labelledby`. Uses `sinceLabel`, `durationLabel`, `etaLabel(hint.eta, paceMs(pace))`, `DOT_COLOURS`. On index change `setRings(getWorld(), uids)`; on close/unmount `clearRings`. Line `onMouseEnter` → `pingItem(world, uid, PING_MS)`; line `onClick` → `useStudioStore.getState().selectItem(uid)`. Escape → `closeAway`. The `Start the evening visit` button is added in Task 14.

- [ ] **Step 1: Write failing tests**

```ts
it('renders eyebrow, title, lines, the more line, hints and Got it for an away report', ...)   // 'While you were away · 2 h · 1 tank day', '2 changes since today at …', 'And 1 smaller change.', 'Coming up, if it stays healthy'
it('says "A quiet night" and the rested line when empty', ...)
it('shows "Resting since …" with only a rest line', ...)
it('pager appears with 2 entries and walks Earlier/Later', ...)
it('Got it and Escape close the card and clear rings', ...)
it('marks (capped) and the preview/day eyebrows', ...)
// useTerrariumEngine.test.tsx
it('runs catch-up on mount when lastSimulatedAt is 2 h old and opens the card', ...)
```

- [ ] **Step 2: Run** — FAIL. **Step 3: Implement** per spec §Time-away card, styled like the right telemetry's cards. **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat(stage): time-away summary card with canvas rings`

---

### Task 12: Growth board

**Files:**
- Create: `src/components/growth/growthRows.ts`, `src/components/growth/GrowthBoard.tsx`
- Modify: `src/components/layout/TopNav.tsx` (`Growth` button between `ClockSpeedPill` and `UtilityActions`, `aria-controls="growth-board"`), `src/components/layout/StudioLayout.tsx` (mount inside `#canvas-stage`), `src/index.css` (relax hides `#growth-board`)
- Test: `tests/unit/components/growth/growthRows.test.ts`, `tests/unit/components/growth/growthBoard.test.tsx`

**Interfaces:**
- `growthRows.ts` (pure): `PHASES: Record<LifeKind, { from: number; to: number; name: string; next: string }[]>`; `healthChip(item: PlacedItem): { label: string; tone: 'good' | 'fair' | 'bad' | 'rest' }`; `interface FloraRow { uid: string; name: string; chip: ReturnType<typeof healthChip>; size: number; phase: string; bar: number; ticks: number[]; next: string; eta?: number }`; `floraRow(item: PlacedItem, dose: number, pace: PaceId): FloraRow`; `interface FaunaRow { id: string; name: string; count: number; uids: string[]; chip: { label: 'Stressed' | 'Calm'; tone: 'bad' | 'good' }; young?: number; breeding?: { n: number; cap: number }; next: string; eta?: number }`; `faunaRows(world: EngineWorld, cond: BreedConditions, pace: PaceId): FaunaRow[]`; `tankStats(world: EngineWorld, state: Pick<StudioState, 'dayCount' | 'pumpFlow' | 'waterSplit' | 'pace'>): { age: string; pool?: { value: string; sub: string }; moss: { value: string; sub: string } }`; `upNext(rows: (FloraRow | FaunaRow)[]): { name: string; next: string } | null` (smallest `eta`).
- `GrowthBoard`: `aside#growth-board role="dialog"`; `setInterval(1000)` while open re-reads `getWorld()`; pace radiogroup → `setPace` + toast `Tank pace: ${sub}`; row hover `pingItem` for each uid; row click `selectItem(uid)` (first uid for a fauna row); Escape closes.

- [ ] **Step 1: Write failing tests**

```ts
// growthRows.test.ts
it('a sprout shows Seedling when born, bar (gp-0.2)/0.8 and "Fills out …"', ...)
it('a bloom plant at 0.6 is "In bud" with next "Buds open in about …"', ...)
it('resting → "Paused. Mist or water to wake it"; pace 0 → "Paused until it recovers"; pace 0.4 → " (slowed)"', ...)
it('shoot phase appends " · 2 of 4 runners"', ...)
it('a plant without a life entry is Mature / Settled in', ...)
it('fauna without a breed entry → "Does not breed in this tank"', ...)
it('fauna at cap → "Colony is full. Numbers hold steady"; unmet needs → "Waiting for …"', ...)
it('tankStats: Day N, Cycled / Done eta, moss cover and patches', ...)
it('upNext picks the smallest eta or returns null', ...)
// growthBoard.test.tsx
it('Growth button opens the board with heading, pace group and footer; Escape closes', ...)
it('shows both empty states', ...)
it('subtitle reflects paused / 5× / closed-app copy', ...)
```

- [ ] **Step 2: Run** — FAIL. **Step 3: Implement** per spec §Growth board. **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat(growth): growth board with pace, phases and what comes next`

---

### Task 13: ⋯ menu — Time away group

**Files:**
- Modify: `src/components/nav/UtilityActions.tsx` (`MoreMenu`), `src/store/awayFlow.ts` (`previewGap`)
- Test: `tests/unit/components/moreMenu.test.tsx`

**Interfaces:**
- `previewGap(hours: number): void` — `to = Date.now()`, `from = to − hours·36e5`, `mutateWorld` + `catchUpSpan(w, s, from, to, { mode: 'preview', reason: 'preview', away: true, preview: true })`, `recordReport(r, { journal: false })`.
- Menu gains a group label `Time away`, items `Show the last summary` (`openAway(0)` or the empty toast), a `Preview a gap` row with buttons `8 h`, `1 day`, `3 days`, `1 week` (8, 24, 72, 168 h), and a `role="switch"` labelled `Grow while I'm away` bound to `catchupEnabled` with the two toasts.

- [ ] **Step 1: Write failing tests** — items render; empty-log toast text; `1 day` opens a card whose eyebrow is `Preview · 1 day later`; the switch toggles `catchupEnabled` and toasts both strings; a preview adds no journal entry.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat(nav): time-away controls in the more menu`

---

### Task 14: Evening visit tour

**Files:**
- Create: `src/components/stage/TourCaption.tsx`, `src/hooks/useTour.ts`
- Modify: `src/store/awayFlow.ts` (`startEveningVisit`), `src/components/stage/AwayCard.tsx` (button), `src/components/layout/StudioLayout.tsx` (mount `<TourCaption />`, call `useTour()`), `src/hooks/useRelaxMode.ts` (leaving relax calls `endTour`)
- Test: `tests/unit/hooks/useTour.test.tsx`, `tests/unit/components/awayCard.test.tsx`

**Interfaces:**
- `startEveningVisit(r: AwayReport): void` — `closeAway()`, `setRelaxMode(true)`, steps = `r.items` whose uid exists in `getWorld().items` (mapped to `{ uid, text }`), `startTour(steps)` (empty allowed).
- `useTour()`: on `tour` change — empty steps: show the quiet caption and `endTour` after 3200 ms; else `pingItem(world, step.uid, TOUR_PING_MS)` and `nextTour` after 4200 ms; timers cleared on change/unmount. `isEvening(d?: Date): boolean` exported.
- `TourCaption`: `#tour-caption` with `.tour-pos` = `${isEvening() ? 'Tonight' : 'Since last time'} · ${i + 1} of ${n}`, `.tour-text` = step text (or `Nothing new to look at yet. Enjoy the quiet.`), `Skip` → `endTour`.
- `AwayCard` shows `Start the evening visit` only when at least one item uid is live.

- [ ] **Step 1: Write failing tests** — fake timers: three steps ping in order every 4200 ms then end; empty steps show the quiet caption and end after 3200 ms; Skip ends; leaving relax ends; `isEvening` true at 17:00 and 04:00, false at 12:00; the card's button appears only with live uids and starts the tour in relax.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat(stage): evening visit tour through the changes`

---

### Task 15: End-to-end checks and verification

**Files:**
- Create: `tests/e2e/livingTime.spec.ts`

- [ ] **Step 1: Write e2e** — (a) `Growth` opens `#growth-board` containing `How your tank is growing`; Escape closes it. (b) ⋯ → `1 day` shows `#away-card` with `Preview · 1 day later`; `Got it` closes it. (c) via `window.__botanica.store.setState({ lastSimulatedAt: Date.now() − 3 * 36e5 })`, reload, expect `#away-card` text to contain `While you were away`.
- [ ] **Step 2: Run** `pnpm e2e tests/e2e/livingTime.spec.ts` — PASS.
- [ ] **Step 3: Run** `pnpm typecheck && pnpm lint && pnpm vitest run tests/unit && pnpm build && pnpm e2e` — all PASS; quote the summary lines in the final report.
- [ ] **Step 4: Commit** `test(e2e): growth board, preview gap and return card`
