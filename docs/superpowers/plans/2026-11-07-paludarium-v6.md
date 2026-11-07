# Paludarium v6 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the React/Vite port up to the v6 prototype: a land/pool split with a pump and nitrogen cycle, a temperature/condensation environment model, a care report with one-click actions, habitat-aware fauna, the new substrate set, and the matching panels.

**Architecture:** Per-frame state stays in the mutable `EngineWorld`; the world gains an `env` block (humidity, temperature, moisture, nutrients, O₂, condensation, mist boost, cycle progress, bloom timer) that the engine eases every frame and flushes to the Zustand store at most 4×/s. Build configuration that the user edits (pump flow, pool width, substrates, hardware) stays in the persisted store, bumped to version 2 with a migration. Pure modules (`geometry.ts`, `care.ts`, `environment.ts`) hold the v6 formulas so they are unit-testable without a canvas.

**Tech Stack:** React 19, Vite 6, TypeScript ~5.9 (strict), Zustand 5 + persist, Tailwind 4, vitest 5 + @testing-library/react, Playwright, pnpm.

**Spec:** `docs/reference/prototype-v6.html` (the v6 single-file prototype, 4047 lines; line numbers below refer to it). Older port reference: `docs/reference/design-doc.md`.

## Global Constraints

- Package manager is pnpm; no new runtime dependencies.
- `pnpm typecheck`, `pnpm lint`, `pnpm test` and `pnpm build` must pass at every commit.
- Unit tests live under `tests/unit/**/*.test.{ts,tsx}`; e2e under `tests/e2e`.
- `EngineWorld` is never placed in Zustand. Engine → store writes go through `pushTelemetry` (throttle `TELEMETRY_INTERVAL_MS = 250`).
- Engine modules never import audio or React; cues and toasts leave the engine through `TickDeps` callbacks.
- Store storage key stays `botanica_studio_v1`; persist `version` becomes `2`. Prototype import keys: `botanica_paludarium_v6` (new) and `existence_botanica_paludarium_v5` (kept).
- Catalog ids do not change. Substrate ids become exactly: `pebbles, charcoal, soil, sand, leaflitter, rivergravel, water` plus the `siphon` tool. `LAND_LAYER_IDS = ['pebbles','charcoal','soil','sand','leaflitter']`.
- Constants copied verbatim from the spec: `MM_TO_NORM = 0.42 / 130`, `BANK_W = 0.06`, `CYCLE_DAYS = 21`, `TERRAIN_POINTS = 21`, speed multiplier `3.5` at 5×.
- User-facing copy is copied verbatim from the spec strings quoted in each task.
- Every interactive control keeps an accessible name (aria-label, role=radio/switch/checkbox as the spec uses).
- Commits end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. Work on a feature branch off `main`.

## Review Focus

1. **Pool width slider at 0 while `water > 0` (legacy saves)**: `hasPool()` is false, the water layer must not render and aquatic fauna must get the "Fish and shrimp need open water." warning; geometry must not divide by zero at divider 0.15. Pinned in Task 3 and Task 5.
2. **Migrated v1 saves carrying `lavarock`/`moss`**: depths must map into the v6 keys without NaN and the total depth must count only land layers. Pinned in Task 2.
3. **Water fauna present when the pool is removed**: fauna must glide into the land zone with finite coordinates rather than snapping or escaping the vessel. Pinned in Task 7.
4. **Conflicting ideal ranges (desert and tropical species together)**: `idealRange` must return `conflict: true`, the gauge band must hide, and the gauge must not be stuck "off". Pinned in Task 5 and Task 14.
5. **+1 Day with no pool**: `cycleProgress` stays 1 and no "The pool has cycled" toast fires; the mold bloom chance only applies within 3 days of `setupDay`. Pinned in Task 8.

---

### Task 1: Data model v6 (types, substrates, catalog, preset data)

**Files:**
- Modify: `src/data/types.ts` (SubstrateDepths, FaunaDef, AiState, new PumpFlow/FaunaHabitat)
- Modify: `src/data/substrates.ts` (whole file)
- Modify: `src/data/catalog.ts:91-100` (FAUNA)
- Modify: `src/data/presets.ts` (recipe values, Falls Lake items)
- Test: `tests/unit/data/data.test.ts`

