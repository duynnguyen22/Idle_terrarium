# v7 Rectangular Tanks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the three rectangular tanks the port is missing (Front-Opening Vivarium, Rimless Landscape, Long Riparium) with the prototype's horizontal scale factor, picker order, preview icons and per-tank glass frames.

**Architecture:** The prototype scales every rectangular tank horizontally by a per-vessel factor `kx` (`KX` in the spec) and keeps normalized item coordinates spanning the full scaled width. The port keeps that invariant by making the vessel `Rect` non-square: `w = 2r·kx`, `h = 2r`, with `vesselMetrics` deriving the radius from the height and exposing `kx = R.w / R.h`. Painters that already map normalized x through `R.x + nx * R.w` need no change; painters that use the radius on the horizontal axis switch to the rect's width or multiply by `kx`. Vessel data carries the spec's `kx`, `rect`, `doors`, `low` flags.

**Tech Stack:** React 19, Vite 6, TypeScript ~5.9 (strict), Zustand 5 + persist, Tailwind 4, vitest + @testing-library/react, Playwright, pnpm. No new runtime dependencies.

**Spec:** `docs/reference/prototype-v7.html` (line numbers below refer to it). Vessel table 845–896; sizing 1966–1970; preview icons 2302–2335; picker order 2370; vessel path 2721–2729; frame 5149–5207; lid gate 5796; base board 5700; inner tint and lamp cone 5713–5725; backdrop size 3714; lamp puck 2780; sprite placement 3255–3269; pointer mapping 6248; hit test 6291; snap 6339–6348.

## Global Constraints

- Package manager is pnpm; no new runtime dependencies. `pnpm typecheck`, `pnpm lint` (only the pre-existing LineIcon warning), `pnpm vitest run tests/unit`, `pnpm build` and `pnpm e2e` pass at every commit. Work on the current branch `feat/v7-account-room-backdrop`.
- Unit tests live under `tests/unit/**/*.test.{ts,tsx}` (jsdom, globals); e2e under `tests/e2e` (shared helper `dismissWelcomePrompt` in `tests/e2e/helpers.ts`).
- `EngineWorld` is never placed in Zustand. Engine modules never import React, audio or stores beyond the existing `StudioStore` type.
- Vessel ids, names, descriptions and numbers verbatim from spec 845–893: `vivarium_front` "Front-Opening Vivarium" "60 × 45 cm, hinged doors" evap 0.60 kx 1.55 rect doors; `rimless_landscape` "Rimless Landscape" "90 × 45 cm aquascape" evap 0.65 kx 2.0 rect; `riparium_long` "Long Riparium" "120 × 40 cm shoreline" evap 0.70 kx 2.6 rect low.
- Normalized item coordinates stay `0..1` across the full scaled width (spec 3269, 6248); saved gardens and prototype imports need no migration.
- The studio persist version stays 3 (new ids only; no shape change).
- Subagents are dispatched on opus/sonnet/haiku with explicit model and effort (never Fable).
- Commits end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

## Review Focus

1. **A wide tank on a narrow canvas** (phone width, Long Riparium): the rect must fit the canvas width, so the radius formula must divide by `max(1, kx·0.92)` as spec 1968 does. Pinned in Task 2 (`fits a 2.6 tank inside a narrow canvas`).
2. **Tapping an item on a wide tank**: the hit circle is an ellipse in normalized space, so the hit test must scale dx by `kx` (spec 6291) or taps beside an item on a wide tank select it. Pinned in Task 2 (`hit test scales dx by kx`).
3. **Switching from a wide tank back to a jar**: items keep their normalized x (clamped 0.18–0.82 on drag as before), so nothing leaves the glass; the spec does the same. Pinned in Task 3 (`renderFrame draws every vessel with a populated world`).
4. **Lid toggle on a rectangular tank**: the cork lid must not draw on any rect tank (spec 5796 `!isRectTank()`), while the Front-Opening Vivarium shows its own frame, vent strip and doors. Pinned in Task 3 (`no lid on rect tanks`, `vivarium frame draws doors`).
5. **A mounted plant on a wide tank**: the spec snaps at `host.x + ox·0.18` (6342) but then follows the parent at `offsetX / KX` (3255), which makes the child jump on the next tick. The port scales the mount point by `1/kx` at snap time and keeps `syncChildren` unscaled, so snap and follow agree. Pinned in Task 2 (`mount points scale by 1/kx`).

---

### Task 1: Vessel data, previews and picker order

