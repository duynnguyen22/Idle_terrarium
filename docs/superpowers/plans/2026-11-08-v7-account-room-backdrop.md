# v7 Account, Room & Backdrop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the React/Vite port up to the v7 prototype: a sign-in/account dialog with saved terrariums and a growth journal (front-end only, local storage behind a swappable interface), the Room tab (water and air quality), water/air gauges, and the miniature landscape backdrop with depth haze and photo upload.

**Architecture:** Auth and storage are two interfaces (`AuthService`, `GardenBackend`) with local-storage implementations that reproduce the prototype's behaviour exactly, so a real backend later swaps the implementation without touching components. Account state lives in a new unpersisted Zustand store (`useAccountStore`); the per-frame world stays in `EngineWorld`, and a garden "snapshot" is the studio store's persisted slice plus the world snapshot. Room conditions, backdrop and mineral spots are new persisted fields in the studio store (version 3) and a pure `room.ts` model feeds care issues, gauges and the simulation.

**Tech Stack:** React 19, Vite 6, TypeScript ~5.9 (strict), Zustand 5 + persist, Tailwind 4, vitest 5 + @testing-library/react + user-event, Playwright, pnpm. No new runtime dependencies.

**Spec:** `docs/reference/prototype-v7.html` (the v7 single-file prototype, 6449 lines; line numbers below refer to it). Previous plan for conventions: `docs/superpowers/plans/2026-11-07-paludarium-v6.md`.

## Global Constraints

- Package manager is pnpm; no new runtime dependencies. `pnpm typecheck`, `pnpm lint`, `pnpm test` and `pnpm build` pass at every commit. Work on a feature branch off `main`.
- Unit tests live under `tests/unit/**/*.test.{ts,tsx}` (jsdom, globals); e2e under `tests/e2e`.
- `EngineWorld` is never placed in Zustand. Engine modules never import React, audio or stores beyond the existing `StudioStore` type.
- Storage keys verbatim from the spec: `botanica_auth_users_v1`, `botanica_auth_session_v1` (localStorage when "Keep me signed in", else sessionStorage), `botanica_signin_prompt_seen_v1`, `botanica_store_${accountId}`, `botanica_journal_draft` (sessionStorage), `botanica_backdrop_photo_v1`. Studio key stays `botanica_studio_v1`; persist `version` becomes `3`.
- Auth constants: latency 450–800 ms; lockout after 5 failed sign-ins for 60 s; codes are 6 digits, expire after 10 min; resend rate-limit 30 s; session TTL 30 days (remember) / 12 h; `MAX_JOURNAL = 120`; cloud save debounce 2500 ms; `EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/`.
- Demo account seeded on every `getSession()`: `{ id: 'usr_demo', name: 'Demo Gardener', email: 'demo@botanica.app', demoPw: 'terrarium1', verified: true }`. Sign-in `demo@botanica.app` / `terrarium1` must work on a fresh browser.
- Every auth and storage call that the real backend will replace goes through the `AuthService` / `GardenBackend` interfaces; components never touch `localStorage` for account data.
- Room defaults: `{ water: 'tap_treated', tds: 180, ph: 7.2, air: 'clean', purifier: false }`; `backdrop: 'none'`, `backdropHaze: 35` (slider 0–80), `mineralSpots: 0`.
- User-facing copy is copied verbatim from the spec strings quoted in each task (including the curly apostrophes `’` the spec uses).
- Every control keeps an accessible name; radio lists use `role="radiogroup"`/`role="radio"` + `aria-checked`, switches `role="switch"`, the dialog `role="dialog" aria-modal="true" aria-labelledby="acct-title"`.
- Subagents are dispatched on opus/sonnet/haiku with explicit model and effort (never Fable).
- Commits end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

## Review Focus

1. **Sign-in while the local save is unsaved work**: opening a garden must not lose the on-screen build. "What’s on screen now" in onboarding keeps it, and `openGarden` flushes the current garden before loading another. Pinned in Task 8 (`flushes the active garden before opening another`). Not covered: signing in to an account that already has terrariums replaces the local build with the account’s last garden (`beginSession`, as in the spec); keeping or importing that build is a tracked follow-up.
2. **Session that expired while the tab was open**: `watchSession` must end the session, show the sign-in view with "Your session ended. Sign in again to keep saving." and stop the autosave timer; no save may be attempted with a dead session. Pinned in Task 8 (`watchSession ends an expired session`).
3. **Storage quota exceeded during save**: the chip must show "Storage is full" and the toast "Your storage is full. Delete an old terrarium or journal entries.", and the app must keep running. Pinned in Task 8 (`quota_exceeded sets lastError`).
4. **Corrupt or foreign JSON in `botanica_store_*` / `botanica_auth_users_v1`**: both readers fall back to empty records rather than throwing at startup. Pinned in Task 6 and Task 7.
5. **A v2 save hydrated into version 3**: `room`, `backdrop`, `backdropHaze`, `mineralSpots` must take defaults; a `tds` outside 20–600 or a `ph` outside 5.5–8.5 is clamped so the sliders never show an out-of-range thumb. Pinned in Task 1.

---

### Task 1: Room, backdrop and mineral-spot state (store v3)

**Files:**
- Create: `src/engine/room.ts`
- Modify: `src/store/useStudioStore.ts` (state, actions, defaults, partialize, version 3)
- Modify: `src/store/migrations.ts` (v2 → v3)
- Modify: `src/data/types.ts` (export `RoomEnv`, `WaterSourceId`, `AirSourceId`, `BackdropId`)
- Test: `tests/unit/engine/room.test.ts`, `tests/unit/store/migrations.test.ts`, `tests/unit/store/useStudioStore.test.ts`

**Interfaces:**
- Produces (`src/data/types.ts`):
  - `type WaterSourceId = 'tap' | 'tap_treated' | 'filtered' | 'ro' | 'rain'`
  - `type AirSourceId = 'clean' | 'traffic' | 'smoke' | 'voc' | 'aerosol'`
  - `type BackdropId = 'none' | 'karst' | 'terraces' | 'pines' | 'alpine' | 'falls' | 'mesa' | 'custom'`
  - `interface RoomEnv { water: WaterSourceId; tds: number; ph: number; air: AirSourceId; purifier: boolean }`
- Produces (`src/engine/room.ts`, spec 3849–3880):
  - `WATER_SOURCES: Record<WaterSourceId, { name: string; sub: string; chlorine: number; tdsMul?: number; tdsFixed?: number }>` and `AIR_SOURCES: Record<AirSourceId, { name: string; sub: string; score: number; kind: 'none' | 'particles' | 'fumes' | 'toxic' }>` with the spec's names/subtitles verbatim.
  - `interface EnvModel { ws; as; tds: number; ph: number; chlorine: number; airRaw: number; airEff: number; water: number; kind }`
  - `envModel(room: RoomEnv, hasLid: boolean): EnvModel`
  - `qualityWord(v: number): 'Good' | 'Fair' | 'Poor' | 'Harmful'` (≥80, ≥60, ≥40)
  - `qualityTier(v: number): 'good' | 'fair' | 'bad'` (≥80, ≥60, else)
  - `DEFAULT_ROOM: RoomEnv`, `TDS_RANGE = [20, 600]`, `PH_RANGE = [5.5, 8.5]`
- Produces (store): `room: RoomEnv`, `mineralSpots: number`, `backdrop: BackdropId`, `backdropHaze: number`; actions `setRoom(patch: Partial<RoomEnv>)` (clamps tds/ph), `setMineralSpots(v: number)`, `setBackdrop(id: BackdropId)`, `setBackdropHaze(v: number)` (clamp 0–80). All four persisted.

- [ ] **Step 1: Write the failing env-model tests** in `tests/unit/engine/room.test.ts`