**Interfaces:**
- Produces: `type PumpFlow = 'off' | 'gentle' | 'strong'`; `type FaunaHabitat = 'water' | 'shore' | 'land'`; `type AiState = 'wandering' | 'resting' | 'foraging' | 'exploring' | 'hiding'`.
- Produces: `interface SubstrateDepths { pebbles; charcoal; soil; sand; leaflitter; rivergravel; water }` (all `number`).
- Produces: `FaunaDef` adds `habitat: FaunaHabitat; nocturnal?: boolean; needsWater?: boolean; aquatic?: boolean; preyOn?: readonly string[]; idealHumidity?: readonly [number, number]; idealTemp?: readonly [number, number]`.
- Produces: `LAND_LAYER_IDS: readonly ['pebbles','charcoal','soil','sand','leaflitter']` and `DEFAULT_SUBSTRATES = { pebbles: 12, charcoal: 5, soil: 34, sand: 0, leaflitter: 5, rivergravel: 6, water: 45 }` from `substrates.ts`.
- Produces: `BiomePreset` gains `waterSplit: number; cycleProgress?: number; pumpFlow?: PumpFlow; toast: string`; `PresetItem` gains `anchor?: 'land' | 'bed' | 'waterTop'` (default `'land'`) and `stage?: GrowthStage`.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/unit/data/data.test.ts (add)
it('substrate layers are the v6 set in order', () => {
  expect(SUBSTRATE_LAYERS.map((l) => l.id)).toEqual(['pebbles','charcoal','soil','sand','leaflitter','rivergravel','water','siphon'])
  expect(LAND_LAYER_IDS).toEqual(['pebbles','charcoal','soil','sand','leaflitter'])
  expect(DEFAULT_SUBSTRATES).toEqual({ pebbles: 12, charcoal: 5, soil: 34, sand: 0, leaflitter: 5, rivergravel: 6, water: 45 })
})
it('fauna carry v6 habitat data', () => {
  const crab = FAUNA.find((f) => f.id === 'vampire_crab')!
  expect(crab).toMatchObject({ habitat: 'shore', nocturnal: true, needsWater: true, preyOn: ['medaka_fish','garden_snail'], idealHumidity: [75,100], idealTemp: [22,28], baseScale: 0.8 })
  expect(FAUNA.find((f) => f.id === 'cherry_shrimp')).toMatchObject({ habitat: 'water', aquatic: true, idealTemp: [20,27], baseScale: 0.72 })
  expect(FAUNA.find((f) => f.id === 'tree_frog')).toMatchObject({ habitat: 'land', nocturnal: true, idealHumidity: [50,85], idealTemp: [20,26], baseScale: 0.95 })
  for (const f of FAUNA) expect(['water','shore','land']).toContain(f.habitat)
})
it('recipes use the v6 depths and pool split', () => {
  expect(BIOME_PRESETS.tropical).toMatchObject({ substrates: { pebbles: 14, charcoal: 6, soil: 38, sand: 0, leaflitter: 6, rivergravel: 4, water: 0 }, waterSplit: 0, hasLid: true, toast: 'Rainforest: all land, sealed lid' })
  expect(BIOME_PRESETS.paludarium).toMatchObject({ substrates: { pebbles: 12, charcoal: 5, soil: 30, sand: 0, leaflitter: 4, rivergravel: 8, water: 55 }, waterSplit: 0.45, cycleProgress: 1, hasLid: true, toast: 'Lagoon: 45% pool for fish and shrimp' })
  expect(BIOME_PRESETS.desert).toMatchObject({ substrates: { pebbles: 14, charcoal: 4, soil: 16, sand: 22, leaflitter: 0, rivergravel: 4, water: 0 }, waterSplit: 0, hasLid: false, hasFogger: false, toast: 'Arid: open top, sand, no fogger' })
  expect(BIOME_PRESETS.falls).toMatchObject({ substrates: { pebbles: 12, charcoal: 5, soil: 34, sand: 0, leaflitter: 5, rivergravel: 6, water: 45 }, waterSplit: 0.32, cycleProgress: 1, pumpFlow: 'gentle', toast: 'Falls Lake: 30% pool, waterfall and moss wall' })
  expect(BIOME_PRESETS.falls.items.map((i) => i.defId)).toEqual(['moss_wall_cliff','root_slate_waterfall','golden_river_boulders','cryptanthus_pink','peacock_fern','peacock_fern','boston_fern','trailing_ivy','anubias_nana','pogostemon_star','subwassertang','frogbit_pads','cherry_shrimp','cherry_shrimp','vampire_crab','springtails','isopod'])
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run tests/unit/data/data.test.ts`
Expected: FAIL (`LAND_LAYER_IDS` undefined, `habitat` undefined, recipe mismatch).

- [ ] **Step 3: Update `src/data/types.ts`**

Add `PumpFlow`, `FaunaHabitat`, the new `FaunaDef` fields, replace `SubstrateDepths` keys, and set `AiState` to the union above. Remove the `string` escape hatch from `AiState`.

- [ ] **Step 4: Rewrite `src/data/substrates.ts` with the v6 layers (spec lines 572–582)**

Copy name/containerName/colors/defaultHeight/desc per layer verbatim. Keep `icon` from the current file where a layer survives; leaflitter uses `'🍂'`. Export `LAND_LAYER_IDS` and the new `DEFAULT_SUBSTRATES`.

- [ ] **Step 5: Update `FAUNA` in `src/data/catalog.ts` with spec lines 672–679**

Copy every field (speed, habitat, nocturnal, needsWater, aquatic, swimsInWater, preyOn, idealHumidity, idealTemp, cleansMold, moldEatRate, baseScale, desc) verbatim.

- [ ] **Step 6: Update `src/data/presets.ts`**

Recipe substrates, `waterSplit`, `cycleProgress`, `hasLid`/`hasFogger`, and `toast` per spec lines 3607–3632. Falls Lake (spec `applyFallsLakePreset`, lines 1698–1757): `vessel: 'paludarium_tank'`, lid/lamp/fogger true, `pumpFlow: 'gentle'`, `waterSplit: 0.32`, `cycleProgress: 1`, contour `i => Math.max(0, Math.sin(i*0.45)*2.5 + (i>12 ? (i-12)*0.6 : 0))`, hardscape `moss_wall_cliff (x 0.60, yOffset -0.25, scale 1.85, z 1)`, `root_slate_waterfall (0.45, -0.15, 1.55, z 2)`, `golden_river_boulders (0.73, -0.03, 1.2, z 4)`; nine flora with `stage: 'mature'`, zIndex `6+idx`, mounted ones via `parentIndex/offsetX/offsetY` as the spec lists (cryptanthus on the wall at offset 0.12,-0.17; peacock ferns and boston fern on the falls; anubias on the boulders), `pogostemon_star` at x 0.55 on land, `subwassertang` at x 0.24 `anchor: 'bed'` yOffset -0.03, `frogbit_pads` at x 0.21 `anchor: 'waterTop'`; fauna `cherry_shrimp` x 0.22 and 0.27 (`anchor: 'waterTop'`), `vampire_crab` 0.40, `springtails` 0.66, `isopod` 0.58 with yOffset -0.03, zIndex `20+idx`.

- [ ] **Step 7: Make the repo compile**

Run `pnpm typecheck`. Every reference to `lavarock`/`moss` and every `switch` over substrate ids now fails; fix each site by iterating `SUBSTRATE_LAYERS` / `LAND_LAYER_IDS` instead of naming layers. Do not change behaviour beyond what compiling requires; later tasks own the logic.

- [ ] **Step 8: Run the full suite**

Run: `pnpm typecheck && pnpm test`
Expected: data tests PASS; other suites may fail only on removed layer ids in fixtures. Update those fixtures to the v6 keys.

- [ ] **Step 9: Commit**

```bash
git add src/data tests/unit
git commit -m "feat(data): adopt v6 substrate set, fauna habitats and recipes"
```

---

### Task 2: Store v2 (pool/pump fields, telemetry shape, migration, v6 import)

**Files:**
- Modify: `src/store/useStudioStore.ts`
- Modify: `src/store/migrations.ts`
- Modify: `src/store/importPrototypeSave.ts`
- Modify: `src/store/selectors.ts`
- Create: `src/engine/care.ts` (type-only stub: `CareActionId`, `CareIssue`; Task 5 fills it)
- Test: `tests/unit/store/useStudioStore.test.ts`, `tests/unit/store/migrations.test.ts`, `tests/unit/store/importPrototypeSave.test.ts`

**Interfaces:**
- Consumes: `PumpFlow`, `SubstrateDepths`, `LAND_LAYER_IDS` (Task 1).
- Produces: `StudioState` adds `pumpFlow: PumpFlow` (default `'gentle'`), `waterSplit: number` (default `0.32`), `cycleProgress: number` (default `1`), `setupDay: number` (default `1`).
- Produces: `Telemetry = { humidity: 82; temperature: 24.5; soilMoisture: 74; nutrients: 88; o2Balance: 96; condensation: 0; moldCount: 0; cleanupCrewCount: 0; careIssues: CareIssue[] }` (defaults shown; `mossCoverPct`, `waterCycle`, `note` removed).
- Produces: actions `setPumpFlow(flow: PumpFlow)`, `setWaterSplit(v: number)` (clamped 0–0.6), `setCycleProgress(v: number)` (clamped 0–1), `setSetupDay(day: number)`, `setHardware(key: HardwareKey, value: boolean)`.
- Produces: `migrate(persisted, version)` v1→v2 and `mapLegacySubstrates(raw: Record<string, unknown>): SubstrateDepths` exported from `migrations.ts`.
- Produces: `PROTOTYPE_STORAGE_KEY_V6 = 'botanica_paludarium_v6'`; `importPrototypeSave` reads v6 first, then v5.
- Produces (stub): `type CareActionId = 'mist' | 'openLid' | 'closeLid' | 'fogOff' | 'pumpGentle' | 'feed' | 'widenPool'`; `interface CareIssue { level: 'warn' | 'info'; species?: string[]; text: string; action?: { id: CareActionId; label: string } }`.

- [ ] **Step 1: Write the failing tests**

```ts
// migrations.test.ts
it('maps a v1 save into v2', () => {                                   // Review Focus 2
  const out = migrate({ substrates: { pebbles: 10, lavarock: 8, charcoal: 6, moss: 8, soil: 16, rivergravel: 16, sand: 0, water: 24 }, dayCount: 7 }, 1)
  expect(out.substrates).toEqual({ pebbles: 18, charcoal: 6, soil: 24, sand: 0, leaflitter: 0, rivergravel: 16, water: 24 })
  expect(out).toMatchObject({ pumpFlow: 'gentle', waterSplit: 0.32, cycleProgress: 1, setupDay: 7 })
})
it('a v1 save with no water gets no pool', () => {
  expect(migrate({ substrates: { water: 0 }, dayCount: 1 }, 1).waterSplit).toBe(0)
})
it('mapLegacySubstrates never yields NaN', () => {
  const s = mapLegacySubstrates({ moss: 'x', lavarock: undefined })
  for (const v of Object.values(s)) expect(Number.isFinite(v)).toBe(true)
})
// useStudioStore.test.ts
it('setWaterSplit clamps to [0, 0.6] and persists pool fields', () => {
  const store = createStudioStore(memoryStorage)
  store.getState().setWaterSplit(0.9); expect(store.getState().waterSplit).toBe(0.6)
  store.getState().setPumpFlow('strong'); store.getState().setCycleProgress(0.4)
  expect(partialize(store.getState())).toMatchObject({ waterSplit: 0.6, pumpFlow: 'strong', cycleProgress: 0.4 })
})
it('setTelemetry ignores an identical careIssues array', () => {
  const store = createStudioStore(memoryStorage)
  const issues = [{ level: 'warn', text: 'x' }]
  store.getState().setTelemetry({ careIssues: issues }); const before = store.getState().telemetry
  store.getState().setTelemetry({ careIssues: [{ level: 'warn', text: 'x' }] })
  expect(store.getState().telemetry).toBe(before)
})
// importPrototypeSave.test.ts
it('imports a v6 prototype save', () => {
  storage.setItem('botanica_paludarium_v6', JSON.stringify({ items: [{ uid: 'a', id: 'isopod' }], vessel: 'wardian', pumpFlow: 'off', waterSplit: 0.4, cycleProgress: 0.2, setupDay: 3, dayCount: 5, substrates: { pebbles: 1, charcoal: 1, soil: 1, sand: 0, leaflitter: 1, rivergravel: 1, water: 10 }, terrainContour: new Array(21).fill(0) }))
  expect(importPrototypeSave(storage)).toMatchObject({ vessel: 'wardian', pumpFlow: 'off', waterSplit: 0.4, cycleProgress: 0.2, setupDay: 3, dayCount: 5 })
})
it('still imports a v5 save through the legacy substrate map', () => {
  storage.setItem('existence_botanica_paludarium_v5', JSON.stringify({ items: [{ uid: 'a', id: 'isopod' }], substrates: { lavarock: 5, moss: 3, soil: 10, water: 20 } }))
  expect(importPrototypeSave(storage)!.substrates).toEqual({ pebbles: 5, charcoal: 0, soil: 13, sand: 0, leaflitter: 0, rivergravel: 0, water: 20 })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run tests/unit/store`
Expected: FAIL (`mapLegacySubstrates` not exported, fields undefined).

- [ ] **Step 3: Implement `mapLegacySubstrates` and v1→v2 `migrate` in `src/store/migrations.ts`**

Mapping: `pebbles = pebbles + lavarock`, `soil = soil + moss`, `leaflitter = 0`, other keys pass through; non-finite values become 0. v2 defaults: `pumpFlow 'gentle'`, `waterSplit = water > 4 ? 0.32 : 0`, `cycleProgress 1`, `setupDay = dayCount`.

- [ ] **Step 4: Extend `src/store/useStudioStore.ts`**

Add the fields, defaults, actions and persist `version: 2` with the new fields in `partialize`. `setTelemetry` keeps its per-key diff; for `careIssues` compare `JSON.stringify` before writing. Add selectors `selectPumpFlow`, `selectWaterSplit`, `selectCycleProgress`.

- [ ] **Step 5: Extend `src/store/importPrototypeSave.ts`**

Read `botanica_paludarium_v6` first (payload per spec `saveTerrariumState`, lines 686–720: vessel, hasLid, hasGrowLamp, hasFogger, pumpFlow, waterSplit, cycleProgress, substrates, terrainContour, surfaceGrains, items, dayCount, setupDay). Fall back to the v5 key with `mapLegacySubstrates`.

- [ ] **Step 6: Run the store suite**

Run: `pnpm vitest run tests/unit/store`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/store src/engine/care.ts tests/unit/store
git commit -m "feat(store): v2 schema with pool, pump and cycle fields plus v6 import"
```

---

### Task 3: Geometry: pool, bank, water top and stage rect

**Files:**
- Modify: `src/engine/geometry.ts`
- Modify: `src/engine/render/renderFrame.ts` (`computeVesselRect`)
- Test: `tests/unit/engine/geometry.test.ts`, `tests/unit/engine/render.test.ts`

**Interfaces:**
- Produces (all in `geometry.ts`):
  - `MM_TO_NORM = 0.42 / 130`, `BANK_W = 0.06`
  - `interface TerrainInput { substrates: Partial<SubstrateDepths>; waterSplit: number; terrainContour?: readonly number[] }`
  - `getTotalSubstrateDepth(substrates): number` (sums `LAND_LAYER_IDS` only)
  - `hasPool(waterSplit: number): boolean` (`> 0.02`)
  - `getDividerNormX(waterSplit: number): number` (`0.15 + 0.70 * Math.min(0.6, waterSplit)`)
  - `getPoolBedNormY(substrates): number` (`0.92 - Math.max(2, rivergravel) * MM_TO_NORM`)
  - `getLandSurfaceNormY(t: TerrainInput, normX: number): number` (`0.92 - (depth + contourMm) * MM_TO_NORM`)
  - `getWaterTopNormY(t): number` (`Math.max(bed - water*MM_TO_NORM, landSurface(divider) + 0.015)`)
  - `poolHasWater(t): boolean` (`hasPool && water > 4`)
  - `getSoilSurfaceNormalizedY(t: TerrainInput, normX = 0.5): number` (bed left of `divider - BANK_W`, linear bank across `BANK_W`, land elsewhere; land only when no pool). **Breaking signature.**
  - `randomLandX(t, rng): number` (`lo = pool ? divider + 0.03 : 0.24`, `hi = 0.76`)
- Produces: `computeVesselRect(W, H, relaxMode)` → radius `Math.min(W*0.62, H*(relax ? 0.48 : 0.46))`, centre `(W/2, H/2)`.

- [ ] **Step 1: Write the failing tests**

```ts
const t = { substrates: { pebbles: 12, charcoal: 5, soil: 34, sand: 0, leaflitter: 5, rivergravel: 6, water: 45 }, waterSplit: 0.32 }
it('divider and bed follow the spec', () => {
  expect(getDividerNormX(0.32)).toBeCloseTo(0.374, 3)
  expect(getDividerNormX(0.9)).toBeCloseTo(0.57, 3)
  expect(getPoolBedNormY(t.substrates)).toBeCloseTo(0.92 - 6 * MM_TO_NORM, 5)
  expect(getPoolBedNormY({ rivergravel: 0 })).toBeCloseTo(0.92 - 2 * MM_TO_NORM, 5)
})
it('surface is bed in the pool, land on land, sloped on the bank', () => {
  const d = getDividerNormX(0.32)
  expect(getSoilSurfaceNormalizedY(t, 0.2)).toBeCloseTo(getPoolBedNormY(t.substrates), 5)
  expect(getSoilSurfaceNormalizedY(t, 0.7)).toBeCloseTo(getLandSurfaceNormY(t, 0.7), 5)
  const mid = getSoilSurfaceNormalizedY(t, d - BANK_W / 2)
  expect(mid).toBeGreaterThan(getLandSurfaceNormY(t, d)); expect(mid).toBeLessThan(getPoolBedNormY(t.substrates))
})
it('water top never sinks below the bank lip', () => {
  expect(getWaterTopNormY({ ...t, substrates: { ...t.substrates, water: 1 } })).toBeCloseTo(getLandSurfaceNormY(t, getDividerNormX(0.32)) + 0.015, 5)
})
it('waterSplit 0 with water > 0 is all land and finite', () => {   // Review Focus 1
  const noPool = { ...t, waterSplit: 0 }
  expect(hasPool(0)).toBe(false); expect(poolHasWater(noPool)).toBe(false)
  for (const x of [0.15, 0.2, 0.5, 0.85]) expect(Number.isFinite(getSoilSurfaceNormalizedY(noPool, x))).toBe(true)
  expect(getSoilSurfaceNormalizedY(noPool, 0.2)).toBeCloseTo(getLandSurfaceNormY(noPool, 0.2), 5)
})
it('total depth ignores water and gravel', () => { expect(getTotalSubstrateDepth(t.substrates)).toBe(56) })
it('randomLandX stays right of the bank when a pool exists', () => {
  expect(randomLandX(t, () => 0)).toBeCloseTo(getDividerNormX(0.32) + 0.03, 5)
  expect(randomLandX(t, () => 0.999)).toBeLessThanOrEqual(0.76)
  expect(randomLandX({ ...t, waterSplit: 0 }, () => 0)).toBeCloseTo(0.24, 5)
})
// render.test.ts
it('computeVesselRect follows getStageGeometry', () => { expect(computeVesselRect(1000, 600, false).w / 2).toBeCloseTo(276, 0); expect(computeVesselRect(1000, 600, true).w / 2).toBeCloseTo(288, 0) })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run tests/unit/engine/geometry.test.ts tests/unit/engine/render.test.ts`
Expected: FAIL (functions missing / old signature).

- [ ] **Step 3: Implement the geometry functions in `src/engine/geometry.ts`** (spec lines 1580–1628)

Keep `sampleContour`, `toNormalized`, `traceVesselPath` as they are.

- [ ] **Step 4: Update every caller of `getSoilSurfaceNormalizedY` to pass a `TerrainInput`**

`pnpm typecheck` lists them (fauna, items, interaction, pouring, render/substrates, render/water, render/specimens, engine/presets, TerrariumCanvas, tests). Build the input as `{ substrates, waterSplit, terrainContour: world.terrainContour }` from the store state at hand. Behaviour of those modules is reworked in later tasks; here only the plumbing changes.

- [ ] **Step 5: Update `computeVesselRect` in `src/engine/render/renderFrame.ts`**

- [ ] **Step 6: Run the full suite**

Run: `pnpm typecheck && pnpm test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/engine tests/unit/engine
git commit -m "feat(geometry): pool divider, bank slope, water top and v6 stage rect"
```

---

### Task 4: Environment model on the world, telemetry flush and tick callbacks

**Files:**
- Create: `src/engine/simulation/environment.ts`
- Modify: `src/engine/world.ts` (add `env`, `frame`, `careIssues`, `pendingWaterSplit`; remove `pendingTelemetry`)
- Modify: `src/engine/simulation/constants.ts` (add `simSpeedMult`)
- Modify: `src/engine/simulation/clock.ts` (add `isLampOn`)
- Modify: `src/engine/simulation/telemetry.ts` (flush `env`; delete `bumpTelemetry`)
- Modify: `src/engine/simulation/tick.ts` (`TickDeps.onToast`, call order)
- Modify: `src/engine/persistence.ts` (snapshot does not carry env), `src/hooks/useTerrariumEngine.ts` (seed `env` from store on mount, pass `onToast: showToast`)
- Test: `tests/unit/engine/simulation/environment.test.ts`, `tests/unit/engine/simulation/simulation.test.ts`

**Interfaces:**
- Consumes: `poolHasWater`, `hasPool` (Task 3); store fields (Task 2).
- Produces: `interface EnvState { humidity; temperature; soilMoisture; nutrients; o2; condensation; mistBoost; cycleProgress; bloomTimer }` on `EngineWorld.env`; `createWorld()` defaults `{82, 24.5, 74, 88, 96, 0, 0, 1, 700}`. Also `EngineWorld.frame: number` (tick counter), `EngineWorld.careIssues: CareIssue[]` (filled by Task 5), `EngineWorld.pendingWaterSplit?: number`.
- Produces: `simSpeedMult(timeSpeed: number): number` (`5 → 3.5`, else `1`) in `constants.ts`; `growth.ts` uses it instead of its private copy.
- Produces: `isLampOn(s: Pick<StudioState,'hasGrowLamp'|'lighting'>): boolean` (`hasGrowLamp && lighting !== 'night'`).
- Produces: `type EnvInputs = Pick<StudioState,'hasLid'|'hasGrowLamp'|'hasFogger'|'lighting'|'pumpFlow'|'waterSplit'|'substrates'|'timeSpeed'>`; `computeEnvTargets(s: EnvInputs, items: readonly PlacedItem[], env: EnvState): { humidity; temperature; soilMoisture; condensation; o2 }`; `updateEnvironment(world, s: EnvInputs, dtMs, onToast?: (msg: string) => void): void`.
- Produces: `TickDeps.onToast?: (msg: string) => void`.
- Produces: `pushTelemetry` flushes `env` into `Telemetry` keys (`o2` → `o2Balance`), `world.careIssues` → `telemetry.careIssues`, `env.cycleProgress` → `store.setCycleProgress`, `world.pendingWaterSplit` → `store.setWaterSplit`.

- [ ] **Step 1: Write the failing tests**

```ts
// environment.test.ts
const base = { hasLid: true, hasGrowLamp: true, hasFogger: true, lighting: 'sunlight', pumpFlow: 'gentle', waterSplit: 0.32, substrates: DEFAULT_SUBSTRATES, timeSpeed: 1 } as const
it('humidity target sums the spec terms', () => {
  const env = { ...createWorld().env, mistBoost: 0 }
  // poolFrac = min(1, 0.32/0.5) * min(1, 45/40) = 0.64; falls absent → 48+22+7.68+7-3 = 81.68
  expect(computeEnvTargets(base, [], env).humidity).toBeCloseTo(81.68, 2)
  expect(computeEnvTargets({ ...base, lighting: 'night' }, [], env).humidity).toBeCloseTo(88.68, 2) // +4 night, lamp off
})
it('temperature and o2 targets', () => {
  const env = createWorld().env
  expect(computeEnvTargets(base, [], env).temperature).toBeCloseTo(23 + 2.5 + 0.8 - 0.4, 5)
  const flora = Array.from({ length: 12 }, (_, i) => ({ uid: String(i), id: 'peacock_fern', category: 'flora' }))
  expect(computeEnvTargets(base, flora as PlacedItem[], env).o2).toBeCloseTo(72 + 25, 5)      // capped at 25
  expect(computeEnvTargets({ ...base, lighting: 'night' }, [], env).o2).toBeCloseTo(72 - 6, 5)
})
it('waterfall with pump adds 3 humidity only when the pool holds water', () => {
  const falls = [{ uid: 'f', id: 'root_slate_waterfall', category: 'hardscape' }] as PlacedItem[]
  const env = { ...createWorld().env, mistBoost: 0 }
  expect(computeEnvTargets(base, falls, env).humidity).toBeCloseTo(84.68, 2)
  expect(computeEnvTargets({ ...base, waterSplit: 0 }, falls, env).humidity).toBeCloseTo(48 + 22 + 7 - 3, 2)
})
it('updateEnvironment eases with k = 0.004 * speedMult and decays mistBoost', () => {
  const w = createWorld(); w.env.humidity = 50; w.env.mistBoost = 10
  updateEnvironment(w, { ...base, timeSpeed: 5 }, 1000 / 60)
  expect(w.env.mistBoost).toBeCloseTo(10 * (1 - 0.0025 * 3.5), 6)
  expect(w.env.humidity).toBeCloseTo(50 + (Math.min(99, 81.68 + w.env.mistBoost) - 50) * 0.014, 3)
})
it('nutrients drift by flora and crew, clamped to [15, 100]', () => {
  const w = createWorld(); w.env.nutrients = 50
  w.items = [...Array.from({ length: 4 }, (_, i) => ({ uid: `p${i}`, id: 'peacock_fern', category: 'flora' })), { uid: 's1', id: 'springtails', category: 'fauna' }, { uid: 's2', id: 'isopod', category: 'fauna' }] as PlacedItem[]
  updateEnvironment(w, base, 1000 / 60)
  expect(w.env.nutrients).toBeCloseTo(50 - 0.001 + 0.0006, 6)
  w.env.nutrients = 15.0001; w.items = w.items.filter((i) => i.category === 'flora'); updateEnvironment(w, base, 1000 / 60); expect(w.env.nutrients).toBe(15)
})
it('cycleProgress advances only with a pool and fires the toast at 1', () => {
  const w = createWorld(); w.env.cycleProgress = 0.999999; const toasts: string[] = []
  updateEnvironment(w, base, 1000 / 60, (m) => toasts.push(m))
  expect(w.env.cycleProgress).toBe(1); expect(toasts).toEqual(['The pool has cycled. Ammonia and nitrite read 0.'])
  const w2 = createWorld(); w2.env.cycleProgress = 0.5; updateEnvironment(w2, { ...base, waterSplit: 0 }, 16); expect(w2.env.cycleProgress).toBe(0.5)
  const w3 = createWorld(); w3.env.cycleProgress = 0; updateEnvironment(w3, { ...base, pumpFlow: 'off' }, 1000/60); expect(w3.env.cycleProgress).toBeCloseTo(0.000004 * 0.4, 9)
})
it('isLampOn is false at night', () => { expect(isLampOn({ hasGrowLamp: true, lighting: 'night' })).toBe(false) })
// simulation.test.ts (pushTelemetry)
it('pushTelemetry flushes env, cycle progress and pending water split', () => {
  const store = createStudioStore(memoryStorage); const w = createWorld()
  w.env.temperature = 30; w.env.cycleProgress = 0.3; w.pendingWaterSplit = 0.3
  pushTelemetry(w, store.getState(), 1000)
  expect(store.getState().telemetry.temperature).toBe(30); expect(store.getState().cycleProgress).toBe(0.3); expect(store.getState().waterSplit).toBe(0.3)
  expect(w.pendingWaterSplit).toBeUndefined()
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run tests/unit/engine/simulation`
Expected: FAIL (module not found).

- [ ] **Step 3: Add `env`, `frame`, `careIssues` and `pendingWaterSplit?: number` to `EngineWorld`; remove `pendingTelemetry`; add `simSpeedMult` and `isLampOn`**

- [ ] **Step 4: Implement `computeEnvTargets` and `updateEnvironment` in `environment.ts`** (spec lines 3174–3213)

Per frame with `speedMult = simSpeedMult(timeSpeed)`, `fs = frameScale(dtMs)`, `k = 0.004 * speedMult * fs`: humidity eases to `min(99, humTarget + mistBoost)` with `k`; temperature `k*0.6`; soilMoisture to `min(98, moistTarget)` with `k*0.5`; condensation `k*0.7`; o2 `k`; nutrients add `(-0.00025*flora + 0.0003*min(4,crew)*(leaflitter>1 ? 1 : 0.4)) * speedMult * fs`, clamp 15–100; cycle advance `0.000004*speedMult*(pumpFlow==='off' ? 0.4 : 1)*fs` only when `hasPool(waterSplit)` and `< 1`, toast on reaching 1. Crew = fauna with `cleansMold` (reuse `countCleanupCrew`). Mold bloom timer stays in Task 8.

- [ ] **Step 5: Rewrite `pushTelemetry` and delete `bumpTelemetry`**

`setTelemetry({ humidity, temperature, soilMoisture, nutrients, o2Balance: env.o2, condensation, moldCount, cleanupCrewCount, careIssues: world.careIssues })`; call `store.setCycleProgress(env.cycleProgress)` when it differs; flush `pendingWaterSplit`.

- [ ] **Step 6: Wire `tick`**

Increment `world.frame`. Order inside `timeSpeed !== 0`: pour/siphon, `advanceClock`, `updateEnvironment(world, store, dtMs, deps.onToast)`, `updateFauna`, motes, `updateGrowth`, `updateMold`. Then `syncChildren`, fireflies, `stepPourParticles`, `pushTelemetry`.

- [ ] **Step 7: Seed `env` in `useTerrariumEngine`**

On mount copy store telemetry + `cycleProgress` into `world.env` (o2Balance → o2) and pass `onToast: showToast` and `onCue: play` to `tick`.

- [ ] **Step 8: Run the suite**

Run: `pnpm typecheck && pnpm test`
Expected: PASS. `interaction.test.ts` mist assertions will be adjusted in Task 6; if they fail here, mark them `it.todo` with a note referencing Task 6.

- [ ] **Step 9: Commit**

```bash
git add src/engine src/hooks tests/unit/engine
git commit -m "feat(sim): v6 environment model with temperature, condensation and nitrogen cycle"
```

---

### Task 5: Care report, ideal ranges and care actions

**Files:**
- Modify: `src/engine/care.ts` (replace the Task 2 stub)
- Modify: `src/engine/simulation/tick.ts` (compute report every 30 frames)
- Test: `tests/unit/engine/care.test.ts`, `tests/unit/engine/simulation/simulation.test.ts`

**Interfaces:**
- Consumes: `poolHasWater`, `hasPool` (Task 3); `EnvState`, `world.frame`, `world.careIssues` (Task 4); store actions (Task 2); `CareIssue`, `CareActionId` (Task 2 stub).
- Produces:
  - `CYCLE_DAYS = 21`
  - `cycleChemistry(p: number): { nh3: number; no2: number }`
  - `cycleDay(p: number): number` (`Math.max(1, Math.ceil(p * CYCLE_DAYS))`)
  - `idealRange(items: readonly PlacedItem[], key: 'hum' | 'temp'): { lo: number; hi: number; conflict?: boolean; names?: { lo: string; hi: string } }`
  - `type CareInputs = Pick<StudioState,'hasLid'|'hasFogger'|'pumpFlow'|'vessel'|'waterSplit'|'substrates'> & { items: readonly PlacedItem[]; humidity; temperature; soilMoisture; nutrients; condensation; cycleProgress }`
  - `computeCareReport(input: CareInputs): CareIssue[]`
  - `runCareAction(world: EngineWorld, store: StudioStore, id: CareActionId): string` (returns the toast text)

- [ ] **Step 1: Write the failing tests**

```ts
const item = (id: string) => ({ uid: id, id, category: findCatalogDef(id)!.category }) as PlacedItem
const inputs = (over: Partial<CareInputs>): CareInputs => ({ items: [], humidity: 80, temperature: 24, soilMoisture: 70, nutrients: 80, condensation: 0, hasLid: true, hasFogger: true, pumpFlow: 'gentle', vessel: 'paludarium_tank', waterSplit: 0.32, substrates: DEFAULT_SUBSTRATES, cycleProgress: 1, ...over })
it('cycleChemistry peaks per the gaussians and is 0 when cycled', () => {
  expect(cycleChemistry(1)).toEqual({ nh3: 0, no2: 0 })
  expect(cycleChemistry(0.3).nh3).toBeCloseTo(3.5, 5); expect(cycleChemistry(0.62).no2).toBeCloseTo(2.5, 5)
})
it('idealRange intersects and flags conflicts', () => {          // Review Focus 4
  expect(idealRange([], 'hum')).toEqual({ lo: 60, hi: 90 }); expect(idealRange([], 'temp')).toEqual({ lo: 20, hi: 28 })
  expect(idealRange([item('peacock_fern'), item('fittonia')], 'hum')).toEqual({ lo: 65, hi: 92 })
  expect(idealRange([item('echeveria'), item('peacock_fern')], 'hum')).toMatchObject({ lo: 55, hi: 65, conflict: true, names: { lo: 'Blue Peacock Fern', hi: 'Rosette Succulent' } })
})
it('humidity too high suggests cracking the lid, else fogger off', () => {
  const [w] = computeCareReport(inputs({ items: [item('tree_frog')], humidity: 90 }))
  expect(w).toEqual({ level: 'warn', species: ['tree_frog'], text: 'Red-Eyed Tree Frog prefers 50–85% humidity; the air is at 90%.', action: { id: 'openLid', label: 'Crack the lid open' } })
  expect(computeCareReport(inputs({ items: [item('tree_frog')], humidity: 90, hasLid: false }))[0].action).toEqual({ id: 'fogOff', label: 'Turn the fogger off' })
})
it('humidity too low suggests sealing the lid, else misting', () => {
  expect(computeCareReport(inputs({ items: [item('vampire_crab')], humidity: 60, hasLid: false }))[0]).toMatchObject({ text: 'Vampire Crab needs 75–100% humidity; the air is at 60%.', action: { id: 'closeLid', label: 'Seal the lid' } })
  expect(computeCareReport(inputs({ items: [item('vampire_crab')], humidity: 60 }))[0].action).toEqual({ id: 'mist', label: 'Mist now' })
})
it('temperature warnings', () => {
  const r = computeCareReport(inputs({ items: [item('tree_frog')], humidity: 70, temperature: 27.5 }))
  expect(r).toContainEqual({ level: 'warn', species: ['tree_frog'], text: "Red-Eyed Tree Frog does best at 20–26 °C; it's 27.5 °C.", action: { id: 'openLid', label: 'Vent the heat' } })
  expect(computeCareReport(inputs({ items: [item('tree_frog')], humidity: 70, temperature: 18 }))).toContainEqual({ level: 'info', species: ['tree_frog'], text: "Red-Eyed Tree Frog does best at 20–26 °C; it's 18.0 °C tonight." })
})
it('vampire crab predation and pool needs', () => {
  const r = computeCareReport(inputs({ items: [item('vampire_crab'), item('medaka_fish'), item('garden_snail')] }))
  expect(r).toContainEqual({ level: 'warn', species: ['vampire_crab','medaka_fish','garden_snail'], text: 'Vampire crabs tend to catch Golden Medaka Fish and Amber Glass Snail. Small shrimp usually coexist; keep the others in another build.' })
  expect(computeCareReport(inputs({ items: [item('vampire_crab')], waterSplit: 0 }))).toContainEqual({ level: 'warn', species: ['vampire_crab'], text: 'Vampire crabs need a pool to molt and drink.', action: { id: 'widenPool', label: 'Add a pool' } })
})
it('aquatic fauna: no water, cycling, pump rules', () => {       // Review Focus 1
  expect(computeCareReport(inputs({ items: [item('cherry_shrimp')], waterSplit: 0 }))).toContainEqual({ level: 'warn', species: ['cherry_shrimp'], text: 'Fish and shrimp need open water.', action: { id: 'widenPool', label: 'Add a pool' } })
  expect(computeCareReport(inputs({ items: [item('cherry_shrimp')], cycleProgress: 0.3 }))).toContainEqual({ level: 'info', species: ['cherry_shrimp'], text: 'The pool is still cycling (day 7 of ~21). Fish and shrimp do best once ammonia and nitrite read 0.' })
  expect(computeCareReport(inputs({ items: [item('cherry_shrimp')], pumpFlow: 'strong' }))).toContainEqual({ level: 'warn', species: ['tree_frog','cherry_shrimp'], text: 'Strong flow stresses frogs and shrimp. Keep the waterfall gentle.', action: { id: 'pumpGentle', label: 'Set pump to gentle' } })
  expect(computeCareReport(inputs({ items: [item('medaka_fish')], pumpFlow: 'off' }))).toContainEqual({ level: 'warn', species: ['medaka_fish'], text: 'Still water goes stale without the pump.', action: { id: 'pumpGentle', label: 'Run the pump' } })
})
it('tree frog in a small vessel, fogged glass, dry soil, low nutrients', () => {
  expect(computeCareReport(inputs({ items: [item('tree_frog')], humidity: 70, vessel: 'globe' }))).toContainEqual({ level: 'info', species: ['tree_frog'], text: 'Tree frogs need height to climb. The Paludarium Tank or Zen Cylinder suits them.' })
  expect(computeCareReport(inputs({ humidity: 95, condensation: 0.9 }))).toContainEqual({ level: 'warn', text: 'The glass has stayed fogged over. That means too wet; vent it for a while.', action: { id: 'openLid', label: 'Crack the lid open' } })
  expect(computeCareReport(inputs({ soilMoisture: 40 }))).toContainEqual({ level: 'warn', text: 'The substrate is drying out and the moss looks pale.', action: { id: 'mist', label: 'Mist now' } })
  expect(computeCareReport(inputs({ nutrients: 30 }))).toContainEqual({ level: 'info', text: 'Nutrients are running low for this many plants.', action: { id: 'feed', label: 'Add bio-feed' } })
})
it('runCareAction mutates world env and store and returns the toast', () => {
  const store = createStudioStore(memoryStorage); const w = createWorld(); w.env.mistBoost = 20
  expect(runCareAction(w, store.getState(), 'mist')).toBe('Misted the plants'); expect(w.env.mistBoost).toBe(25); expect(w.env.soilMoisture).toBe(78)
  expect(runCareAction(w, store.getState(), 'openLid')).toBe('Lid cracked open to vent moisture'); expect(store.getState().hasLid).toBe(false)
  expect(runCareAction(w, store.getState(), 'closeLid')).toBe('Lid sealed; humidity will rise')
  expect(runCareAction(w, store.getState(), 'fogOff')).toBe('Fogger off'); expect(store.getState().hasFogger).toBe(false)
  expect(runCareAction(w, store.getState(), 'pumpGentle')).toBe('Pump set to gentle flow')
  w.env.nutrients = 90; expect(runCareAction(w, store.getState(), 'feed')).toBe('Added organic bio-feed'); expect(w.env.nutrients).toBe(100)
  store.getState().setWaterSplit(0); store.getState().setSubstrate('water', 10)
  expect(runCareAction(w, store.getState(), 'widenPool')).toBe('Added a pool. New water cycles for about 3 weeks.')
  expect(store.getState()).toMatchObject({ waterSplit: 0.3, substrates: expect.objectContaining({ water: 40 }), cycleProgress: 0 }); expect(w.env.cycleProgress).toBe(0)
})
// simulation.test.ts
it('tick refreshes the care report every 30 frames', () => {
  const store = createStudioStore(memoryStorage); const w = createWorld(); w.env.humidity = 95
  w.items = [item('tree_frog')]
  for (let i = 0; i < 30; i++) tick(w, 1000 / 60, i * 16, { store: store.getState() })
  expect(w.careIssues.some((c) => c.text.startsWith('Red-Eyed Tree Frog prefers'))).toBe(true)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run tests/unit/engine/care.test.ts`
Expected: FAIL (functions not exported).

- [ ] **Step 3: Implement `src/engine/care.ts`** (spec lines 2907–3020)

Issue order and copy exactly as the spec. Humidity comparisons use `Math.round(humidity)`; temperature text uses `toFixed(1)`. `runCareAction` writes `world.env` for mist/feed/widenPool and calls store actions for the rest; the `feed` chime is played by the UI caller (Task 14) when the action id is `feed`.

- [ ] **Step 4: Compute the report inside the tick**

In `tick.ts`, when `world.frame % 30 === 0` or `timeSpeed === 0`, set `world.careIssues = computeCareReport({ ...store, ...world.env, items: world.items })`.

- [ ] **Step 5: Run the suite and commit**

Run: `pnpm typecheck && pnpm test`
Expected: PASS.

```bash
git add src/engine tests/unit/engine
git commit -m "feat(care): v6 care report, ideal ranges and one-click care actions"
```

---

### Task 6: Item placement and care tools

**Files:**
- Modify: `src/engine/items.ts` (`addItem`, `AddItemOptions`)
- Modify: `src/engine/interaction.ts` (`applyTool`, `ToolEffect`)
- Test: `tests/unit/engine/items.test.ts`, `tests/unit/engine/interaction.test.ts`

**Interfaces:**
- Consumes: geometry (Task 3), `world.env` (Task 4).
- Produces: `interface AddItemOptions { terrain: TerrainInput; x?: number; y?: number; rng?: Rng }`; `addItem(world, defId, stage, opts): PlacedItem`.
- Produces: `applyTool(world, state, tool, nx, ny): ToolEffect` where `ToolEffect = { sound?: AsmrCue; toast?: string }` (no `telemetryDelta`).

- [ ] **Step 1: Write the failing tests**

```ts
// items.test.ts: imports FLORA from '@/data/catalog', DEFAULT_SUBSTRATES, geometry helpers, createWorld, addItem
const terrain = { substrates: DEFAULT_SUBSTRATES, waterSplit: 0.32 }
const fernDef = FLORA.find((f) => f.id === 'peacock_fern')!
let w: EngineWorld
beforeEach(() => { w = createWorld() })

it('water fauna are placed mid-water inside the pool', () => {
  const it = addItem(w, 'cherry_shrimp', 'mature', { terrain, rng: () => 0.5 })
  const d = getDividerNormX(0.32); expect(it.x).toBeGreaterThanOrEqual(0.17); expect(it.x).toBeLessThanOrEqual(d - BANK_W - 0.02)
  expect(it.y).toBeCloseTo((getWaterTopNormY(terrain) + getPoolBedNormY(terrain.substrates)) / 2, 5)
})
it('floating flora sit on the water top; land items sit on the surface', () => {
  expect(addItem(w, 'frogbit_pads', 'mature', { terrain }).y).toBeCloseTo(getWaterTopNormY(terrain), 5)
  const iso = addItem(w, 'isopod', 'mature', { terrain, rng: () => 0 }); expect(iso.y).toBeCloseTo(getSoilSurfaceNormalizedY(terrain, iso.x) - 0.03, 5)
  const fern = addItem(w, 'peacock_fern', 'mature', { terrain, rng: () => 0 }); expect(fern.y).toBeCloseTo(getSoilSurfaceNormalizedY(terrain, fern.x) - 0.05, 5)
})
it('sprouts start at 0.62 scale and 0.2 progress; mature at baseScale, 0.8 and vitality 98', () => {
  const s = addItem(w, 'peacock_fern', 'sprout', { terrain }); expect(s.scale).toBeCloseTo(fernDef.baseScale * 0.62, 5); expect(s.growthProgress).toBe(0.2)
  const m = addItem(w, 'peacock_fern', 'mature', { terrain }); expect(m.scale).toBe(fernDef.baseScale); expect(m.growthProgress).toBe(0.8); expect(m.vitality).toBe(98)
})
// interaction.test.ts: `state` is `createDefaultState()` from '@/store/useStudioStore'
it('mist raises mistBoost by 8 (cap 25) and moisture by 3 (cap 98); boost feeds +8 with chime', () => {
  const state = createDefaultState()
  const w = createWorld(); w.env.mistBoost = 20; w.env.soilMoisture = 97
  expect(applyTool(w, state, 'mist', 0.5, 0.5)).toEqual({ sound: 'mist' }); expect(w.env.mistBoost).toBe(25); expect(w.env.soilMoisture).toBe(98)
  w.env.nutrients = 95; expect(applyTool(w, state, 'boost', 0.5, 0.5)).toEqual({ sound: 'chime' }); expect(w.env.nutrients).toBe(100)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run tests/unit/engine/items.test.ts tests/unit/engine/interaction.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement** (spec `addItemToTerrarium` lines 1759–1800; canvas pointerdown tool branch lines ~3780–3830)

- [ ] **Step 4: Run the suite and commit**

Run: `pnpm typecheck && pnpm test`
Expected: PASS.

```bash
git add src/engine/items.ts src/engine/interaction.ts tests/unit/engine
git commit -m "feat(items): pool-aware placement and env-backed care tools"
```

---

### Task 7: Fauna AI with habitat zones and day/night behaviour

**Files:**
- Modify: `src/engine/simulation/fauna.ts` (whole file)
- Test: `tests/unit/engine/simulation/simulation.test.ts` (fauna block)

**Interfaces:**
- Consumes: geometry (Task 3), `simSpeedMult` (Task 4), `FaunaDef.habitat/nocturnal` (Task 1), `addItem(world, id, stage, { terrain, rng })` (Task 6) in tests.
- Produces: `updateFauna(world, state: Pick<StudioState,'timeSpeed'|'substrates'|'waterSplit'|'lighting'> & { reducedMotion?: boolean }, dtMs, timestamp, rng)`; exports `faunaZone(def: FaunaDef, state: Pick<StudioState,'substrates'|'waterSplit'>, dusky: boolean): { minX: number; maxX: number }`; also floats `floatsOnWater` flora toward `getWaterTopNormY - 0.005` when in the pool.

- [ ] **Step 1: Write the failing tests**

```ts
const st = { timeSpeed: 1, substrates: DEFAULT_SUBSTRATES, waterSplit: 0.32, lighting: 'sunlight' } as const
const terrain = { substrates: st.substrates, waterSplit: st.waterSplit }
it('zones follow the divider', () => {
  const d = getDividerNormX(0.32)
  expect(faunaZone(FAUNA_BY_ID.cherry_shrimp, st, false)).toEqual({ minX: 0.17, maxX: d - BANK_W - 0.01 })
  expect(faunaZone(FAUNA_BY_ID.vampire_crab, st, false)).toEqual({ minX: Math.max(0.17, d - BANK_W - 0.06), maxX: Math.min(0.8, d + 0.05) })
  expect(faunaZone(FAUNA_BY_ID.vampire_crab, st, true)).toEqual({ minX: d - 0.02, maxX: 0.8 })
  expect(faunaZone(FAUNA_BY_ID.isopod, st, false)).toEqual({ minX: d + 0.01, maxX: 0.8 })
  expect(faunaZone(FAUNA_BY_ID.isopod, { ...st, waterSplit: 0 }, false)).toEqual({ minX: 0.2, maxX: 0.8 })
})
it('nocturnal land fauna hide by day and move at dusk', () => {
  const w = createWorld(); const frog = addItem(w, 'tree_frog', 'mature', { terrain, rng: () => 0.5 })
  for (let i = 0; i < 200; i++) updateFauna(w, st, 1000 / 60, i * 16, () => 0.5)
  expect(frog.aiState).toBe('hiding'); expect(frog.vx).toBe(0); expect(frog.zIndex).toBe(0.5)
  expect(frog.y).toBeCloseTo(getSoilSurfaceNormalizedY(terrain, frog.x) - 0.11, 2)
  frog.aiTimer = 0; updateFauna(w, { ...st, lighting: 'twilight' }, 1000 / 60, 0, () => 0.5)
  expect(frog.zIndex).toBe(40); expect(['wandering','resting','foraging','exploring']).toContain(frog.aiState)
})
it('water fauna bob between water top and bed', () => {
  const w = createWorld(); const shrimp = addItem(w, 'cherry_shrimp', 'mature', { terrain, rng: () => 0.5 })
  for (let i = 0; i < 100; i++) updateFauna(w, st, 1000 / 60, i * 16, () => 0.5)
  expect(shrimp.y).toBeGreaterThanOrEqual(getWaterTopNormY(terrain)); expect(shrimp.y).toBeLessThanOrEqual(getPoolBedNormY(terrain.substrates))
})
it('fauna glide back into zone when the pool is removed', () => {     // Review Focus 3
  const w = createWorld(); const shrimp = addItem(w, 'cherry_shrimp', 'mature', { terrain, rng: () => 0.5 }); shrimp.x = 0.2
  let prev = shrimp.x
  for (let i = 0; i < 300; i++) { updateFauna(w, { ...st, waterSplit: 0 }, 1000 / 60, i * 16, () => 0.5); expect(Number.isFinite(shrimp.x)).toBe(true); expect(shrimp.x).toBeGreaterThanOrEqual(prev - 1e-9); prev = shrimp.x }
  expect(shrimp.x).toBeGreaterThanOrEqual(0.2 - 0.01); expect(shrimp.x).toBeLessThanOrEqual(0.8)
})
it('frogbit floats to the water top inside the pool', () => {
  const w = createWorld(); const pad = addItem(w, 'frogbit_pads', 'mature', { terrain, x: 0.2, y: 0.9 })
  for (let i = 0; i < 200; i++) updateFauna(w, st, 1000 / 60, i * 16, () => 0.5)
  expect(pad.y).toBeCloseTo(getWaterTopNormY(terrain) - 0.005, 3)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run tests/unit/engine/simulation/simulation.test.ts -t fauna`
Expected: FAIL.

- [ ] **Step 3: Rewrite `updateFauna`** (spec lines 3229–3281)

Timer decrements by `speedMult * fs`; states `['wandering','resting','foraging','exploring']`; `hiding` when `nocturnal && !dusky && habitat === 'land'`; out-of-zone glide `0.02 * speedMult * fs`; movement `vx * speedMult * fs` with bounce; y eases `0.08 * fs` toward target (water: `top + (bed-top) * (0.5 + 0.28*sin(ts*0.0015 + x*12))`, tree frog by day `surface - 0.11`, else `surface - 0.021*scale`); tree frog `zIndex = dusky ? 40 : 0.5`. Skip dragged items and children. `reducedMotion` zeroes the sine term.

- [ ] **Step 4: Run the suite and commit**

Run: `pnpm typecheck && pnpm test`
Expected: PASS.

```bash
git add src/engine/simulation/fauna.ts tests/unit/engine/simulation
git commit -m "feat(fauna): habitat zones, nocturnal hiding and pool bobbing"
```

---

### Task 8: Growth, vitality, mold bloom and the daily step

**Files:**
- Modify: `src/engine/simulation/growth.ts`
- Modify: `src/engine/simulation/mold.ts`
- Modify: `src/engine/simulation/tick.ts` (pass `deps.onToast` and `rng` into `updateMold`)
- Modify: `src/components/nav/ClockSpeedPill.tsx` (+1 Day handler calls `advanceDay` through `mutateWorld`)
- Test: `tests/unit/engine/simulation/simulation.test.ts`

**Interfaces:**
- Consumes: `world.env` (Task 4), `randomLandX`, `hasPool` (Task 3), `addItem(world, id, stage, { terrain })` (Task 6) in tests.
- Produces: `updateGrowth(world, state: Pick<StudioState,'timeSpeed'>, dtMs)` (vitality reads `world.env.humidity`); `updateMold(world, state: Pick<StudioState,'timeSpeed'|'substrates'|'waterSplit'>, dtMs, rng, onToast?)` (bloom timer + crew eating); `advanceDay(world, store: StudioStore, rng?: Rng): void`; `addSporePatch(world, state: Pick<StudioState,'substrates'|'waterSplit'>, rng)` placing at `randomLandX`.

- [ ] **Step 1: Write the failing tests**

```ts
it('vitality drifts by humidity range', () => {
  const w = createWorld(); const fern = addItem(w, 'peacock_fern', 'mature', { terrain }); fern.vitality = 50
  w.env.humidity = 50; updateGrowth(w, { timeSpeed: 1 }, 1000 / 60); expect(fern.vitality).toBeCloseTo(50 - 0.003, 6)
  w.env.humidity = 80; updateGrowth(w, { timeSpeed: 1 }, 1000 / 60); expect(fern.vitality).toBeCloseTo(50 - 0.003 + 0.004, 6)
  fern.vitality = 30; w.env.humidity = 50; updateGrowth(w, { timeSpeed: 1 }, 1000 / 60); expect(fern.vitality).toBe(30)
})
it('mold bloom fires once when bloomTimer hits 0 and the crew clears it', () => {
  const w = createWorld(); w.env.bloomTimer = 1; const toasts: string[] = []
  updateMold(w, st, 1000 / 60, () => 0.5, (m) => toasts.push(m))
  expect(w.moldPatches).toHaveLength(3); expect(toasts).toEqual(['A little white mold appeared. That is normal in a new build; the springtails will clear it.'])
  updateMold(w, st, 1000 / 60, () => 0.5, (m) => toasts.push(m)); expect(w.moldPatches).toHaveLength(3); expect(toasts).toHaveLength(1)
  addItem(w, 'springtails', 'mature', { terrain }); addItem(w, 'isopod', 'mature', { terrain })
  const before = w.moldPatches[0].size; updateMold(w, st, 1000 / 60, () => 0.5); expect(w.moldPatches[0].size).toBeCloseTo(before - 0.005, 6)
  w.moldPatches[0].size = 3; updateMold(w, st, 1000 / 60, () => 0.5); expect(w.moldPatches).toHaveLength(2)
})
it('+1 Day advances the cycle, feeds mold chance and costs nutrients', () => {   // Review Focus 5
  const store = createStudioStore(memoryStorage); const w = createWorld(); w.env.cycleProgress = 0; w.env.nutrients = 88
  const fern = addItem(w, 'peacock_fern', 'mature', { terrain }); fern.scale = 1.45
  advanceDay(w, store.getState(), () => 0.5)
  expect(store.getState().dayCount).toBe(2); expect(w.env.cycleProgress).toBeCloseTo(1 / 21, 6); expect(w.env.nutrients).toBe(86)
  expect(fern.scale).toBe(1.5); expect(fern.stage).toBe('lush'); expect(w.moldPatches).toHaveLength(1)
  advanceDay(w, store.getState(), () => 0.7); expect(w.moldPatches).toHaveLength(1)
  store.getState().setSetupDay(-10); advanceDay(w, store.getState(), () => 0.1); expect(w.moldPatches).toHaveLength(1)
  const noPool = createStudioStore(memoryStorage); noPool.getState().setWaterSplit(0); const w2 = createWorld()
  advanceDay(w2, noPool.getState(), () => 0.9); expect(w2.env.cycleProgress).toBe(1)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run tests/unit/engine/simulation/simulation.test.ts -t "growth|mold|Day"`
Expected: FAIL.

- [ ] **Step 3: Implement** (spec lines 3214–3228, 3287–3303, 3710–3722)

`advanceDay`: `store.advanceDay()`; flora `scale = min(1.5, scale*1.06)`, `stage 'lush'`; if `hasPool(store.waterSplit)` then `env.cycleProgress = min(1, +1/21)`; if `store.dayCount - store.setupDay <= 3 && rng() < 0.6` push one patch `{ x: randomLandX, size: 9 + rng()*6 }`; `env.nutrients = max(15, nutrients - 2)`. The chime stays in `ClockSpeedPill`. The "pool has cycled" toast is only fired from `updateEnvironment` (Task 4), never from `advanceDay`.

- [ ] **Step 4: Run the suite and commit**

Run: `pnpm typecheck && pnpm test`
Expected: PASS.

```bash
git add src/engine/simulation src/components/nav tests/unit/engine/simulation
git commit -m "feat(sim): vitality drift, new-build mold bloom and v6 daily step"
```

---

### Task 9: Pouring and siphon against the pool

**Files:**
- Modify: `src/engine/simulation/pouring.ts`
- Test: `tests/unit/engine/simulation/simulation.test.ts` (pouring block)

**Interfaces:**
- Consumes: `getDividerNormX`, `BANK_W`, `hasPool`, `LAND_LAYER_IDS`, `world.env`, `world.pendingWaterSplit`, `setEffectiveSubstrate`.
- Produces: `siphonStep(world, state: Pick<StudioState,'substrates'>)`; `stepPourParticles(world, state: Pick<StudioState,'substrates'|'waterSplit'|'timeSpeed'|'reducedMotion'>, dtMs, rng)`; constants `MAX_WATER_MM = 80`, `MAX_GRAVEL_MM = 30`, `MAX_LAND_MM = 60`, `MAX_CONTOUR_MM = 18`, `MAX_SURFACE_GRAINS = 220`.

- [ ] **Step 1: Write the failing tests**

```ts
const landed = (w: EngineWorld, material: string, x: number) => { w.pourParticles = [{ x, y: 0.99, vx: 0, vy: 0.01, r: 3, color: '#000', material }]; }
it('water landing raises water by 0.14 up to 80 and starts a pool when none exists', () => {
  const w = createWorld(); const s = { ...st, waterSplit: 0 }
  landed(w, 'water', 0.5); stepPourParticles(w, s, 1000 / 60, () => 0.5)
  expect(w.pendingSubstrates.water).toBeCloseTo(0.14, 6); expect(w.pendingWaterSplit).toBe(0.3); expect(w.env.cycleProgress).toBe(0)
  const full = createWorld(); landed(full, 'water', 0.5); stepPourParticles(full, { ...st, substrates: { ...st.substrates, water: 80 } }, 1000 / 60, () => 0.5); expect(full.pendingSubstrates.water ?? 0).toBe(0)
})
it('gravel landing left of the divider raises rivergravel by 0.06 up to 30', () => {
  const w = createWorld(); landed(w, 'rivergravel', 0.2); stepPourParticles(w, st, 1000 / 60, () => 0.5); expect(w.pendingSubstrates.rivergravel).toBeCloseTo(0.06, 6)
  const p = createWorld(); landed(p, 'pebbles', 0.2); stepPourParticles(p, st, 1000 / 60, () => 0.5); expect(p.pendingSubstrates.rivergravel).toBeCloseTo(0.06, 6); expect(p.pendingSubstrates.pebbles).toBeUndefined()
})
it('land landing raises its layer by 0.08 up to 60 and bumps the contour', () => {
  const w = createWorld(); landed(w, 'soil', 0.5); stepPourParticles(w, st, 1000 / 60, () => 0.5)
  expect(w.pendingSubstrates.soil).toBeCloseTo(0.08, 6); expect(w.terrainContour[10]).toBeCloseTo(0.22, 6); expect(w.terrainContour[9]).toBeCloseTo(0.11, 6); expect(w.substrateGrains).toHaveLength(1)
  w.terrainContour[10] = 18; landed(w, 'soil', 0.5); stepPourParticles(w, st, 1000 / 60, () => 0.5); expect(w.terrainContour[10]).toBe(18)
})
it('siphon drains water first, then the top land layer', () => {
  const w = createWorld(); siphonStep(w, { substrates: { ...st.substrates, water: 10 } }); expect(w.pendingSubstrates.water).toBeCloseTo(-0.35, 6)
  const dry = createWorld(); dry.substrateGrains = [{ x: 0.5, y: 0.5 } as WorldEntity]
  siphonStep(dry, { substrates: { ...st.substrates, water: 0 } }); expect(dry.pendingSubstrates.leaflitter).toBeCloseTo(-0.25, 6); expect(dry.substrateGrains).toHaveLength(0)
  const noLitter = createWorld(); siphonStep(noLitter, { substrates: { ...st.substrates, water: 0, leaflitter: 0, sand: 0 } }); expect(noLitter.pendingSubstrates.soil).toBeCloseTo(-0.25, 6)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run tests/unit/engine/simulation/simulation.test.ts -t "pour|siphon"`
Expected: FAIL.

- [ ] **Step 3: Implement** (spec lines 3144–3171 and the landing branch of `drawPouringStreams`, lines ~2700–2760)

Particles spawn as today. On landing: water → `setEffectiveSubstrate(... min(80, water + 0.14))`, and if `!hasPool(state.waterSplit)` set `world.pendingWaterSplit = 0.3` and `world.env.cycleProgress = 0`; gravel/pebbles with `x < divider - BANK_W` and a pool → rivergravel `+0.06` cap 30; any other land material → layer `+0.08` cap 60, contour bump, grain push (cap 220). Humidity/moisture bumps are gone (the environment model owns them).

- [ ] **Step 4: Run the suite and commit**

Run: `pnpm typecheck && pnpm test`
Expected: PASS.

```bash
git add src/engine/simulation/pouring.ts tests/unit/engine/simulation
git commit -m "feat(pour): pool-aware landings, caps and siphon order"
```

---

### Task 10: Presets in the engine (Falls Lake and recipes)

**Files:**
- Modify: `src/engine/presets.ts`
- Test: `tests/unit/engine/seeding.test.ts`

**Interfaces:**
- Consumes: `BiomePreset` fields (Task 1), store actions (Task 2), geometry anchors (Task 3).
- Produces: `applyPreset(world, presetId, store: StudioStore): string` (returns the toast); sets vessel/hardware/pumpFlow/waterSplit/cycleProgress (store and `world.env`), substrates, contour, clears grains, `setSetupDay(dayCount)`, `env.bloomTimer = 700` for falls, and for presets with items replaces `world.items` placing each by its `anchor`.

- [ ] **Step 1: Write the failing tests**

```ts
it('falls preset builds the v6 scene', () => {
  const toast = applyPreset(w, 'falls', store.getState())
  expect(toast).toBe('Falls Lake: 30% pool, waterfall and moss wall')
  expect(store.getState()).toMatchObject({ vessel: 'paludarium_tank', pumpFlow: 'gentle', waterSplit: 0.32, cycleProgress: 1, hasLid: true, hasGrowLamp: true, hasFogger: true })
  expect(w.items).toHaveLength(17); expect(w.items.filter((i) => i.category === 'flora').every((i) => i.stage === 'mature' && i.growthProgress === 0.85 && i.vitality === 98)).toBe(true)
  expect(w.terrainContour[15]).toBeCloseTo(Math.max(0, Math.sin(15*0.45)*2.5 + 1.8), 5)
  expect(w.env.bloomTimer).toBe(700)
  const frogbit = w.items.find((i) => i.id === 'frogbit_pads')!; expect(frogbit.y).toBeCloseTo(getWaterTopNormY({ substrates: store.getState().substrates, waterSplit: 0.32, terrainContour: w.terrainContour }), 5)
})
it('desert recipe clears the pool and the fogger', () => {
  expect(applyPreset(w, 'desert', store.getState())).toBe('Arid: open top, sand, no fogger')
  expect(store.getState().waterSplit).toBe(0); expect(store.getState().hasFogger).toBe(false); expect(w.substrateGrains).toHaveLength(0)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run tests/unit/engine/seeding.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `applyPreset`** (spec lines 1698–1757 and 3607–3640). Preset items are built directly, not through `addItem`: the spec sets `growthProgress: 0.85` on them (line 1736) while `addItem` defaults mature flora to `0.8`.

- [ ] **Step 4: Run the suite and commit**

Run: `pnpm typecheck && pnpm test`
Expected: PASS.

```bash
git add src/engine/presets.ts tests/unit/engine/seeding.test.ts
git commit -m "feat(presets): v6 Falls Lake scene and recipe toasts"
```

---

### Task 11: Fauna sprites redrawn to v6

**Files:**
- Modify: `src/engine/sprites/fauna.ts`
- Test: `tests/unit/engine/sprites.test.ts`

**Interfaces:**
- Produces: `FAUNA_SPRITES` entries for all 8 ids drawn per spec `drawFaunaTreeFrog`, `drawFaunaVampireCrab`, `drawFaunaMedaka`, `drawFaunaCherryShrimp`, `drawFaunaIsopod(ctx, 'dairy' | 'ducky')`, `drawFaunaSpringtails`, `drawFaunaSnail` (spec lines ~1260–1480); side profile facing right, feet at `y = +14` on the 128 grid, helpers `fillShape`/`strokeShape` ported into the file.

- [ ] **Step 1: Write the failing test**

```ts
it('isopod variants draw different paths and every fauna sprite paints', () => {
  const a = record((ctx) => FAUNA_SPRITES.isopod(ctx)); const b = record((ctx) => FAUNA_SPRITES.ducky_isopod(ctx))
  expect(a.fillStyles).not.toEqual(b.fillStyles)
  for (const id of FAUNA.map((f) => f.id)) expect(record((ctx) => FAUNA_SPRITES[id](ctx)).calls.filter((c) => c.name === 'fill').length).toBeGreaterThan(3)
})
```

(`record` is `tests/unit/helpers/recordingContext.ts`.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run tests/unit/engine/sprites.test.ts`
Expected: FAIL (identical fill styles).

- [ ] **Step 3: Port the drawings**

- [ ] **Step 4: Run the suite and commit**

Run: `pnpm typecheck && pnpm test`
Expected: PASS.

```bash
git add src/engine/sprites/fauna.ts tests/unit/engine/sprites.test.ts
git commit -m "feat(sprites): v6 fauna drawings"
```

---

### Task 12: Rendering the pool, hardware and glass

**Files:**
- Modify: `src/engine/render/substrates.ts`, `src/engine/render/water.ts`, `src/engine/render/frame.ts`, `src/engine/render/lamp.ts`, `src/engine/render/renderFrame.ts`
- Create: `src/engine/render/condensation.ts`
- Test: `tests/unit/engine/render.test.ts`

**Interfaces:**
- Consumes: geometry (Task 3), `world.env.condensation`, `state.pumpFlow`, `isLampOn`.
- Produces: `drawSubstrates(ctx, world, state, R, ts, phase: 'soil' | 'water')`; `rippleAmplitude(pumpFlow: PumpFlow): number` (`strong 2.8, gentle 1.5, off 0.4`) exported from `water.ts`; `drawCondensation(ctx, world, state, R, ts)` (droplets scaled by `env.condensation`, none below 0.18); `drawLid` draws a cork for `apothecary|wardian|cylinder|teardrop`; `drawLamp` is the gooseneck and lit only when `isLampOn`.

- [ ] **Step 1: Write the failing tests**

```ts
it('ripple amplitude follows the pump', () => { expect([rippleAmplitude('strong'), rippleAmplitude('gentle'), rippleAmplitude('off')]).toEqual([2.8, 1.5, 0.4]) })
it('renders with and without a pool for every vessel and lighting without throwing', () => {
  for (const vessel of Object.keys(VESSELS_BY_ID)) for (const lighting of ['sunlight','twilight','night']) for (const waterSplit of [0.32, 0])
    expect(() => renderFrame(ctx, w, { ...state, vessel, lighting, waterSplit }, 800, 600, 0)).not.toThrow()
  const rec = record((ctx) => drawSubstrates(ctx, w, { ...state, waterSplit: 0 }, R, 0, 'water')); expect(rec.calls.filter((c) => c.name === 'fill')).toHaveLength(0)
})
it('condensation draws nothing below 0.18 and something above', () => {
  w.env.condensation = 0.1; expect(record((ctx) => drawCondensation(ctx, w, state, R, 0)).calls.filter((c) => c.name === 'arc')).toHaveLength(0)
  w.env.condensation = 0.6; expect(record((ctx) => drawCondensation(ctx, w, state, R, 0)).calls.filter((c) => c.name === 'arc').length).toBeGreaterThan(0)
})
it('lid is a cork on jars and absent on the tank', () => {
  expect(record((ctx) => drawLid(ctx, { ...state, vessel: 'apothecary', hasLid: true }, R)).fillStyles.some((f) => /#[0-9a-f]{6}/i.test(String(f)))).toBe(true)
  expect(record((ctx) => drawLid(ctx, { ...state, vessel: 'paludarium_tank', hasLid: true }, R)).calls.filter((c) => c.name === 'fill')).toHaveLength(0)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run tests/unit/engine/render.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement** (spec `drawSubstratesAndLake` lines 2400–2560: land strata clipped at the bank, mesh barrier above pebbles, pool gravel bed, foam divider, surface grains, moss carpet, mold patches; water phase with ripples; condensation lines ~2860–2900; lid/lamp/frame lines ~2300–2398)

Render order in `renderFrame`: background, lamp, clip, substrates('soil'), specimens, substrates('water'), pouring, particles, condensation, restore, rim, front frame, lid.

- [ ] **Step 4: Run the suite and commit**

Run: `pnpm typecheck && pnpm test`
Expected: PASS.

```bash
git add src/engine/render tests/unit/engine/render.test.ts
git commit -m "feat(render): pool bed, bank, pump ripples, condensation and v6 hardware"
```

---

### Task 13: Catalog-side panels (hardware, pool slider, inspector, add-item toasts)

**Files:**
- Modify: `src/components/catalog/HardwareToggles.tsx` → rename to `HardwarePanel.tsx`
- Modify: `src/components/catalog/SubstrateSliders.tsx`, `src/components/catalog/VesselTab.tsx`, `src/components/catalog/BiomeRecipes.tsx`, `src/components/catalog/CatalogGrid.tsx`
- Modify: `src/components/stage/ItemInspector.tsx`
- Modify: `src/components/nav/UtilityActions.tsx` (Biome button uses the returned toast)
- Test: `tests/unit/components/sidebar.test.tsx`

**Interfaces:**
- Consumes: store actions (Task 2), `hasPool`, `applyPreset` toast (Task 10), `computeCareReport` (Task 5), `addItem` (Task 6).
- Produces: `HardwarePanel` with lamp and fogger `role="switch"` buttons (names "Halo LED Lamp", "Mist Fogger") and a pump `role="radiogroup"` labelled "Waterfall pump" with radios "Off", "Gentle", "Strong".
- Produces: `SubstrateSliders` renders land layers top-to-bottom (`[...LAND_LAYER_IDS].reverse()`, max 60), a mesh-barrier note after `charcoal` (copy from spec line 2165), then "Pool width" (0–60, value `Math.round(waterSplit*100)`), "Pool gravel" (max 30) and "Pool water" (max 80). `TotalSubstrateDepth` renders `"{N} mm of land"`; the split label renders "All land" or `"{100-p}% land / {p}% water"`.

- [ ] **Step 1: Write the failing tests**

```tsx
// sidebar.test.tsx (existing helpers: render, screen, within, click, state(), useToastStore)
const set = (partial: Partial<StudioState>) => act(() => useStudioStore.setState(partial))
const toast = () => useToastStore.getState().message

it('hardware copy follows lamp, fogger and pump state', () => {
  render(<LeftSidebar />)
  expect(screen.getByRole('switch', { name: /Halo LED Lamp/ })).toBeChecked()
  expect(screen.getByText('Lit until 20:00')).toBeInTheDocument()
  set({ lighting: 'night' }); expect(screen.getByText('Resting tonight, back on at 05:30')).toBeInTheDocument()
  set({ autoLightSync: false }); expect(screen.getByText('Resting for the night')).toBeInTheDocument()
  set({ hasGrowLamp: false }); expect(screen.getByText('Switched off; plants get room light only')).toBeInTheDocument()
  expect(screen.getByText('Running, about +7% humidity')).toBeInTheDocument()
  click(screen.getByRole('switch', { name: /Mist Fogger/ })); expect(state().hasFogger).toBe(false)
  expect(screen.getByText('Off; air relies on the pool')).toBeInTheDocument()
  const pump = screen.getByRole('radiogroup', { name: 'Waterfall pump' })
  expect(within(pump).getByRole('radio', { name: 'Gentle' })).toBeChecked()
  expect(screen.getByText('Gentle cascade into the pool')).toBeInTheDocument()
  click(within(pump).getByRole('radio', { name: 'Strong' })); expect(state().pumpFlow).toBe('strong')
  expect(screen.getByText('Strong flow; frogs and shrimp dislike it')).toBeInTheDocument()
  click(within(pump).getByRole('radio', { name: 'Off' })); expect(screen.getByText('Still water; it goes stale')).toBeInTheDocument()
  set({ waterSplit: 0 }); expect(screen.getByText('No pool in this build')).toBeInTheDocument()
  expect(within(pump).getByRole('radio', { name: 'Gentle' })).toBeDisabled()
})
it('pool width slider creates a pool with the cycling toast', () => {
  set({ waterSplit: 0, cycleProgress: 1, substrates: { ...DEFAULT_SUBSTRATES, water: 10 } })
  render(<LeftSidebar />)
  fireEvent.change(screen.getByLabelText('Pool width'), { target: { value: '30' } })
  expect(state().waterSplit).toBeCloseTo(0.3, 5); expect(state().cycleProgress).toBe(0); expect(world.env.cycleProgress).toBe(0)
  expect(state().substrates.water).toBe(40)
  expect(toast()).toBe('New pool: it cycles for about 3 weeks before fish and shrimp are safe')
  act(() => state().setCycleProgress(0.5))
  fireEvent.change(screen.getByLabelText('Pool width'), { target: { value: '45' } })
  expect(state().cycleProgress).toBe(0.5)
})
it('sliders list land layers top-down and show the split label', () => {
  render(<LeftSidebar />)
  expect(screen.getAllByRole('slider').map((el) => el.getAttribute('aria-label'))).toEqual([
    'Leaf litter', 'Silica sand', 'Tropical substrate', 'Activated charcoal', 'Drainage layer (LECA)', 'Pool width', 'Pool gravel', 'Pool water',
  ])
  expect(screen.getByText('68% land / 32% water')).toBeInTheDocument()
  expect(screen.getByText('56 mm of land')).toBeInTheDocument()
  set({ waterSplit: 0 }); expect(screen.getByText('All land')).toBeInTheDocument()
})
it('inspector meta copy names plant, animal habitat and hardscape', () => {
  const terrain = { substrates: state().substrates, waterSplit: state().waterSplit }
  const cases: [string, string][] = [
    ['peacock_fern', 'Plant · mature · 98% health'], ['cherry_shrimp', 'Animal · in the pool · wandering'],
    ['vampire_crab', 'Animal · pool and shore · wandering'], ['isopod', 'Animal · on land · wandering'], ['moss_wall', 'Hardscape'],
  ]
  for (const [id, meta] of cases) {
    const it = addItem(world, id, 'mature', { terrain })
    act(() => state().selectItem(it.uid))
    const { unmount } = render(<ItemInspector />)
    expect(screen.getByTestId('insp-meta')).toHaveTextContent(meta)
    unmount()
  }
})
it('adding a species with a matching care issue shows its text as a toast', () => {
  set({ waterSplit: 0 })
  render(<LeftSidebar />)
  click(screen.getByRole('tab', { name: /Fauna/ }))
  click(screen.getByRole('button', { name: /Vampire Crab/ }))
  expect(toast()).toBe('Vampire crabs need a pool to molt and drink.')
})
it('recipe buttons toast the preset message', () => {
  render(<LeftSidebar />)
  click(screen.getByRole('button', { name: /Arid Sand/ }))
  expect(toast()).toBe('Arid: open top, sand, no fogger')
})
```

The existing inspector assertion `'FLORA · MATURE · 98% HEALTH'` and the hardware `aria-pressed` test change to the v6 copy and `role="switch"` / `aria-checked`; the `moss_wall` id above is the hardscape "Living Moss Wall Cliff" card (use its real catalog id).

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run tests/unit/components/sidebar.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement** (spec `syncHardwareButtons` lines 2000–2030, `renderSubstrateSliders` 2152–2240, `updateInspectorUI` ~1960–1999, catalog add toast in `addItemToTerrarium`)

The slider's pool-creation rule: when the previous `waterSplit <= 0.02` and the new one is greater, call `setCycleProgress(0)`, `mutateWorld(w => { w.env.cycleProgress = 0 })`, `setSubstrate('water', Math.max(water, 40))`, and `showToast(...)`.

- [ ] **Step 4: Run the suite and commit**

Run: `pnpm typecheck && pnpm test`
Expected: PASS.

```bash
git add src/components tests/unit/components/sidebar.test.tsx
git commit -m "feat(ui): v6 hardware panel, pool width slider, inspector meta and toasts"
```

---

### Task 14: Telemetry panel v6

**Files:**
- Modify: `src/components/telemetry/GaugeBar.tsx` (band + range props)
- Modify: `src/components/layout/RightTelemetry.tsx`
- Modify: `src/components/telemetry/BotanistNotes.tsx` (note, next-step button, care list)
- Modify: `src/components/telemetry/MicroEcologyPanel.tsx` → rename to `EcoStats.tsx`
- Test: `tests/unit/components/studio.test.tsx`

**Interfaces:**
- Consumes: `telemetry` (Task 2), `idealRange`, `cycleChemistry`, `cycleDay`, `runCareAction` (Task 5), `isLampOn` (Task 4), `hasPool`.
- Produces: `GaugeBar({ icon, label, value, min, max, text, band?: { lo; hi; tol?; conflict? }, hint? })`; renders `data-testid="gauge-{key}"` with `data-in-band="true|false"` and hides the band element when `conflict`.
- Produces: `RightTelemetry` shows gauges humidity (0–100, tol 3), temperature (15–35, tol 1, text `"{t.toFixed(1)} °C"`, hint `"Ideal {lo}–{hi} °C · {toF(t)} °F now"`), moisture (band 55–85), nutrients (band 40–100), o2 (40–100, band lo `isLampOn ? 80 : 55`, hi 100); badge "Thriving" (0 warns) / "Adjusting" (<3) / "Needs care"; footer `"{N} specimens"`.
- Produces: `BotanistNotes` shows the first warn (else first issue) text, else the condensation message; a "Next step" button labelled with `action.label` that calls `runCareAction` through `mutateWorld` and toasts the returned text (plays `chime` for `feed`); a list of all issues.
- Produces: `EcoStats` rows: Glass (`Clear` / `Light fog, clears on its own` / `Heavy fog` / `Fogged over by condensation` at 0.18 / 0.55 / 0.82), Water cycle (`No pool in this build` / `Cycled · ammonia 0 ppm · pump {flow}` / `Cycling, day {d} of ~21 · NH₃ {nh3.toFixed(1)} · NO₂ {no2.toFixed(1)} ppm` plus a progress bar), Mold (`{n} patch` / `{n} patches` / `None`), Crew (`{n} at work` / `None yet`), and the +Spore button.

- [ ] **Step 1: Write the failing tests**

```tsx
it('temperature gauge shows °C text, °F hint and band state', () => {
  // telemetry.temperature 24.5 → getByText('24.5 °C'), getByText('Ideal 20–28 °C · 76.1 °F now'), gauge-temperature data-in-band 'true'; 31 → 'false'
})
it('conflicting ranges hide the band and leave the gauge on', () => {          // Review Focus 4
  // world items echeveria + peacock_fern → gauge-humidity has no band element, data-in-band 'true', value text still rendered
})
it('badge reflects warning count', () => {
  // careIssues 0 warns → 'Thriving'; 2 → 'Adjusting'; 3 → 'Needs care'
})
it('next-step button runs the care action and toasts', () => {
  // careIssues [{ level: 'warn', text: 'x', action: { id: 'openLid', label: 'Crack the lid open' } }] → click 'Crack the lid open' → hasLid false, toast 'Lid cracked open to vent moisture'
})
it('eco stats copy', () => {
  // condensation 0.6 → 'Heavy fog'; cycleProgress 0.3 with pool → 'Cycling, day 7 of ~21 · NH₃ 3.5 · NO₂ 0.0 ppm'; cycled → 'Cycled · ammonia 0 ppm · pump gentle'; waterSplit 0 → 'No pool in this build'; moldCount 1 → '1 patch'; crew 0 → 'None yet'
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run tests/unit/components/studio.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement** (spec `renderTelemetry` lines 3045–3122, `setGauge` 3022–3044, HTML lines ~430–520 for the panel markup)

- [ ] **Step 4: Run the suite and commit**

Run: `pnpm typecheck && pnpm test`
Expected: PASS.

```bash
git add src/components tests/unit/components/studio.test.tsx
git commit -m "feat(ui): v6 telemetry with ideal bands, care report and eco stats"
```

---

### Task 15: End-to-end journey and docs

**Files:**
- Create: `tests/e2e/pool.spec.ts`
- Modify: `tests/e2e/studio.spec.ts` (persistence assertions include pumpFlow/waterSplit)
- Modify: `docs/reference/design-doc.md` (substrate set, pool model, care report sections)

- [ ] **Step 1: Write the e2e spec**

```ts
test('pool width, cycling and the next-step action', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Arid Sand' }).click()
  await expect(page.getByText('No pool in this build')).toBeVisible()
  await page.getByLabel('Pool width').fill('30')
  await expect(page.getByText('New pool: it cycles for about 3 weeks before fish and shrimp are safe')).toBeVisible()
  await expect(page.getByText(/Cycling, day 1 of ~21/)).toBeVisible()
  for (let i = 0; i < 21; i++) await page.getByRole('button', { name: '+1 Day' }).click()
  await expect(page.getByText(/Cycled · ammonia 0 ppm/)).toBeVisible()
  await page.reload()
  await expect(page.getByLabel('Pool width')).toHaveValue('30')
})
```

- [ ] **Step 2: Run it**

Run: `pnpm e2e tests/e2e/pool.spec.ts`
Expected: PASS (fix selectors against the rendered markup if needed; do not change copy).

- [ ] **Step 3: Update `docs/reference/design-doc.md`**

Replace the catalog substrate list, add a "Pool and pump" section (divider, bank, cycle), and a "Care report" section listing the seven actions. Keep the doc's existing structure.

- [ ] **Step 4: Full verification and commit**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm e2e`
Expected: all PASS.

```bash
git add tests/e2e docs/reference/design-doc.md
git commit -m "test(e2e): pool and care journey; docs: v6 design notes"
```