**Files:**
- Modify: `src/data/types.ts` (VesselDef)
- Modify: `src/data/vessels.ts`
- Modify: `src/lib/vesselPreview.ts`
- Modify: `src/components/catalog/VesselGrid.tsx`
- Test: `tests/unit/data/data.test.ts`, `tests/unit/components/sidebar.test.tsx`

**Interfaces:**
- Produces: `VesselDef` gains `kx?: number; rect?: boolean; doors?: boolean; low?: boolean`. `VESSELS` has 9 entries in spec order (paludarium_tank, apothecary, wardian, globe, cylinder, teardrop, vivarium_front, rimless_landscape, riparium_long). New exports in `src/data/vessels.ts`: `export function vesselKX(id: string): number` (the def's `kx` or 1) and `export function isRectTank(id: string): boolean` (`id === 'paludarium_tank' || !!def?.rect`, spec 896). `export const VESSELS_FOR_PICKER: readonly VesselDef[]` is `VESSELS` stably sorted with rect tanks (and paludarium_tank) first (spec 2370), giving paludarium_tank, vivarium_front, rimless_landscape, riparium_long, apothecary, wardian, globe, cylinder, teardrop.

- [ ] **Step 1: Write the failing tests**

In `tests/unit/data/data.test.ts` change the length assertion to 9 and add:

```ts
it('carries the rectangular tank flags from the spec', () => {
  expect(VESSELS_BY_ID.vivarium_front).toMatchObject({ kx: 1.55, rect: true, doors: true, evapMultiplier: 0.6 })
  expect(VESSELS_BY_ID.rimless_landscape).toMatchObject({ kx: 2.0, rect: true, desc: '90 × 45 cm aquascape' })
  expect(VESSELS_BY_ID.riparium_long).toMatchObject({ kx: 2.6, rect: true, low: true, desc: '120 × 40 cm shoreline' })
  expect(vesselKX('riparium_long')).toBe(2.6)
  expect(vesselKX('globe')).toBe(1)
  expect(isRectTank('paludarium_tank')).toBe(true)
  expect(isRectTank('vivarium_front')).toBe(true)
  expect(isRectTank('teardrop')).toBe(false)
})
it('lists rectangular tanks first in the picker, in spec order', () => {
  expect(VESSELS_FOR_PICKER.map((v) => v.id)).toEqual([
    'paludarium_tank', 'vivarium_front', 'rimless_landscape', 'riparium_long',
    'apothecary', 'wardian', 'globe', 'cylinder', 'teardrop',
  ])
})
```

In `tests/unit/components/sidebar.test.tsx` add:

```ts
it('vessel grid shows the nine vessels in picker order and selects a rectangular tank', () => {
  render(<VesselGrid />)
  const names = screen.getAllByRole('button').map((b) => b.textContent)
  expect(names[0]).toContain('Paludarium Tank')
  expect(names[1]).toContain('Front-Opening Vivarium')
  expect(names[3]).toContain('Long Riparium')
  expect(names).toHaveLength(9)
  click(screen.getByRole('button', { name: /Long Riparium/ }))
  expect(state().vessel).toBe('riparium_long')
})
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm vitest run tests/unit/data tests/unit/components/sidebar.test.tsx`
Expected: FAIL (length 6; `vesselKX`, `isRectTank`, `VESSELS_FOR_PICKER` not exported).

- [ ] **Step 3: Implement**

`src/data/types.ts`: add the four optional fields to `VesselDef`.
`src/data/vessels.ts`: append the three entries after `teardrop` with the exact values from Global Constraints; add `vesselKX`, `isRectTank`, `VESSELS_FOR_PICKER` (a copy of `VESSELS` sorted with the spec 2370 comparator, which is stable in V8).
`src/lib/vesselPreview.ts`: add the `vivarium_front`, `rimless_landscape`, `riparium_long` cases with the SVG markup from spec 2311–2333 verbatim (same colour variables as the existing cases).
`src/components/catalog/VesselGrid.tsx`: map over `VESSELS_FOR_PICKER` instead of `VESSELS`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run tests/unit/data tests/unit/components/sidebar.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/types.ts src/data/vessels.ts src/lib/vesselPreview.ts src/components/catalog/VesselGrid.tsx tests/unit/data/data.test.ts tests/unit/components/sidebar.test.tsx
git commit -m "feat(vessels): add the three rectangular tanks with previews and picker order"
```

---

### Task 2: Scaled vessel rect, pointer mapping, hit test and snapping

**Files:**
- Modify: `src/engine/render/renderFrame.ts` (`computeVesselRect`)
- Modify: `src/engine/render/metrics.ts` (`vesselMetrics`)
- Modify: `src/engine/geometry.ts` (`traceVesselPath`)
- Modify: `src/engine/interaction.ts` (`hitTest`, the drag/snap function that sets `item.offsetX`)
- Modify: `src/hooks/useTerrariumEngine.ts:101`, `src/components/stage/TerrariumCanvas.tsx:73,151`
- Test: `tests/unit/engine/render.test.ts`, `tests/unit/engine/geometry.test.ts`, `tests/unit/engine/interaction.test.ts`

**Interfaces:**
- Consumes: `vesselKX(id)`, `isRectTank(id)` from Task 1.
- Produces: `computeVesselRect(canvasW: number, canvasH: number, relaxMode = false, kx = 1): Rect` with `r = min(canvasW * 0.62 / max(1, kx * 0.92), canvasH * (relaxMode ? 0.48 : 0.46))`, `{ x: cx - r*kx, y: cy - r, w: 2*r*kx, h: 2*r }` (spec 1968, 6248). `vesselMetrics(R)` returns `{ cx, cy, r: R.h / 2, kx: R.w / R.h }` (existing callers keep working: for square rects `kx === 1`). `hitTest(world, nx, ny, kx = 1)` uses `Math.hypot((item.x - nx) * kx, item.y - ny)` (spec 6291). The snap function takes `kx` and computes `mpx = host.x + mp.ox * hostSize / kx` (Review Focus 5); `syncChildren` is unchanged. `traceVesselPath` draws the rect-tank path for every `isRectTank` id as `roundRect(cx - r*0.72*kx, cy - r*0.84, r*1.44*kx, r*1.68, 4)` (spec 2728).

- [ ] **Step 1: Write the failing tests**

`tests/unit/engine/render.test.ts`:

```ts
it('scales the vessel rect horizontally by kx and keeps the radius from the height', () => {
  const R = computeVesselRect(1000, 600, false, 2)
  expect(R.h / 2).toBeCloseTo(276, 0)
  expect(R.w).toBeCloseTo(R.h * 2)
  expect(R.x + R.w / 2).toBeCloseTo(500)
  expect(vesselMetrics(R)).toMatchObject({ r: R.h / 2, kx: 2 })
})
it('fits a 2.6 tank inside a narrow canvas', () => {
  const R = computeVesselRect(400, 900, false, 2.6)
  expect(R.w).toBeLessThanOrEqual(400 * 0.62 * 2 / 0.92 + 0.001)
  expect(R.w / R.h).toBeCloseTo(2.6)
})
```

`tests/unit/engine/geometry.test.ts`: `traceVesselPath(ctx, 'riparium_long', R)` with a mocked ctx records a `roundRect` call whose width is `R.h/2 * 1.44 * 2.6` (within 1e-6) and whose height is `R.h/2 * 1.68`.

`tests/unit/engine/interaction.test.ts`:

```ts
it('hit test scales dx by kx', () => {
  // item at (0.5, 0.5); a tap 0.07 to the right hits on a square vessel but misses on kx = 2
  expect(hitTest(world, 0.57, 0.5)).toBe(item)
  expect(hitTest(world, 0.57, 0.5, 2)).toBeNull()
  expect(hitTest(world, 0.53, 0.5, 2)).toBe(item)
})
it('mount points scale by 1/kx', () => {
  // host at (0.5, 0.6) with one mount point ox = 0.5, oy = 0 → mpx = 0.59 on a square vessel, 0.545 on kx = 2
  // drop a mountable item at (0.55, 0.6) with kx = 2 and expect x = 0.545 and offsetX = 0.045
})
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm vitest run tests/unit/engine/render.test.ts tests/unit/engine/geometry.test.ts tests/unit/engine/interaction.test.ts`
Expected: FAIL (fourth argument ignored; `kx` missing from metrics; path width unscaled).

- [ ] **Step 3: Implement**

Apply the Interfaces block. In `useTerrariumEngine.ts` and `TerrariumCanvas.tsx` pass `vesselKX(state.vessel)` to `computeVesselRect` and `hitTest`/the snap function (read the vessel from the same studio state they already read). `toNormalized` needs no change (it already divides by `R.w`/`R.h`).

- [ ] **Step 4: Run the engine tests**

Run: `pnpm vitest run tests/unit/engine`
Expected: PASS (existing square-rect assertions unchanged because `kx` defaults to 1).

- [ ] **Step 5: Commit**

```bash
git add src/engine src/hooks/useTerrariumEngine.ts src/components/stage/TerrariumCanvas.tsx tests/unit/engine
git commit -m "feat(engine): scale the vessel rect, hit test and snapping by the tank's kx"
```

---

### Task 3: Renderers on the scaled rect, per-tank frames and lid gate

**Files:**
- Modify: `src/engine/render/frame.ts` (`drawPaludariumFrontFrame`, `drawLid`)
- Modify: `src/engine/render/vessel.ts`, `background.ts`, `lamp.ts`, `backdrop.ts`, `specimens.ts`, `particles.ts`, `mist.ts`, `pouring.ts`, `substrates.ts`, `condensation.ts`
- Test: `tests/unit/engine/render.test.ts`, `tests/e2e/studio.spec.ts`

**Interfaces:**
- Consumes: `vesselMetrics(R).kx`, `isRectTank(id)`.
- Produces: no new exports. Every painter that used the radius on the horizontal axis now uses the rect: full-area fills become `ctx.fillRect(R.x, R.y, R.w, R.h)` (spec 5713, 5725, 5755); point mapping becomes `px = R.x + nx * R.w` (specimens, particles, mist, pouring; spec 3269, 5743); `substrates.ts:61` `normX = 0.5 + (x - cx) / R.w`; `backdrop.ts:40` `w = Math.round(R.w)` (spec 3714); `background.ts:37` base board `roundRect(cx - r*0.78*kx, cy + r*0.84, r*1.56*kx, r*0.06, 6)` (spec 5700); `lamp.ts:25` `puckW = kx > 1 ? r*0.62*kx : r*0.42` (spec 2780); `vessel.ts` lamp cone outer radius `r*0.95*kx` (spec 5720).
- `drawPaludariumFrontFrame` returns unless `isRectTank(state.vessel)`; `w = r*1.44*kx`, `h = r*1.68`, `leftX = cx - w/2`; three branches copied from spec 5157–5205: rimless/riparium (thin dark stroke, white seam lines, reflection streak, riparium planter rail), vivarium_front (5-px black frame, vent strip `r*0.07` tall with 5-px mesh lines, centre door split to `h*0.62`, two handles at `cx-9`/`cx+5`, lower panel bar), else the existing paludarium frame (dam bar and knob stay as they are today).
- `drawLid` returns when `isRectTank(state.vessel) || state.vessel === 'globe'` (spec 5796).

- [ ] **Step 1: Write the failing tests**

`tests/unit/engine/render.test.ts`:

```ts
it('renderFrame draws every vessel with a populated world', () => {
  for (const v of VESSELS) {
    const state = { ...createDefaultState(), vessel: v.id, hasLid: true, hasGrowLamp: true }
    const R = computeVesselRect(800, 600, false, vesselKX(v.id))
    expect(() => renderFrame(makeCtx(), populatedWorld(), state, R, 50)).not.toThrow()
  }
})
it('no lid on rect tanks', () => {
  // drawLid with vessel 'rimless_landscape' and hasLid true makes no roundRect call; with 'apothecary' it makes one
})
it('vivarium frame draws doors', () => {
  // drawPaludariumFrontFrame with vessel 'vivarium_front': strokeRect called once with width r*1.44*1.55 and lineWidth 5 at that call; two roundRect handle calls of size 4x16
})
it('places a specimen across the full scaled width', () => {
  // drawSpecimens with kx = 2 and an item at x = 1 translates to R.x + R.w (spy on ctx.translate or setTransform as the existing specimen test does)
})
```

`tests/e2e/studio.spec.ts`: add a test that dismisses the welcome prompt, clicks the "Long Riparium" vessel button, expects it to have `aria-pressed="true"`, and asserts no page error was raised (`page.on('pageerror')`) while the canvas renders for 500 ms.

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm vitest run tests/unit/engine/render.test.ts`
Expected: FAIL (lid drawn on rimless; frame absent on vivarium; specimen placed at the unscaled width).

- [ ] **Step 3: Implement**

Apply the Interfaces block file by file. Audit every line listed by `grep -rn -E 'Rad \* 2|r \* 2|cx - (Rad|r)\b' src/engine/render` against the spec's `KX` sites (lines in the Spec paragraph) and convert each horizontal use; vertical uses stay on `r`.

- [ ] **Step 4: Run the full checks**

Run: `pnpm typecheck && pnpm lint && pnpm vitest run tests/unit && pnpm build && pnpm e2e`
Expected: all pass (lint: only the LineIcon warning; e2e 13/13).

- [ ] **Step 5: Commit**

```bash
git add src/engine/render tests/unit/engine/render.test.ts tests/e2e/studio.spec.ts
git commit -m "feat(render): draw rectangular tanks on the scaled rect with per-tank frames"
```