```ts
it('defaults score 100 water and 100 air with the lid sealed', () => {
  const m = envModel(DEFAULT_ROOM, true)
  expect(m.water).toBe(100 - 0 - 0 - Math.max(0, Math.abs(7.2 - 7) - 0.5) * 22) // 100
  expect(m.airEff).toBe(100)
})
it('untreated tap water loses 45 points to chlorine', () => {
  expect(envModel({ ...DEFAULT_ROOM, water: 'tap' }, true).water).toBe(55)
})
it('RO fixes tds to 8 and pH to 6.6; rain to 20 and 6.2', () => {
  expect(envModel({ ...DEFAULT_ROOM, water: 'ro' }, true)).toMatchObject({ tds: 8, ph: 6.6 })
  expect(envModel({ ...DEFAULT_ROOM, water: 'rain' }, true)).toMatchObject({ tds: 20, ph: 6.2 })
})
it('a sealed lid keeps out 55% of smoke; a purifier adds 28 for particles', () => {
  expect(envModel({ ...DEFAULT_ROOM, air: 'smoke' }, true).airEff).toBe(Math.round(100 - 58 * 0.45))
  expect(envModel({ ...DEFAULT_ROOM, air: 'smoke' }, false).airEff).toBe(42)
  expect(envModel({ ...DEFAULT_ROOM, air: 'smoke', purifier: true }, false).airEff).toBe(70)
})
it('rain collected in polluted air loses 15 more', () => {
  expect(envModel({ ...DEFAULT_ROOM, water: 'rain', air: 'voc' }, false).water).toBe(
    Math.round(Math.max(5, 100 - 0 - 0 - Math.max(0, Math.abs(6.2 - 7) - 0.5) * 22 - 15)),
  )
})
it('qualityWord thresholds', () => {
  expect([qualityWord(80), qualityWord(79), qualityWord(59), qualityWord(39)]).toEqual(['Good', 'Fair', 'Poor', 'Harmful'])
})
```

(Note: the spec's default room scores `water = 100 - 0 - 0 - 0 = 100`, yet the static markup shows "90"; the computed value wins.)

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm vitest run tests/unit/engine/room.test.ts`
Expected: FAIL, module `@/engine/room` not found.

- [ ] **Step 3: Implement `src/engine/room.ts`** with the formulas from spec 3864–3880 unchanged (purifier bonus: particles +28, none 0, else +10; `airEff = round(100 - (100 - airRaw) * (hasLid ? 0.45 : 1))`; water floor 5, ceiling 100, rounded).

- [ ] **Step 4: Run to verify they pass**

Run: `pnpm vitest run tests/unit/engine/room.test.ts`
Expected: PASS

- [ ] **Step 5: Write the failing store and migration tests**

In `tests/unit/store/migrations.test.ts`:
```ts
it('v2 → v3 adds room, backdrop, haze and mineralSpots defaults', () => {
  const out = migrate({ vessel: 'globe', substrates: {} }, 2) as Record<string, unknown>
  expect(out.room).toEqual({ water: 'tap_treated', tds: 180, ph: 7.2, air: 'clean', purifier: false })
  expect(out).toMatchObject({ backdrop: 'none', backdropHaze: 35, mineralSpots: 0 })
})
it('clamps an out-of-range room on migrate', () => {
  const out = migrate({ room: { water: 'ro', tds: 9000, ph: 2, air: 'clean', purifier: true } }, 3) as { room: RoomEnv }
  expect(out.room).toMatchObject({ tds: 600, ph: 5.5 })
})
```
In `tests/unit/store/useStudioStore.test.ts`:
```ts
it('setRoom clamps tds to 20–600 and ph to 5.5–8.5', () => {
  const s = createStudioStore(new MemoryStorage())
  s.getState().setRoom({ tds: 5, ph: 9 })
  expect(s.getState().room).toMatchObject({ tds: 20, ph: 8.5 })
})
it('setBackdropHaze clamps to 0–80 and persists', () => { /* set 95 → 80; partialize(state).backdropHaze === 80 */ })
```

- [ ] **Step 6: Run to verify they fail**, then implement: add the four fields to `StudioState`/`createDefaultState`/`partialize`, the four actions, bump `version: 3`, and in `migrations.ts` add a `migrateV2toV3(persisted)` step that runs for `version < 3` and a `sanitizeRoom(raw: unknown): RoomEnv` used by both migrate and `setRoom` (unknown water/air ids fall back to defaults).

- [ ] **Step 7: Run the full suite**

Run: `pnpm test && pnpm typecheck`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/engine/room.ts src/data/types.ts src/store tests/unit
git commit -m "feat(room): add room environment model and store v3 fields"
```

---

### Task 2: Room care issues, care actions and simulation effects

**Files:**
- Modify: `src/engine/care.ts` (CareActionId, CareInputs, computeCareReport, runCareAction)
- Modify: `src/engine/simulation/environment.ts` (O₂ uses `airEff`; mineral-spot accumulation)
- Modify: `src/engine/simulation/tick.ts` (pass `room`, `mineralSpots` through; flush mineralSpots to the store via the existing throttle)
- Test: `tests/unit/engine/care.test.ts`, `tests/unit/engine/simulation/environment.test.ts`

**Interfaces:**
- Consumes: `envModel`, `EnvModel` from Task 1.
- Produces:
  - `type CareActionId = ... | 'waterTreat' | 'waterRO' | 'airClean' | 'purifierOn' | 'wipeGlass'`
  - `CareInputs` gains `room: RoomEnv`, `mineralSpots: number`.
  - `envCareIssues(m: EnvModel, room: RoomEnv, hasLid: boolean, mineralSpots: number, has: (id: string) => boolean): CareIssue[]` (spec 3898–3921), appended by `computeCareReport` after the existing issues (`purifier` is read from `room`).
  - `runCareAction` handles the five new ids and returns the toasts `'Water is now dechlorinated'`, `'Misting with RO water now'`, `'Tank moved to a room with clean air'`, `'Air purifier on'`, `'Glass wiped clean'` (spec 5312–5317). They write through `store.setRoom` / `store.setMineralSpots`.

- [ ] **Step 1: Write the failing care tests**

```ts
it('untreated tap water warns and names the sensitive animals', () => {
  const issues = computeCareReport({ ...base, room: { ...DEFAULT_ROOM, water: 'tap' }, items: [shrimp, frog] })
  expect(issues).toContainEqual(expect.objectContaining({
    level: 'warn',
    text: 'Untreated tap water carries chlorine, which harms Cherry shrimp, Tree frog.',
    action: { id: 'waterTreat', label: 'Add dechlorinator' },
  }))
})
it('without animals the chlorine warning says it burns moss tips', () => { /* text ends 'chlorine that burns moss tips.' */ })
it('hard water above 350 ppm warns with the ppm value', () => { /* tds 400 → 'Hard water (400 ppm) leaves white mineral crust on leaves and glass. Mist with RO or rainwater.' action waterRO 'Switch to RO water' */ })
it('aerosol air warns and offers to move the tank', () => { /* action { id: 'airClean', label: 'Move the tank' } */ })
it('particles with lid open offer the purifier, then the lid', () => {
  /* traffic, no purifier, lid open → action purifierOn 'Run the air purifier'; purifier on + lid open → closeLid 'Seal the lid'; purifier on + lid closed → no action */
})
it('mineral spots above 0.35 offer a wipe', () => { /* 'Mineral spots are clouding the glass.' action wipeGlass 'Wipe the glass' */ })
it('runCareAction waterTreat sets the water and returns the toast', () => {
  expect(runCareAction(world, store, 'waterTreat')).toBe('Water is now dechlorinated')
  expect(store.room.water).toBe('tap_treated')
})
```
(Species names come from `findCatalogDef(id).name`; the ids checked are the spec's: `cherry_shrimp, medaka_fish, tree_frog, vampire_crab` for chlorine; `isopod, ducky_isopod, springtails, cherry_shrimp, garden_snail, vampire_crab` for sprays.)

- [ ] **Step 2: Run to verify they fail**, then implement `envCareIssues` and the action branches. The `fumes` branch's action is `null` when the lid is sealed; represent that as `action: undefined`.

- [ ] **Step 3: Write the failing simulation tests**

```ts
it('O2 target scales with airEff (0.55 + 0.45 * airEff/100)', () => { /* compare computeEnvTargets with air 'clean' vs 'aerosol' lid off: lower o2 */ })
it('hard water with the fogger on accrues mineral spots; soft water does not', () => {
  /* tds 500, hasFogger → world.mineralSpots grows by (500-300) * 0.0000004 * speedMult per tick; tds 180 → stays 0; isMisting multiplies by 25; capped at 1 */
})
```

- [ ] **Step 4: Implement**: `EngineWorld` gains `mineralSpots: number` (seeded from the store on mount, flushed back through the existing env-seed throttle as `store.setMineralSpots(+world.mineralSpots.toFixed(3))`). `computeEnvTargets` takes `airEff` (callers compute `envModel(s.room, s.hasLid)` once per tick). Accumulation formula from spec 5525–5527.

- [ ] **Step 5: Run the suite, commit**

```bash
git commit -am "feat(room): room care issues, care actions and mineral spots in the sim"
```

---

### Task 3: Room tab

**Files:**
- Create: `src/components/catalog/RoomTab.tsx`, `src/components/catalog/EnvOptionList.tsx`
- Modify: `src/components/layout/LeftSidebar.tsx` (`TABS` gains `{ id: 'room', label: 'Room' }` after `fauna`; `ActivePanel` case `'room'`)
- Modify: `src/components/ui/StudioIcons.tsx` (`TabIconName` gains `'room'`; icon = the spec's room tab SVG, find it by `data-tab="room"` near spec line 470–490)
- Modify: `src/index.css` (`.env-opt`, `.env-dot`, `.env-txt`, `.env-list`, `.env-score*`, `.env-track`, `.env-fill[data-q]` from spec 130–160)
- Test: `tests/unit/components/roomTab.test.tsx`

**Interfaces:**
- Consumes: `WATER_SOURCES`, `AIR_SOURCES`, `envModel`, `qualityWord`, `qualityTier`; store `room`, `setRoom`, `hasLid`.
- Produces: `EnvOptionList<T extends string>({ label, options: { id: T; name: string; sub: string }[], value: T, onChange(id: T) })` rendering `role="radiogroup" aria-label={label}` with `role="radio"` buttons (reused by onboarding in Task 12).

Copy (spec 593–646): intro "What surrounds the tank shapes how it grows. Set the water you mist and fill with, and the air in the room."; headings "How the room is treating your tank", "Water you use", "Room air"; score labels "Water quality", "Air quality at the tank" with text `${v} · ${qualityWord(v)}`; notes: water → `'Chlorine present'` if chlorine ≥ 0.9, else `'Hard water'` if tds > 350, else `'Very soft water'` if tds < 80, else `'Safe for misting and the pool'`; air → `'Sealed lid halves what reaches the tank'` / `'Open top: the tank breathes room air'`. Sliders: "Hardness (TDS)" `min 20 max 600 step 10`, value text `${tds} ppm` + `' · hard'` (>350) / `' · very soft'` (<80); "pH" `min 55 max 85 step 1` (store value ×10), text `pH ${ph.toFixed(1)}`; both `disabled` for `ro`/`rain`; note `'${ws.name} sets these for you.'` when fixed else `'Read them from a TDS pen and pH strip.'`. Purifier: `role="switch"` "Air purifier", sub `'HEPA + carbon, running'` / `'Off'` (reuse the `HardwarePanel` row styling). Footer: "A sealed lid keeps out about half of what is in the room air."

- [ ] **Step 1: Write the failing tests**

```ts
it('lists five water sources and five air sources as radios', () => {
  render(<RoomTab />)
  expect(within(screen.getByRole('radiogroup', { name: 'Water source' })).getAllByRole('radio')).toHaveLength(5)
  expect(within(screen.getByRole('radiogroup', { name: 'Room air' })).getAllByRole('radio')).toHaveLength(5)
})
it('choosing RO disables the sliders and shows the fixed note', async () => {
  await user.click(screen.getByRole('radio', { name: /RO or distilled/ }))
  expect(screen.getByLabelText('Hardness (TDS)')).toBeDisabled()
  expect(screen.getByText('RO or distilled sets these for you.')).toBeInTheDocument()
  expect(useStudioStore.getState().room.water).toBe('ro')
})
it('the purifier switch toggles and reads HEPA + carbon, running', async () => { /* aria-checked true, sub text */ })
it('scores read value · word', () => { /* '100 · Good' twice with defaults */ })
it('the Room tab appears in the sidebar after Fauna', () => { /* tabs names order [...,'Fauna','Room'] */ })
```

- [ ] **Step 2: Run to verify they fail**, implement, run to pass.

- [ ] **Step 3: Commit**

```bash
git commit -am "feat(ui): add the Room tab with water and air sources"
```

---

### Task 4: Water & air gauges and mineral-spot rendering

**Files:**
- Modify: `src/components/layout/RightTelemetry.tsx` (two `GaugeBar`s after O₂)
- Modify: `src/engine/render/condensation.ts` (export `drawMineralSpots(ctx, world, state, R, size)`: spec 5768–5780, skipped for `vessel === 'globe'` or `mineralSpots <= 0.03`; called from `renderFrame.ts` right after `drawCondensation`)
- Test: `tests/unit/components/studio.test.tsx`, `tests/unit/engine/render.test.ts`

Gauges (spec 5368–5369): `gaugeKey="water"` label "Water quality", value `m.water`, 0–100, band `{ lo: 70, hi: 100, tol: 0 }`, text `${m.water} · ${qualityWord(m.water)}`, hint `${m.ws.name} · ${m.tds} ppm · pH ${m.ph.toFixed(1)}`; `gaugeKey="air"` label "Air quality", value `m.airEff`, same band, text `${m.airEff} · ${qualityWord(m.airEff)}`, hint `${m.as.name}${purifier ? ' · purifier on' : ''}`. `m` is `envModel(room, hasLid)` from the studio store (no telemetry needed).

- [ ] **Step 1: Write the failing tests**

```ts
it('renders water and air gauges from the room model', () => {
  useStudioStore.setState({ room: { ...DEFAULT_ROOM, water: 'tap' } })
  render(<RightTelemetry />)
  expect(screen.getByTestId('gauge-water')).toHaveAttribute('data-in-band', 'false')
  expect(screen.getByText('55 · Poor')).toBeInTheDocument()
  expect(screen.getByText('Tap water · 180 ppm · pH 7.2')).toBeInTheDocument()
})
it('draws mineral spots only above 0.03 and never on the globe', () => { /* recording context: count ellipse calls */ })
```

- [ ] **Step 2: Implement, run, commit**

```bash
git commit -am "feat(telemetry): water and air quality gauges; mineral spots on the glass"
```

---

### Task 5: Miniature landscape backdrop

**Files:**
- Create: `src/data/backdrops.ts` (`BACKDROPS: { id: BackdropId; name: string }[]` verbatim from spec 3412–3421)
- Create: `src/engine/render/backdrop.ts` (port of `seededRandom`, `ridgeY`, `skyGradient`, `paintBackdrop(g, id, w, h, custom?: HTMLImageElement | null)` spec 3425–3709, and `drawMiniatureBackdrop(ctx, state, R, custom)` spec 3711–3748 with the offscreen cache keyed `${backdrop}|${w}|${h}|${dpr}|${custom?.src.length ?? 0}` and the haze/lighting tints)
- Create: `src/lib/backdropPhoto.ts` (`loadCustomBackdrop(): Promise<HTMLImageElement | null>`, `setCustomBackdropFromFile(file: File): Promise<{ img: HTMLImageElement; toast: string }>` spec 3756–3785: rejects non-images with `'Choose an image file (JPG, PNG or WebP)'`, downsizes to max 1600 px JPEG 0.86, stores under `botanica_backdrop_photo_v1`, toast `'Your photo is now the backdrop'` or `'Backdrop set; it is too large to remember after reload'` on quota error; module-level `getCustomBackdrop()` for the renderer, `subscribeCustomBackdrop(cb)` for React)
- Create: `src/components/catalog/BackdropSection.tsx`
- Modify: `src/components/catalog/VesselTab.tsx` (section between "Enclosure" and "Build recipes"), `src/engine/render/renderFrame.ts` (call right after `beginVesselClip`, before substrates; spec 5716), `src/index.css` (`.bd-tile`, `.bd-img`, `.bd-upload`, `.bd-name` from spec ~115–130)
- Test: `tests/unit/engine/backdrop.test.ts`, `tests/unit/lib/backdropPhoto.test.ts`, `tests/unit/components/backdrop.test.tsx`

Section copy (spec 523–536): h2 "Miniature landscape backdrop"; link "Change photo" (hidden unless a custom photo exists); grid `role="radiogroup" aria-label="Backdrop"`, 4 columns, each tile `role="radio"` with a 144×96 thumbnail (`paintBackdrop` on an offscreen canvas, cached per id; the `none` tile draws the two glass strokes) and the name; the custom tile without a photo shows a camera icon + "Upload" and opens the hidden `<input type="file" accept="image/*">`; "Depth haze" slider `min 0 max 80`, value `${haze}%`, help "More haze pushes the scene further back behind your plants."; the haze row is hidden when `backdrop === 'none'`.

- [ ] **Step 1: Write the failing tests**

```ts
it('paintBackdrop is deterministic per id', () => { /* two recording contexts for 'karst' record identical call lists */ })
it('drawMiniatureBackdrop does nothing for none, and for custom without a photo', () => { /* zero drawImage calls */ })
it('haze 35 at day paints rgba(236, 241, 236, 0.210) over the backdrop; at night rgba(15, 23, 42, 0.193)', () => {})
it('rejects a non-image file with the toast text', async () => {
  await expect(setCustomBackdropFromFile(new File(['x'], 'a.txt', { type: 'text/plain' }))).rejects.toMatchObject({ message: 'Choose an image file (JPG, PNG or WebP)' })
})
it('selecting a tile sets the backdrop and reveals the haze slider', async () => {
  render(<BackdropSection />)
  expect(screen.queryByLabelText('Depth haze')).toBeNull()
  await user.click(screen.getByRole('radio', { name: 'Ha Long karst' }))
  expect(useStudioStore.getState().backdrop).toBe('karst')
  expect(screen.getByLabelText('Depth haze')).toHaveValue('35')
})
it('the custom tile without a photo opens the file input', async () => { /* spy on input.click */ })
```

- [ ] **Step 2: Run to verify they fail**, implement (the six painters are a straight port; keep them in one file `backdropPainters.ts` if `backdrop.ts` passes ~350 lines), run to pass.

- [ ] **Step 3: Commit**

```bash
git commit -am "feat(backdrop): miniature landscape backdrops with depth haze and photo upload"
```

---

### Task 6: Auth service (interface + local implementation)

**Files:**
- Create: `src/auth/types.ts`, `src/auth/AuthError.ts`, `src/auth/passwordStrength.ts`, `src/auth/localAuthService.ts`, `src/auth/index.ts`
- Test: `tests/unit/auth/passwordStrength.test.ts`, `tests/unit/auth/localAuthService.test.ts`

**Interfaces (`src/auth/types.ts`, spec 4023–4240):**
```ts
export interface PublicUser { id: string; name: string; email: string; verified: boolean; provider: string; createdAt: number }
export interface Session { userId: string; email: string; version: number; remember: boolean; createdAt: number; expiresAt: number; device: string }
export type SessionEnd = 'missing' | 'expired' | 'revoked'
export interface SessionCheck { session: Session | null; user: PublicUser | null; ended?: SessionEnd }
export interface AuthService {
  getSession(): SessionCheck
  signIn(i: { email: string; password: string; remember: boolean }): Promise<{ session: Session; user: PublicUser }>
  signUp(i: { name: string; email: string; password: string }): Promise<{ email: string }>
  verifyEmail(i: { email: string; code: string; remember?: boolean }): Promise<{ session: Session; user: PublicUser; isNew: true }>
  resendCode(email: string, purpose?: CodePurpose): Promise<void>
  requestPasswordReset(email: string): Promise<void>
  resetPassword(i: { email: string; code: string; password: string }): Promise<void>
  sendMagicLink(email: string): Promise<void>
  completeMagicLink(email: string): Promise<{ session: Session; user: PublicUser; isNew: boolean }>
  signInWithProvider(provider: string, i: { email: string; name: string }): Promise<{ session: Session; user: PublicUser; isNew: boolean }>
  updateProfile(userId: string, i: { name: string }): Promise<PublicUser>
  changePassword(userId: string, i: { current: string; next: string }): Promise<void>
  signOut(): Promise<void>
  signOutEverywhere(userId: string): Promise<void>
  deleteAccount(userId: string): Promise<void>
  /** Prototype only: the pending code for an email, so the UI can show the "Prototype inbox". */
  devCode(email: string): string | null
}
export type CodePurpose = 'verify' | 'reset' | 'magic'
```
- `AuthError extends Error { code: AuthErrorCode; field?: string; until?: number; email?: string }` with `AuthErrorCode = 'storage' | 'invalid_email' | 'no_account' | 'use_provider' | 'locked' | 'wrong_password' | 'not_verified' | 'invalid_name' | 'weak_password' | 'email_taken' | 'bad_code' | 'code_expired' | 'rate_limited'`.
- `passwordStrength(pw: string): { checks: { length: boolean; letter: boolean; number: boolean }; score: 0 | 1 | 2 | 3 | 4; ok: boolean; label: string }` (spec 4006–4021).
- `createLocalAuthService(opts?: { local?: Storage; session?: Storage; now?: () => number; random?: () => number; latency?: () => Promise<void> }): AuthService`. Defaults: `localStorage`, `sessionStorage`, `Date.now`, `Math.random`, a 450–800 ms wait. Tests pass `latency: () => Promise.resolve()`.
- `src/auth/index.ts` exports `authService: AuthService = createLocalAuthService()` (the swap point for a real backend) plus `EMAIL_RE`, `AUTH_USERS_KEY`, `AUTH_SESSION_KEY`.

- [ ] **Step 1: Write the failing passwordStrength tests**

```ts
it.each([
  ['', 0, 'Too weak', false], ['abcdefgh', 1, 'Weak', false], ['abcdefg1', 1, 'Weak', true],
  ['Abcdefg1', 2, 'Fair', true], ['Abcdefghijk1', 3, 'Good', true], ['Abcdefghijk1!', 4, 'Strong', true],
])('%s → score %i %s ok=%s', (pw, score, label, ok) => {
  expect(passwordStrength(pw)).toMatchObject({ score, label, ok })
})
```

- [ ] **Step 2: Run, fail, implement, pass.**

- [ ] **Step 3: Write the failing auth-service tests** (fake storages, injected `now`)

```ts
it('seeds the demo user on getSession and signs it in', async () => {
  const svc = createLocalAuthService({ local, session, latency: none })
  expect(svc.getSession()).toEqual({ session: null, user: null })
  expect(JSON.parse(local.getItem('botanica_auth_users_v1')!)['demo@botanica.app']).toMatchObject({ id: 'usr_demo', name: 'Demo Gardener', verified: true })
  const r = await svc.signIn({ email: 'Demo@Botanica.app', password: 'terrarium1', remember: true })
  expect(r.user).toMatchObject({ id: 'usr_demo', email: 'demo@botanica.app' })
  expect(local.getItem('botanica_auth_session_v1')).not.toBeNull()
  expect(session.getItem('botanica_auth_session_v1')).toBeNull()
})
it('remember=false stores the session in sessionStorage with a 12 h ttl', async () => { /* expiresAt - createdAt === 12*3600*1000 */ })
it('unknown email → no_account on the email field', async () => {
  await expect(svc.signIn({ email: 'x@y.zz', password: 'a', remember: true })).rejects.toMatchObject({ code: 'no_account', field: 'email', message: 'There’s no account with this email.' })
})
it('5 wrong passwords lock for 60 s with the tries-left message on the way', async () => {
  for (let i = 1; i <= 4; i++) await expect(signInWrong()).rejects.toMatchObject({ code: 'wrong_password', message: `That password isn’t right. ${5 - i} ${5 - i === 1 ? 'try' : 'tries'} left before a short lockout.` })
  await expect(signInWrong()).rejects.toMatchObject({ code: 'locked', until: now() + 60000 })
})
it('signUp requires a strong password and a unique email, then verify issues a session', async () => {
  await expect(svc.signUp({ name: 'A', email: 'a@b.cc', password: 'short' })).rejects.toMatchObject({ code: 'weak_password', field: 'password' })
  await svc.signUp({ name: 'Linh Tran', email: 'a@b.cc', password: 'abcdefg1' })
  await expect(svc.signUp({ name: 'B', email: 'A@B.CC', password: 'abcdefg1' })).rejects.toMatchObject({ code: 'email_taken' })
  const code = svc.devCode('a@b.cc')!
  expect(code).toMatch(/^\d{6}$/)
  await expect(svc.verifyEmail({ email: 'a@b.cc', code: '000000' })).rejects.toMatchObject({ code: 'bad_code' })
  const r = await svc.verifyEmail({ email: 'a@b.cc', code })
  expect(r).toMatchObject({ isNew: true, user: { verified: true, name: 'Linh Tran' } })
})
it('signing in before verifying re-issues a code and throws not_verified with the email', async () => {})
it('codes expire after 10 minutes', async () => { /* advance now by 10*60*1000 + 1 → code_expired */ })
it('resendCode within 30 s is rate_limited', async () => {})
it('requestPasswordReset answers the same for unknown emails and issues a reset code for known ones', async () => {})
it('resetPassword bumps sessionVersion so an existing session reads as revoked', async () => {
  /* sign in demo (remember) → reset demo's password → getSession() → { session: null, user: null, ended: 'revoked' } and storage cleared */
})
it('an expired session reads as expired and is cleared', async () => {})
it('magic link creates a verified user named from the email local part', async () => { /* provider 'email link' */ })
it('signInWithProvider creates the user with the provider name', async () => {})
it('changePassword checks the current password and replaces demoPw', async () => {})
it('signOutEverywhere revokes; deleteAccount removes the user and the session', async () => {})
it('corrupt users JSON is treated as empty', () => { local.setItem('botanica_auth_users_v1', '{nope'); expect(() => svc.getSession()).not.toThrow() })
```

- [ ] **Step 4: Run to verify they fail**, implement `localAuthService.ts` as a direct port of spec 4023–4240 (SHA-256 via `crypto.subtle` with the FNV fallback; `deviceLabel()` from the user agent; `publicUser` shape). Keep the `pending` code map in the closure.

- [ ] **Step 5: Run to pass, commit**

```bash
git add src/auth tests/unit/auth
git commit -m "feat(auth): AuthService interface with a local prototype implementation"
```

---

### Task 7: Garden storage backend (interface + local implementation)

**Files:**
- Create: `src/auth/backend.ts`
- Test: `tests/unit/auth/localBackend.test.ts`

**Interfaces (spec 4242–4296, 4303–4310):**
```ts
export interface GardenSummary { vessel: VesselId; day: number; plants: number; animals: number }
export interface GardenRecord { id: string; name: string; createdAt: number; updatedAt: number; summary: GardenSummary; snapshot: GardenSnapshot | null }
export interface JournalEntry {
  id: string; at: number; day: number; auto: boolean; note: string
  metrics: { humidity: number; temp: number; moisture: number; nutrients: number; water: number; air: number }
  summary: GardenSummary; issues: string[]
}
export interface GardenBackend {
  kind: 'local' | 'cloud'
  getProfile(): Promise<{ activeGardenId?: string }>
  setProfile(p: { activeGardenId?: string }): Promise<void>
  listGardens(): Promise<GardenRecord[]>            // newest updatedAt first
  newGardenId(): string                              // 'g_' + 10 base36 chars
  saveGarden(id: string, body: Omit<GardenRecord, 'id'>): Promise<void>
  renameGarden(id: string, name: string): Promise<void>
  deleteGarden(id: string): Promise<void>            // also drops its journal
  listJournal(gid: string): Promise<JournalEntry[]>  // newest first, max 60
  addJournal(gid: string, entry: Omit<JournalEntry, 'id'>): Promise<void> // keeps the last MAX_JOURNAL
  deleteAll(): Promise<void>
}
export class BackendError extends Error { code: 'quota_exceeded' | 'unavailable' }
export const MAX_JOURNAL = 120
export function createLocalBackend(accountId: string, storage?: Storage): GardenBackend
export let createBackend: (accountId: string) => GardenBackend = createLocalBackend  // swap point
```
`GardenSnapshot` is defined in Task 8 (`src/store/gardenSnapshot.ts`); import it as a type.

- [ ] **Step 1: Write the failing tests**

```ts
it('reads an empty store and lists gardens newest first', async () => {})
it('deleteGarden drops its journal too', async () => {})
it('addJournal keeps only the last 120 entries and listJournal returns 60 newest first', async () => {})
it('a full storage throws BackendError quota_exceeded', async () => { /* storage.setItem throws → rejects.toMatchObject({ code: 'quota_exceeded' }) */ })
it('corrupt JSON reads as an empty store', async () => {})
it('uses the key botanica_store_<accountId>', async () => {})
```

- [ ] **Step 2: Run, fail, implement, pass, commit**

```bash
git commit -am "feat(auth): GardenBackend interface with a local implementation"
```

---

### Task 8: Account store (session, gardens, journal, cloud save)

**Files:**
- Create: `src/store/gardenSnapshot.ts`, `src/store/useAccountStore.ts`
- Modify: `src/store/useStudioStore.ts` (export `PersistedStudio = ReturnType<typeof partialize>`)
- Test: `tests/unit/store/gardenSnapshot.test.ts`, `tests/unit/store/useAccountStore.test.ts`

**Interfaces:**
- `src/store/gardenSnapshot.ts` (spec 1990–2030, 4303–4310):
  - `type GardenSnapshot = PersistedStudio` (vessel, hardware, pump, split, cycle, lighting, day, substrates, envSeed, room, backdrop, backdropHaze, mineralSpots, worldSnapshot, …).
  - `getGardenSnapshot(store: StudioStore, world: EngineWorld | null): GardenSnapshot` — `partialize(store)` with `worldSnapshot: world ? snapshotWorld(world) : store.worldSnapshot`.
  - `applyGardenSnapshot(snapshot: GardenSnapshot, store: StudioStoreHook): void` — `migrate(snapshot, snapshot.version ?? 3)` then `setState` on the studio store, then `restoreWorld(getWorld(), worldSnapshot)` if a world is registered, then `commitWorld()`.
  - `gardenSummary(store: StudioState, items: readonly PlacedItem[]): GardenSummary`.
- `src/store/useAccountStore.ts` (spec 4297–4300, 4333–4580):
```ts
export type AccountPhase = 'checking' | 'signedout' | 'onboarding' | 'cloud'
export type AuthView = 'checking' | 'signin' | 'signup' | 'verify' | 'forgot' | 'reset' | 'resetDone' | 'magicSent' | 'provider' | 'onboarding' | 'account'
export type AccountTab = 'terrariums' | 'journal' | 'profile'
export interface ViewData { email?: string; password?: string; name?: string; code?: string; remember?: boolean; terms?: boolean; provider?: string; gname?: string; start?: 'current' | 'falls' | 'empty'; current?: string; next?: string; confirmEmail?: string; confirmDeleteAccount?: boolean; saved?: 'profile' | 'password'; banner?: { kind: 'info' | 'success' | 'error'; text: string } | null; notice?: string; error?: string | null; fieldErrors?: Record<string, string>; lockedUntil?: number; resendAt?: number }
export interface AccountState {
  phase: AccountPhase; user: PublicUser | null; session: Session | null; backend: GardenBackend | null
  gardens: GardenRecord[]; activeId: string | null; journal: JournalEntry[]
  saveTimer: ReturnType<typeof setTimeout> | null; writing: boolean; pending: boolean; lastSaved: number; lastError: string
  panelOpen: boolean; view: AuthView; viewData: ViewData; tab: AccountTab; confirmDelete: string | null; renaming: string | null; busy: boolean
}
export interface AccountActions {
  initAccount(): Promise<void>; beginSession(user, session, o: { isNew: boolean }): Promise<void>
  endSession(message?: string): Promise<void>; watchSession(): void
  scheduleCloudSave(): void; flushCloudSave(): Promise<void>
  createGarden(kind: 'current' | 'falls' | 'empty', name: string): Promise<GardenRecord>
  openGarden(id: string): Promise<void>; renameGarden(id, name): Promise<void>; deleteGarden(id): Promise<void>
  addJournalEntry(note: string, auto: boolean): Promise<void>; refreshGardens(): Promise<void>; refreshJournal(): Promise<void>
  openPanel(): void; closePanel(): void; openAuth(view: AuthView, data?: ViewData): void; goView(view: AuthView, data?: ViewData): void
  setViewData(patch: ViewData): void; setTab(tab: AccountTab): void; setRenaming(id: string | null): void; setConfirmDelete(id: string | null): void
  run(fn: () => Promise<void>): Promise<void>   // spec 4604–4625: busy flag, AuthError → fieldErrors/error/lockedUntil, not_verified → verify view
  handleCloudError(e: unknown): void
}
export function createAccountStore(deps: { auth: AuthService; createBackend: (id: string) => GardenBackend; studio: StudioStoreHook; getWorld: () => EngineWorld | null; toast: (m: string) => void; now?: () => number; welcomeStorage?: Storage }): UseBoundStore<StoreApi<AccountState & AccountActions>>
export const useAccountStore = createAccountStore({ auth: authService, createBackend, studio: useStudioStore, getWorld: tryGetWorld, toast: showToast })
export function chipStatus(s: AccountState, now: number): { signedIn: boolean; name: string; text: string; q: 'idle' | 'err' | 'busy' | 'ok' }  // spec 4333–4356
export function timeAgo(ts: number, now?: number): string; initialsOf(name: string): string; avatarColor(id: string): string  // spec 4312–4331
```
Behaviour pinned from the spec: `initAccount` → if a session exists `beginSession(isNew:false)`; else phase `signedout`; if `ended` is `expired`/`revoked` open sign-in with the banner `'Your session ended. Sign in again to keep saving.'` / `'You were signed out on this device.'`; else, the first time (`botanica_signin_prompt_seen_v1` not `'1'`, then set it) open sign-up with banner `'Create a free account to keep your terrariums, their progress and a growth journal.'`. `beginSession` → load profile + gardens; `isNew || no gardens` → phase `onboarding` and open the onboarding view; otherwise open the profile's active garden (or the first), apply its snapshot, phase `cloud`, refresh journal. `scheduleCloudSave` debounces 2500 ms and only in phase `cloud`. `flushCloudSave` writes `{ name, createdAt, updatedAt: now, summary, snapshot }`, serialises concurrent calls via `writing`/`pending`, retries `unavailable` after 4–7 s. `createGarden('empty')` clears items/mold/surface grains, sets `dayCount = setupDay = 1`, `cycleProgress = hasPool ? 0 : 1`; `'falls'` sets day 1 and `applyPreset(world, 'falls', store)`; `'current'` keeps the scene; name trimmed to 60 chars or `'My terrarium'`; on success sets `phase: 'cloud'`, `activeId`, the profile's `activeGardenId`, and refreshes gardens + journal. `openGarden` flushes first, applies the snapshot, sets the profile, toasts `` `Opened ${g.name}` ``. `addJournalEntry` only in phase `cloud`; metrics from the telemetry store (`humidity` rounded, `temp` 1 dp, `moisture`, `nutrients` rounded) plus `water`/`air` from `envModel`; `issues` = up to 4 warn texts; toast `'Logged in your growth journal'` when not auto. `endSession` flushes, clears everything, optional toast. `watchSession` in `cloud`/`onboarding` only: no session → `endSession()` and open sign-in with the expiry/revoked banner. `handleCloudError`: `quota_exceeded` → `lastError = 'Storage is full'` + toast `'Your storage is full. Delete an old terrarium or journal entries.'`; otherwise `lastError = 'Not saved yet, retrying'`. `closePanel` is a no-op in phase `onboarding`. `openPanel` with phase `signedout` and view `account`/`checking` → `signin`.

- [ ] **Step 1: Write the failing snapshot tests**

```ts
it('getGardenSnapshot carries the persisted slice plus a fresh world snapshot', () => {})
it('applyGardenSnapshot restores the store and the registered world', () => {})
it('applyGardenSnapshot migrates a v2-shaped snapshot (no room) to defaults', () => {})
```

- [ ] **Step 2: Run, fail, implement `gardenSnapshot.ts`, pass.**

- [ ] **Step 3: Write the failing account-store tests** (fake `auth`, fake `createBackend` over an in-memory `Storage`, fake timers)

```ts
it('initAccount with no session opens sign-up once with the welcome banner, then never again', async () => {})
it('demo sign-in with no gardens enters onboarding; createGarden("current") saves and enters cloud', async () => {
  await store.getState().beginSession(demoUser, demoSession, { isNew: false })
  expect(store.getState().phase).toBe('onboarding')
  const g = await store.getState().createGarden('current', '  Falls  ')
  expect(g.name).toBe('Falls')
  expect(store.getState()).toMatchObject({ phase: 'cloud', activeId: g.id })
  expect(await backend.listGardens()).toHaveLength(1)
})
it('beginSession with gardens opens the profile active garden and applies its snapshot', async () => {})
it('scheduleCloudSave debounces 2500 ms and writes summary + snapshot', async () => {})
it('flushes the active garden before opening another', async () => {
  /* dirty state → openGarden(other) → backend.saveGarden called for the first id before the snapshot of `other` is applied; toast 'Opened Other' */
})
it('watchSession ends an expired session', () => {
  auth.getSession = () => ({ session: null, user: null, ended: 'expired' })
  store.getState().watchSession()
  expect(store.getState()).toMatchObject({ phase: 'signedout', panelOpen: true, view: 'signin', saveTimer: null })
  expect(store.getState().viewData.banner?.text).toBe('Your session ended. Sign in again to keep saving.')
})
it('quota_exceeded sets lastError and toasts', async () => {
  backend.saveGarden = async () => { throw new BackendError('quota_exceeded') }
  await store.getState().flushCloudSave()
  expect(store.getState().lastError).toBe('Storage is full')
  expect(toast).toHaveBeenCalledWith('Your storage is full. Delete an old terrarium or journal entries.')
})
it('addJournalEntry records metrics, trims to 600 chars and toasts unless auto', async () => {})
it('run() maps an AuthError with a field to fieldErrors and clears busy', async () => {})
it('run() on not_verified switches to the verify view with the email and a 30 s resend window', async () => {})
it('closePanel is ignored during onboarding', () => {})
it('chipStatus: checking → "One moment"/"", signedout → "Sign in"/"to save your work", saving → "Saving…", saved → "Saved just now", never saved → "Synced", error → the error text', () => {})
it('timeAgo: 0 → "not saved yet", 5 s → "just now", 45 s → "45 s ago", 3 min, 2 h, older → short date', () => {})
it('initialsOf("Demo Gardener") → "DG"; initialsOf("Linh") → "L"; avatarColor is stable', () => {})
```

- [ ] **Step 4: Run to verify they fail**, implement `useAccountStore.ts` (vanilla `create`, not persisted). Keep the garden-building code (`createGarden`'s scene mutations) inside `mutateWorld`.

- [ ] **Step 5: Run to pass, commit**

```bash
git add src/store tests/unit/store
git commit -m "feat(account): account store with sessions, gardens, journal and debounced saves"
```

---

### Task 9: Account chip, dialog shell and timers

**Files:**
- Create: `src/components/account/AccountChip.tsx`, `src/components/account/AccountDialog.tsx`, `src/components/account/auth/AuthScreen.tsx` (view switch; a `checking` card with `'One moment'` / `'Checking your session…'` and `null` for every other view until Tasks 10–14 add them), `src/hooks/useAccountLifecycle.ts`
- Modify: `src/components/nav/UtilityActions.tsx` (chip rendered first, before Relax; spec 431–436), `src/components/layout/StudioLayout.tsx` (mount `<AccountDialog />` after the toast; call `useAccountLifecycle()`), `src/index.css` (`.acct-chip*`, `.acct-avatar`, `.acct-dot[data-q]`, `.acct-scrim`, `.acct-panel`, `.acct-panel.wide`, `.acct-x`, `.acct-body`, `@keyframes acct-in` from spec 157–230)
- Test: `tests/unit/components/accountChip.test.tsx`, `tests/unit/components/accountDialog.test.tsx`, `tests/unit/hooks/useAccountLifecycle.test.tsx`

**Interfaces:**
- `AccountChip` = `<button id="btn-account" aria-haspopup="dialog" aria-expanded={panelOpen} aria-controls="acct-panel">` with avatar (initials on `avatarColor`), name and status from `chipStatus`, `is-signedout` class when not signed in; re-renders every 30 s (a `useNow(30000)` tick) so "Saved 2 min ago" ages.
- `AccountDialog` = scrim (`id="acct-scrim"`, click closes) + panel (`id="acct-panel" role="dialog" aria-modal="true" aria-labelledby="acct-title"`, class `wide` when the view is `account`), close button `aria-label="Close"` hidden during onboarding, Escape closes (capture + `stopPropagation`, same pattern as `MoreMenu`), focus moves to `[data-autofocus]` on open and back to `#btn-account` on close. Body renders `<AuthScreen view={resolvedView} />` where `resolvedView` follows spec 5121–5122 (`checking` → `'checking'`, `onboarding` → `'onboarding'`, `cloud` → `'account'`, signed out with view `account`/`onboarding` → `'signin'`). `AuthScreen` is a switch filled in by Tasks 10–14; until then unknown views render `null`.
- `useAccountLifecycle()`: on mount `initAccount()`; `setInterval(watchSession, 60000)`; `window` `storage` listener for the two auth keys → `watchSession`; `setInterval` 120000 → `scheduleCloudSave()` when `document.visibilityState === 'visible'` and phase `cloud`; subscribes to the studio store and calls `scheduleCloudSave()` on any persisted change (the React equivalent of the prototype's `saveTerrariumState` hook; compare `partialize` output by reference per key); cleans up on unmount.

- [ ] **Step 1: Write the failing tests**

```ts
it('signed out: dark chip reads Sign in / to save your work and opens the dialog', async () => {
  render(<TopNav />)
  const chip = screen.getByRole('button', { name: /Sign in/ })
  expect(chip).toHaveClass('is-signedout')
  await user.click(chip)
  expect(useAccountStore.getState().panelOpen).toBe(true)
})
it('signed in: shows initials DG, the name and Saved just now', () => {})
it('dialog: Escape and the scrim close it and return focus to the chip', async () => {})
it('dialog: cannot be closed during onboarding and hides the close button', () => {})
it('lifecycle: a studio store change schedules a cloud save; the 60 s tick calls watchSession', () => {})
```

- [ ] **Step 2: Run, fail, implement, pass, commit**

```bash
git commit -am "feat(account): account chip, dialog shell and session lifecycle"
```

---

### Task 10: Shared auth pieces, Sign in, Sign up, Verify

**Files:**
- Create: `src/components/account/auth/AuthPieces.tsx` (`AuthHeader`, `Banner`, `FormError`, `SubmitButton`, `LinkButton`, `Providers`, `Divider`, `ProtoNote`, `ProtoInbox`, `ResendRow`), `AuthField.tsx` (text/email + password with the eye toggle `aria-label="Show password"`/`"Hide password"`), `StrengthBlock.tsx`, `OtpInput.tsx`, `SignInScreen.tsx`, `SignUpScreen.tsx`, `VerifyScreen.tsx`
- Modify: `AuthScreen.tsx` (add the `signin`, `signup`, `verify` cases)
- Modify: `src/index.css` (`.auth-*` classes from spec 230–300)
- Test: `tests/unit/components/auth/pieces.test.tsx`, `signIn.test.tsx`, `signUp.test.tsx`, `verify.test.tsx`

**Interfaces:**
- Fields read/write `viewData[name]` through `setViewData`; errors come from `viewData.fieldErrors[name]` (`aria-invalid`, `aria-describedby` → `auth-${name}-err`). Inputs have `id="auth-${name}"`.
- `OtpInput({ name, onComplete? })`: six `inputmode="numeric"` boxes `aria-label="Digit N"` in a `role="group" aria-label="Verification code"`; paste of 6 digits fills all and focuses the last; Backspace on an empty box moves back; arrow keys move; `onComplete(code)` when 6 digits (spec 4723–4760).
- `ResendRow({ email, purpose })`: `'Didn’t get it? You can send another in N s.'` counting down from `viewData.resendAt`, then `'Didn’t get it? '` + link `'Send it again'` → `resendCode`, banner `` `We sent a new ${purpose === 'magic' ? 'link' : 'code'} to ${email}.` ``.
- `FormError`: lockout banner `'Too many attempts. Try again in N s.'` (`role="alert"`, ticks each second, clears `lockedUntil` at 0), else `viewData.error`.
- `ProtoNote`: `'Prototype sign-in: accounts are kept in this browser and nothing is sent anywhere. Use a made-up password. Try demo@botanica.app / terrarium1.'` (emails in `<b>`). `ProtoInbox({ email, purpose })`: `'Prototype inbox'` + `'Your code is '` + `<b>` code from `authService.devCode(email)`, or `'Your sign-in link is ready.'` for magic; renders nothing when there is no code.
- `Providers({ mode })`: buttons `'Continue with Google'`/`'Continue with Apple'` (`'Sign up with …'` for signup) → `goView('provider', { provider, email })`.

Screen copy (spec 4763–4853):
- Sign in: title `'Welcome back'`, sub `'Sign in to keep your terrariums in sync.'`, divider `'or sign in with email'`, fields Email (`placeholder 'you@example.com'`, `autocomplete email`) and Password (`current-password`), checkbox `'Keep me signed in'` (default checked), link `'Forgot password?'`, submit `'Sign in'` (busy → `'Please wait…'` with spinner), link `'Email me a sign-in link instead'`, foot `'New to Botanica? '` + `'Create an account'`, ProtoNote. On success: `beginSession(isNew:false)`; if phase becomes `cloud`, close and toast `` `Welcome back, ${firstName}` ``.
- Sign up: title `'Create your account'`, sub `'Save your terrariums, track their growth and pick up on any device.'`, divider `'or sign up with email'`, fields `'Your name'` (`placeholder 'Linh Tran'`), Email, Password (`new-password`) + `StrengthBlock` (rules `'At least 8 characters'`, `'A letter'`, `'A number'`; label `'Password strength'` until typed), checkbox `'I agree to the Terms of Service and Privacy Policy'` (unchecked submit → field error `'Accept the terms to continue.'` without calling the service), submit `'Create account'`, foot `'Already have an account? '` + `'Sign in'`. On success → `goView('verify', { email, resendAt: now + 30000, code: '' })`.
- Verify: title `'Check your email'`, text `'Enter the 6-digit code we sent to '` + email + `'. It expires in 10 minutes.'`, `viewData.notice` banner if present, `ProtoInbox`, OTP (auto-submits on 6 digits), submit `'Verify email'`, `ResendRow`, foot link `'Use a different email'` → signup. On success → `beginSession(isNew:true)` (onboarding).

- [ ] **Step 1: Write the failing tests**

```ts
it('OtpInput: pasting 123456 fills every box and calls onComplete', async () => {})
it('OtpInput: Backspace on an empty box focuses and clears the previous one', async () => {})
it('password field eye toggles type and label', async () => {})
it('sign in with demo credentials closes the dialog and toasts Welcome back, Demo', async () => {
  /* fake auth resolving the demo user, fake backend with one garden → phase cloud → panelOpen false, toast called with 'Welcome back, Demo' */
})
it('sign in error on the email field shows under the input and marks it invalid', async () => {
  /* auth rejects no_account → screen.getByText('There’s no account with this email.') with id auth-email-err; input aria-invalid=true */
})
it('lockout shows the countdown alert', async () => { /* rejects locked until now+60000 → role=alert text matches /Too many attempts. Try again in 60 s\./ */ })
it('sign up without accepting the terms does not call the service', async () => {})
it('sign up moves to verify with the email and a resend countdown', async () => {})
it('verify shows the prototype inbox code and auto-submits when complete', async () => {})
it('resend before 30 s shows the countdown text, after it the Send it again link', async () => {})
```

- [ ] **Step 2: Run, fail, implement, pass, commit**

```bash
git commit -am "feat(auth): sign in, sign up and verify screens"
```

---

### Task 11: Forgot, Reset, Reset done, Magic link, Provider screens

**Files:**
- Create: `src/components/account/auth/ForgotScreen.tsx`, `ResetScreen.tsx`, `ResetDoneScreen.tsx`, `MagicSentScreen.tsx`, `ProviderScreen.tsx`
- Modify: `AuthScreen.tsx` (add the five cases)
- Test: `tests/unit/components/auth/recovery.test.tsx`

Copy (spec 4855–4932):
- Forgot: title `'Reset your password'`, sub `'Enter the email you signed up with. We’ll send a code to set a new password.'`, Email field, submit `'Send reset code'`, foot `'Back to sign in'`. Success → `goView('reset', { code: '', password: '', resendAt: now + 30000 })`.
- Reset: title `'Set a new password'`, text `'If an account exists for '` + email + `', a code is on its way.'`, `ProtoInbox(reset)`, label `'Code from the email'` + OTP, field `'New password'` + StrengthBlock, submit `'Update password'`, ResendRow(reset), foot `'Back to sign in'`. Success → `resetDone`.
- Reset done: check mark, title `'Password updated'`, text `'For your security we signed you out on every device. Sign in with your new password.'`, button `'Sign in'` → `goView('signin', { password: '' })`.
- Magic sent: mail mark, title `'Check your inbox'`, text `'We sent a sign-in link to '` + email + `'. It works once and expires in 10 minutes.'`, inbox card `'Prototype inbox'` / `'Botanica: Your sign-in link'` / button `'Open the link'` → `completeMagicLink` → `beginSession(isNew)`; if cloud, close and toast `` `Signed in as ${email}` ``; FormError, ResendRow(magic), foot `'Back to sign in'`.
- Provider: title `` `Continue with ${p}` ``, note `` `In the real app this opens ${p}’s own sign-in window. The prototype stands in for it here: enter the account to use.` ``, fields `` `${p} account email` `` and `'Name on that account'` (hint `'Used only when this creates a new Botanica account.'`), submit `` `Continue with ${p}` ``, foot `'Back'`. Success → `beginSession(isNew)`; if cloud, close and toast `` `Signed in with ${p}` ``.

- [ ] **Step 1: Write the failing tests** (one per screen: renders its title and primary button; the happy path calls the right service method and moves to the next view; the unhappy path shows the error text, e.g. reset with a bad code shows `'That code doesn’t match. Check the email and try again.'` on the `code` field).

- [ ] **Step 2: Run, fail, implement, pass, commit**

```bash
git commit -am "feat(auth): password reset, magic link and provider screens"
```

---

### Task 12: Onboarding and the Terrariums tab

**Files:**
- Create: `src/components/account/auth/OnboardingScreen.tsx`, `src/components/account/AccountScreen.tsx`, `src/components/account/GardensTab.tsx`
- Modify: `AuthScreen.tsx`, `src/index.css` (`.acct-head`, `.acct-big-avatar`, `.acct-tabs`, `.acct-tab`, `.acct-card`, `.acct-row`, `.garden-*`, `.g-btn*`, `.g-badge`, `.acct-foot`, `.acct-muted`, `.acct-verified` from spec 160–228)
- Test: `tests/unit/components/account/onboarding.test.tsx`, `gardens.test.tsx`

Copy (spec 4934–5025):
- Onboarding: title `` `Welcome, ${first}` `` (`'there'` when no name), sub `'Your email is confirmed. Set up your first terrarium; you can add more any time.'`, field `'Name your terrarium'` (`placeholder 'My terrarium'`), `'Start from'` radio list (reuse `EnvOptionList`): `'What’s on screen now'` / `'Keep the build you’ve been working on'`, `'Falls Lake paludarium'` / `'Waterfall, moss wall, pool and a cleanup crew'`, `'An empty tank'` / `'Start from bare substrate'`; default `current`; submit `'Start growing'`. On submit: `createGarden(choice, name || 'My terrarium')` (which enters phase `cloud`), `closePanel()`, toast `` `${name} is saved to your account` ``.
- Account screen: big avatar + `<h2 id="acct-title">` name, email + `'Verified'` pill when verified; `role="tablist"` tabs `'Terrariums'`, `'Journal'`, `'Profile & security'` (switching clears `viewData`); footer `'Saved in this browser (prototype backend)'` (or `'Saved to your account'` for `kind: 'cloud'`) and `'Sign out'` → `authService.signOut()`, `endSession('Signed out')`, `goView('signin', { email, password: '', banner: { kind: 'success', text: 'You’re signed out. Your terrariums are safe in your account.' } })`.
- Terrariums tab: header `'My terrariums'` + `` `${n} saved` ``; rows: name (or `'Untitled'`), meta `` `${vesselName} · day ${day} · ${plants} plants, ${animals} animals · ${timeAgo(updatedAt)}` `` (vessel name from `src/data/vessels.ts`, fallback `'Terrarium'`); actions: active → badge `'Open'`, else button `'Open'`; `'Rename'` → inline input `aria-label="Terrarium name"` (Enter/blur saves ≤60 chars, Escape cancels); `'Delete'` (not on the active one) → `'Delete'` + `'Keep'` confirm, deleting toasts `'Terrarium deleted'`; buttons `'New Falls Lake build'` (name `` `Falls Lake ${n + 1}` ``) and `'New empty tank'` (`` `Terrarium ${n + 1}` ``), both toast `'New terrarium started'`.

- [ ] **Step 1: Write the failing tests**

```ts
it('onboarding defaults to "What’s on screen now" and saves with the typed name', async () => {})
it('onboarding with an empty name saves "My terrarium" and toasts the saved message', async () => {})
it('gardens tab lists saved terrariums with their meta line and marks the open one', () => {})
it('Open loads another garden; Delete asks Keep/Delete and toasts Terrarium deleted', async () => {})
it('Rename saves on Enter and cancels on Escape', async () => {})
it('Sign out ends the session and shows the success banner on sign in', async () => {})
```

- [ ] **Step 2: Run, fail, implement, pass, commit**

```bash
git commit -am "feat(account): onboarding and the Terrariums tab"
```

---

### Task 13: Journal tab and the +1 day auto entry

**Files:**
- Create: `src/components/account/JournalTab.tsx`
- Modify: `src/components/nav/ClockSpeedPill.tsx` (`plusDay` → after `advanceDay`, `useAccountStore.getState().addJournalEntry('', true)`; spec 5250)
- Modify: `src/index.css` (`.journal-*`, `.j-chip[data-q]` from spec 205–219)
- Test: `tests/unit/components/account/journal.test.tsx`, `tests/unit/components/studio.test.tsx`

Copy (spec 5027–5056): heading `` `Growth journal${active ? ` · ${active.name}` : ''}` ``; note `'An entry is added each time you press “+1 day”. Add notes about what you see.'`; textarea `aria-label="Journal note"`, `maxlength 600`, placeholder `'New fern frond unfurling, springtails busy near the waterfall…'`, draft kept in `sessionStorage['botanica_journal_draft']` while typing and cleared on `'Log today'`; `'No entries yet.'` when empty; each entry: `` `Day ${day}` ``, local date-time (`month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'`), the note, chips `` `${humidity}% RH` ``, `` `${temp} °C` ``, `` `Water ${water}` `` and `` `Air ${air}` `` (with `data-q` from `qualityTier`), `` `${plants} plants` ``, then each warn issue text.

- [ ] **Step 1: Write the failing tests**

```ts
it('Log today adds an entry with the note, clears the draft and toasts', async () => {})
it('entries show day, chips with quality tiers and warn issues', () => {})
it('the draft survives a re-render through sessionStorage', async () => {})
it('+Day writes an automatic journal entry when signed in, and nothing when signed out', () => {})
```

- [ ] **Step 2: Run, fail, implement, pass, commit**

```bash
git commit -am "feat(account): growth journal with automatic entries on +1 day"
```

---

### Task 14: Profile & security tab

**Files:**
- Create: `src/components/account/ProfileTab.tsx`
- Modify: `src/index.css` (`.acct-static`, `.acct-ok`, `.danger-zone`, `.g-btn.danger`, `.g-btn.danger-outline`)
- Test: `tests/unit/components/account/profile.test.tsx`

Copy (spec 5058–5115):
- Profile card: `'Profile'`, field `'Display name'` (prefilled), static `'Email'` + `'Verified'` pill, `'Save profile'` → `updateProfile`, shows `'Saved'`.
- Password card (provider `password` only): `'Password'`, fields `'Current password'`, `'New password'` + StrengthBlock, `'Change password'` → shows `'Password changed'`; other providers show `` `You sign in with ${provider}, so there’s no Botanica password to manage.` ``.
- Sessions card: `'Where you’re signed in'`, row device label, `` `This device · signed in ${timeAgo(createdAt)} · ${remember ? 'stays signed in for 30 days' : 'until you close the browser'}` ``, badge `'Current'`, button `'Sign out of all devices'` → `signOutEverywhere`, `endSession('Signed out of every device')`, sign-in banner `'You’re signed out everywhere. Sign in again on the devices you use.'`.
- Danger zone: `'Delete account'`, `'This removes your account, every terrarium and every journal entry. It can’t be undone.'`, button `'Delete account…'` → field `` `Type ${email} to confirm` `` + `'Delete my account'` / `'Cancel'`; mismatch → field error `'That doesn’t match your email.'`; match → `backend.deleteAll()`, `deleteAccount`, `endSession('Account deleted')`, `goView('signup', { banner: { kind: 'info', text: 'Your account and its data were deleted.' } })`.

- [ ] **Step 1: Write the failing tests** (save profile updates the chip name; wrong current password shows `'Your current password isn’t right.'` on the `current` field; delete requires the exact email, case-insensitive; sign out everywhere ends the session with the banner).

- [ ] **Step 2: Run, fail, implement, pass, commit**

```bash
git commit -am "feat(account): profile and security tab"
```

---

### Task 15: End-to-end demo flow and docs

**Files:**
- Create: `tests/e2e/account.spec.ts`, `tests/e2e/room.spec.ts`
- Modify: `README.md` (short "Accounts (prototype)" section: demo credentials, storage keys, and that `src/auth/index.ts` + `createBackend` are the swap points for the real backend)

- [ ] **Step 1: Write the e2e specs**

```ts
test('first visit prompts to create an account; demo sign-in reaches onboarding and saves a garden', async ({ page }) => {
  await page.goto('/')
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'Create your account' })).toBeVisible()
  await dialog.getByRole('button', { name: 'Sign in' }).click()
  await dialog.getByLabel('Email').fill('demo@botanica.app')
  await dialog.getByLabel('Password', { exact: true }).fill('terrarium1')
  await dialog.getByRole('button', { name: 'Sign in' }).click()
  await expect(dialog.getByRole('heading', { name: 'Welcome, Demo' })).toBeVisible()
  await dialog.getByRole('button', { name: 'Start growing' }).click()
  await expect(page.getByRole('status')).toHaveText('My terrarium is saved to your account')
  await expect(page.getByRole('button', { name: /Demo Gardener/ })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('button', { name: /Demo Gardener/ })).toBeVisible()   // session kept, no dialog
  await expect(page.getByRole('dialog')).toHaveCount(0)
})
test('+Day adds a journal entry visible in the Journal tab', async ({ page }) => {})
test('Room tab: switching to tap water lowers the water gauge and offers a dechlorinator fix', async ({ page }) => {})
```

- [ ] **Step 2: Run** `pnpm e2e` — Expected: PASS. Then `pnpm lint && pnpm typecheck && pnpm test && pnpm build`.

- [ ] **Step 3: Commit**

```bash
git commit -am "test(e2e): demo account flow and room tab; document the prototype auth swap points"
```
