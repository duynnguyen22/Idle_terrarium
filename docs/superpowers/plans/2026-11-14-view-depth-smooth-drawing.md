# View, Depth and Smooth Drawing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the tank as a front cut-away, and make it readable and deep: a camera (zoom, pan, pinch, automatic close-ups), a phone view that fills the screen with the planted band, shadows that only land on surfaces, three depth planes with parallax, haze and a glass edge, and a drawing path that holds 60 fps while zoomed.

**Architecture:** A new transient `world.view` (`src/engine/view.ts`) holds the camera, the parallax offset and the drawing flags. The engine hook updates it once per frame and `renderFrame` applies it as one canvas transform around everything except the sky. Pointer input is mapped back through the camera in one place (`TerrariumCanvas.norm`). Shadows and depth are new render modules called from `drawSpecimens`. Device preferences (depth on, smooth drawing on, frame-rate readout) live in a small unpersisted-by-studio store (`src/store/view.ts`, own localStorage key), so `STUDIO_VERSION` stays 4 and gardens saved to the cloud are untouched.

**Tech Stack:** React 19, Vite 6, TypeScript strict, Jotai 3, Tailwind 4, shadcn/ui, vitest (jsdom), Playwright, pnpm. No new runtime dependencies. Canvas 2D stays; no WebGL, no three.js.

**Prototype:** `docs/reference/prototype-v9.html` is the tested source for every number and drawing routine below (artifact v30). Line references in this plan are to that file. Read the two modules first: `VIEW` (7624–8070) and `SMOOTH DRAWING` (8072–8223), then the specimen pass (3902–3990) and the frame loop (8800–8965).

**Measured before this plan** (one 3-second sample each, in Chrome on the owner's Mac; treat as indicative):

| Where | What | Result |
|---|---|---|
| Live React site, studio | 2566×1654 backing store | 57 fps |
| Live React site, relax full screen | 100 % zoom | 34 fps |
| Live React site | animal size on a ~1030 px tank | ~30 px |
| Live React site, 430 px wide | tank width | ~290 px |
| Prototype, relax full screen | 3956×1568, 100 % zoom | 60 fps |
| Prototype, studio, 190 % zoom | before ImageBitmap + plain smoothing | 28 fps |
| Prototype, studio, 190 % zoom | after | 60 fps |

The React site is slower than the prototype at the same zoom, and the cause is **not known**. Task 1 finds it before anything else is built.

## Global Constraints

- pnpm; no new runtime deps. `pnpm typecheck`, `pnpm lint`, `pnpm vitest run tests/unit`, `pnpm build` pass at every commit; `pnpm e2e` at Task 12. Branch: create `feat/view-depth` from the branch that contains `09a5dbf` (currently `feat/research-fauna`) before Task 1.
- Unit tests under `tests/unit/**/*.test.{ts,tsx}`; e2e under `tests/e2e` with `dismissWelcomePrompt`. Render tests use `tests/unit/helpers/recordingContext.ts`.
- `src/engine/**` imports no React, no audio, no store instances (types only). `world.view` is never persisted: `snapshotWorld` must not include it, and `restoreWorld` must not reset it.
- `STUDIO_VERSION` stays 4. No change to `StudioState`, migrations, garden snapshots or the account store.
- The simulation is not modified: `tick`, `dayTick`, `catchup`, `life`, `breed`, `ecology`, `environment`, `fauna` stay as they are.
- Reduced motion (`state.reducedMotion`): the camera jumps instead of easing, the parallax drift and pointer parallax are off. Zoom and pan still work.
- Copy is verbatim from the prototype where listed in **Numbers and copy**.
- Commit style follows `git log` (`feat(view): …`, `feat(render): …`, `perf(render): …`).

## Out of Scope

These exist in the prototype and are **not** in the React code yet. They are a separate plan:

- The full evening ritual (arrive, one care invitation, goodnight, quiet) and its light. The React app has the tour only, by design of the living-time spec.
- Plant health visuals: symptom tints, droop, and the life-cycle overlays (buds, flowers, fiddleheads, runners) that should replace the three yellow "lush" dots in `specimens.ts`.
- A WebGL renderer or a real 3D scene.

## Numbers and Copy

| Name | Value | Prototype line |
|---|---|---|
| `CAM_MAX` | 4 | 7630 |
| Camera ease per 60 fps frame | 0.1 (use `1 - 0.9 ** (dtMs / 16.67)`); 1 while panning, pinching or reduced motion | 7726 |
| Snap threshold | `abs(target.z - cam.z) < 0.002` | 7728 |
| Wheel zoom | `cam.z * exp(-deltaY * k)`, `k = 0.012` with `ctrlKey` (trackpad pinch), else `0.0016` | 7988 |
| Button zoom step | ×1.35 and ÷1.35 about the canvas centre | 8046 |
| Double-click | on an item: `z = max(2.4, target z)` centred on it; else if `z > 1.05` go home; else zoom to 2 at the point | 8030 |
| Pan starts when | `(relaxMode or activeTool === 'select')`, no item grabbed, `cam.z > 1.01`; "moved" after 3 px | 8001 |
| Frame the plants | top = highest item top (glass climbers ignored) minus `0.06·r`, never above `cy - r`; bottom = `cy + 0.92·r`; width = `1.6·r·kx`; `z = clamp(fit · 0.97, 1, 2.6)`; under 640 px wide `fit = min(2.4, H / h)` (sides may crop) | 7677 |
| Phone start | first frame with `W < 640` and at least one item: frame the plants once | 7712 |
| Close-up | `focusOn(uids ≤ 3, z, ms)`: tour step `2, TOUR_PING_MS`; away-card line click `2, 3200`; growth-board row click `2, 3200`; saved view restored on release | 7697, 6829, 6884, 7615 |
| Parallax target | pointer (−1…1 across the canvas) when over the canvas and not relax-idle; else in relax `sin(ts·0.00028)·0.7`, `cos(ts·0.0002)·0.3`; plus `(cam.u − 0.5)·2.4`, `(cam.v − 0.5)·1.2`; clamp ±1.6; ease 0.07 | 7733 |
| Parallax frozen while | dragging, misting, pouring, panning, pinching | 7734 |
| Planes | 0 = soil, loose plants, animals; 1 = hardscape and anything mounted; 2 = `moss_wall_cliff` and the painted backdrop | 7748 |
| Plane shift | `par · r · k`, `k = 0.013` (plane 1), `0.034` (plane 2); y shift × 0.35 | 7753 |
| Backdrop | shift × 1.4, scaled 1.05 about the tank centre | 8175 |
| Haze | `source-atop` wash, alpha 0.07 (plane 1), 0.2 (plane 2); colours night `#1c2538`, twilight `#5b4046`, dawn `#efe6d3`, sunlight `#e6ede9` | 7762 |
| Light factor `lightK` | night 0.4; lamp on 1; otherwise 0.65 | 7800 |
| Ground shadow | see Task 7 | 7802–7856 |
| Mount shadow | see Task 8 | 7858–7924 |
| Glass | reflection band alpha 0.05 (night 0.025); inner edge `0.045·r` wide alpha 0.13 (night 0.05); dark line `0.014·r` `rgba(16,32,24,0.16)` | 7946 |
| Sharp sprites | 512 px when the sprite covers ≥ 300 device px; at most one new 512 sprite per frame; cache cap 48 | 7926 |
| Render steps | `[1, 0.85, 0.72, 0.6]` | 8084 |
| Step down | frame-time average > 21 ms for 90 frames; then a 120-frame trial: if the average is not at least 8 % better, go back and lock for 5 min | 8096–8110 |
| Step up | average < 17.4 ms for 480 frames; if it drops again within 20 s, stay down for 2 min | 8111 |
| Frame-time average | `ema = ema · 0.94 + dt · 0.06`; ignore `dt ≤ 0` or `> 250` | 8086 |

Copy (verbatim):

- View controls `title`s: `Zoom out`, `Show the whole tank (0)`, `Zoom in`, `Frame the plants (F)`, `Depth effects: planes, soft shadows, haze, glass`. Group `aria-label="View"`.
- Toasts: `Depth effects on` / `Depth effects off: flat view`; `Smooth drawing on` / `Smooth drawing off: full detail every frame`.
- ⋯ menu group `Drawing`: `Smooth drawing`, `Show frame rate`.
- Frame-rate readout: `${fps} fps · slowest ${ms} ms · ${w}×${h} · detail ${pct}% · smooth ${on|off}`.

Prototype → project names (use when porting any routine):

| Prototype | Project |
|---|---|
| `state.items`, `state.frame`, `state.draggingId` | `world.items`, `world.frame`, `world.draggingId` |
| `state.cam`, `camT`, `par`, `depthOn`, `fastDraw`, `renderScale` | `world.view.*` |
| `cx, cy, R, KX` | `vesselMetrics(R)` → `cx, cy, r, kx` (`R` is the vessel rect here) |
| `state.lampOn` | `isLampOn(state)` (`simulation/clock.ts`) |
| `hasPool()`, `getDividerNormX()`, `getPoolBedNormY()` | `hasPool(state.waterSplit)`, `getDividerNormX(state.waterSplit)`, `getPoolBedNormY(state.substrates)` |
| `getSoilSurfaceNormalizedY(x)` | `getSoilSurfaceNormalizedY({ substrates: state.substrates, waterSplit: state.waterSplit, terrainContour: world.terrainContour }, x)` |
| `canvasSpriteCache.get(id)` | `getSprite(id)` |
| `itemScreenPos(item, …)` | `itemBox(R, item, world.view)` |
| `REDUCED_MOTION` | `state.reducedMotion` |
| `document.createElement('canvas')` | `createScratchCanvas()` exported from `spriteCache.ts` (uses the same factory tests swap) |

## Review Focus

1. **Pointer mapping while zoomed.** At zoom 2.5, a dragged plant must stay under the pointer and a tap must select what is under it. `TerrariumCanvas.norm` is the only client→normalized conversion; confirm mist, pour and prune read `world.pointerNorm` and nothing calls `toNormalized` directly. Pinned in Task 3 (`a point survives applyCamera then camToBase`) and Task 12 (`drags a plant at 200 % zoom`).
2. **Test canvases have no context.** `tests/unit/engine/render.test.ts` swaps the sprite factory for `{ getContext: () => null }`, and jsdom has no `createImageBitmap`. `hazedSprite`, `silhouetteOf`, `drawMountShadow`, `sharpSprite` and `gpuImage` must return the source picture instead of throwing. Pinned in Tasks 2, 7, 8, 9.
3. **A stale ImageBitmap.** `gpuImage` caches by canvas identity, so it is only for canvases that never change after first paint (sprites, 512 sprites, hazed copies, silhouettes, the soft shadow). The mount-shadow canvas and any cached layer are repainted in place: never pass those through `gpuImage`. Pinned in Task 2 (`returns the same bitmap for the same canvas`) and by review.
4. **A second finger during a drag.** Pinch start must end the drag, mist or pour cleanly (`endDrag`, `world.isMisting = false`, `world.isPouring = false`, one `commitWorld`), or the plant jumps to the finger midpoint. Lifting one finger must not start a pan or a selection. Pinned in Task 4 (`a second pointer ends the drag and starts a pinch`).
5. **Camera after the world changes.** Vessel switch, window resize, relax toggle (radius 0.46·H → 0.48·H), a garden loaded from the account, and "Clear all specimens" while a close-up is following a uid that no longer exists. `clampCam` every frame; a follow with no live uid releases. Pinned in Task 3 (`a follow whose items are gone releases to the saved view`).
6. **Two owners of the canvas size.** Today `TerrariumCanvas` sizes the backing store in a `ResizeObserver` and the hook divides by DPR. Adaptive resolution needs one owner (the hook, Task 11); setting `canvas.width` clears the canvas, so resize only at the start of a frame. Pinned in Task 11 (`the backing store follows renderScale`).
7. **No shadow in the air.** A plant being dragged high, a swimming shrimp, a mounted fern and a gecko on the glass: the first two get a wide faint shadow on the surface below, the third a silhouette on its rock only, the fourth a faint offset copy on the pane. The old flat ellipse (`specimens.ts`, "Ground contact shadow") must be gone, and no shadow may be drawn after the item's own rotation or flip. Pinned in Task 7.

---

### Task 1: Frame-rate readout, and find why relax mode is slow

**Files:**
- Create: `src/engine/render/perf.ts`, `src/store/view.ts`, `src/components/stage/PerfHud.tsx`
- Modify: `src/hooks/useTerrariumEngine.ts`, `src/components/nav/UtilityActions.tsx`, `src/components/layout/StudioLayout.tsx`, `src/index.css`
- Test: `tests/unit/engine/perf.test.ts`, `tests/unit/store/view.test.ts`, `tests/unit/components/moreMenu.test.tsx`

**Interfaces:**
- `perf.ts`: `interface PerfState { ema: number; last: number; dts: number[]; slow: number; fast: number; lockUp: number; lockAll: number; lastRaise: number; trial: { scale: number; ema: number; n: number } | null }`; `createPerf(): PerfState` (`ema: 16.7`, `lastRaise: -1e9`); `sampleFrame(p: PerfState, ts: number): number | null` (updates `ema` and the last 90 `dts`, returns `dt` or `null` when ignored); `perfSummary(p): { fps: number; slowest: number } | null`. The step logic comes in Task 11.
- `store/view.ts`: `VIEW_STORAGE_KEY = 'botanica_view_v1'`; atoms `depthOnAtom` (true), `smoothDrawingAtom` (true), `perfHudAtom` (false), `zoomPctAtom` (100, not saved), `perfTextAtom` (`''`, not saved); `hydrateViewPrefs(store, storage)` loads `{ depth, smooth, hud }`, treats any non-boolean as the default, and writes on change; every storage call in `try/catch`. Call it where the studio store is hydrated.
- `PerfHud`: `<output id="perf-hud">` showing `perfTextAtom`, rendered only when `perfHudAtom` is true; `top-2 left-2 z-50` on the stage in both studio and relax mode (owner's choice, 2026-11-14); `pointer-events-none`, tabular numbers.
- Hook: one `PerfState` per engine; `sampleFrame` each frame; every 20th frame set `perfTextAtom` to the readout string (only when the readout is on).
- ⋯ menu: new group `Drawing` above `Time away` with two `DropdownMenuCheckboxItem`s (`Smooth drawing`, `Show frame rate`), same pattern as `Grow while I'm away`. The smooth-drawing toggle shows its toast; it has no drawing effect until Task 2.

- [ ] **Step 1: Write failing tests**

```ts
// perf.test.ts
it('ignores a first frame, a zero dt and a gap over 250 ms', ...)
it('ema moves 6 % toward each sample and dts keeps the last 90', ...)
it('perfSummary reports fps from the mean and the slowest frame', ...)   // dts of 20 ms → 50 fps
// view.test.ts
it('defaults to depth on, smooth on, readout off', ...)
it('loads saved prefs and falls back on a non-boolean or broken JSON', ...)
it('writes on change and survives a storage that throws', ...)
// moreMenu.test.tsx
it('Drawing group toggles Smooth drawing and Show frame rate and keeps the menu open', ...)
```

- [ ] **Step 2: Run** the three files — expect FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** — PASS; `pnpm typecheck` PASS.
- [ ] **Step 5: Measure, with the readout on, `pnpm build && pnpm preview`, a normal Chrome window (not headless), the default Falls Lake tank.** Take each reading after 10 s settled. Fill the table at the end of this file.

  1. Studio, window maximised.
  2. Relax mode, full screen (`R`, then the browser's full screen).
  3. Relax again with `ctx.imageSmoothingQuality = 'low'` (temporary edit in the hook).
  4. Relax again with `#care-toolbar` and `#item-inspector` set to `display: none` in relax mode. Today `src/index.css` only sets `opacity: 0` on them, and both carry `backdrop-blur-md` over an animating canvas.
  5. Relax again with `MAX_DPR = 1.5` (temporary).

  Keep whichever of 3 and 4 measurably helps as part of this task (3 becomes the `smooth` flag in Task 2; 4 is a CSS change with a line of comment). Revert 5: it is information for Task 11, not a fix. If none of 3–5 explains the gap to the prototype, record a Chrome Performance trace summary (top three entries under "Main" and "GPU") in the table before going on.
- [ ] **Step 6: Commit** `feat(perf): frame-rate readout, drawing prefs and relax-mode measurements`

### Task 2: Plain smoothing and graphics-card sprites

**Files:**
- Create: `src/engine/sprites/gpuImage.ts`
- Modify: `src/engine/view.ts` (create with the flags only; the camera arrives in Task 3), `src/engine/world.ts`, `src/engine/sprites/spriteCache.ts`, `src/engine/render/specimens.ts`, `src/hooks/useTerrariumEngine.ts`
- Test: `tests/unit/engine/gpuImage.test.ts`, `tests/unit/engine/render.test.ts`, `tests/unit/engine/persistence.test.ts`

**Interfaces:**
- `view.ts` (this task): `interface ViewState { depthOn: boolean; fastDraw: boolean; renderScale: number }`; `createView(): ViewState` (`true, true, 1`). `EngineWorld.view: ViewState`, set in `createWorld`.
- `gpuImage.ts`: `gpuImage(src: HTMLCanvasElement, enabled: boolean): CanvasImageSource`. A `WeakMap<HTMLCanvasElement, { bmp: ImageBitmap | null }>`; on first sight start `createImageBitmap(src)`, return `src` until it resolves, then the bitmap; return `src` when disabled, when `createImageBitmap` is missing, when `src.width === 0`, or when the promise rejects.
- `spriteCache.ts`: export `createScratchCanvas(w: number, h: number): HTMLCanvasElement` using the current factory.
- Hook: copy `smoothDrawingAtom` and `depthOnAtom` into `world.view` at the top of each frame; `ctx.imageSmoothingQuality = world.view.fastDraw ? 'low' : 'high'`.
- `specimens.ts`: `ctx.drawImage(gpuImage(sprite, world.view.fastDraw), …)`.

- [ ] **Step 1: Write failing tests**

```ts
// gpuImage.test.ts
it('returns the canvas itself when disabled or when createImageBitmap is missing', ...)
it('returns the canvas first, then the bitmap once the promise resolves', ...)   // stub globalThis.createImageBitmap
it('returns the same bitmap for the same canvas and asks only once', ...)
it('keeps drawing the canvas when createImageBitmap rejects', ...)
// render.test.ts
it('drawSpecimens still draws every item with a context-less sprite factory', ...)
// persistence.test.ts
it('snapshotWorld leaves view out and restoreWorld keeps the current view', ...)
```

- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** — PASS.
- [ ] **Step 5: Re-measure** rows 1 and 2 of the table with smooth drawing on and off.
- [ ] **Step 6: Commit** `perf(render): plain smoothing and ImageBitmap sprites behind the smooth-drawing switch`

### Task 3: Camera state, maths and the frame transform

**Files:**
- Modify: `src/engine/view.ts`, `src/engine/render/renderFrame.ts`, `src/engine/render/background.ts`, `src/engine/render/specimens.ts` (`itemBox` only), `src/engine/render/marks.ts`, `src/hooks/useTerrariumEngine.ts`
- Test: `tests/unit/engine/view.test.ts`, `tests/unit/engine/render.test.ts`

**Interfaces** (all pure; `Cam` is mutated in place like the rest of the world):

```ts
export const CAM_MAX = 4
export interface Cam { z: number; u: number; v: number }   // u, v: the canvas point (0..1) at the screen centre
export interface ViewState {
  cam: Cam; camT: Cam
  follow: { uids: string[]; z: number; until: number } | null
  saved: Cam | null
  /** Panning or pinching: the camera snaps to the target. */
  gesture: boolean
  par: Point                      // eased parallax, about -1.6..1.6
  pointerScreen: Point | null     // -1..1 across the canvas
  size: { w: number; h: number } | null
  framedOnce: boolean
  depthOn: boolean; fastDraw: boolean; renderScale: number
}
export function clampCam(c: Cam): Cam            // z in [1, CAM_MAX]; u, v in [0.5/z, 1 - 0.5/z]
export function camToBase(c: Cam, sx: number, sy: number, W: number, H: number): Point
//   { x: (sx - W/2) / c.z + c.u * W, y: (sy - H/2) / c.z + c.v * H }
export function applyCamera(ctx: CanvasRenderingContext2D, c: Cam, W: number, H: number): void
//   translate(W/2, H/2); scale(z, z); translate(-u*W, -v*H)
export function zoomAt(view: ViewState, sx: number, sy: number, z: number, snap: boolean): void
//   keeps the canvas point under (sx, sy) fixed; clears follow; snap copies camT into cam
export function camHome(view: ViewState): void
export function framePlants(view: ViewState, world: EngineWorld, R: Rect): void
export function focusOn(view: ViewState, uids: string[], z: number, ms: number, now: number): void
//   saves camT unless already following; z = max(z, min(camT.z, 3)); until = now + ms
export function releaseFocus(view: ViewState): void
export function updateCamera(view: ViewState, world: EngineWorld, state: StudioState, R: Rect,
  size: { w: number; h: number }, dtMs: number, timestamp: number, pointerLive: boolean): void
```

- `updateCamera` does, in order: store `size`; phone start (once); follow (release when `timestamp > until` or no uid is alive, else aim `camT` at the mean `itemBox` centre, y raised by `0.05·size`); ease `cam` toward `camT`; `clampCam(cam)`; parallax as in **Numbers**. `timestamp` and `now` are the rAF clock, the same one `pingItem` uses.
- `itemBox(R, item, view?)`: unchanged without `view`; Task 9 adds the plane shift when `view` is given. `drawMarks` passes `world.view` now so rings follow later.
- `drawBackground` is split: `drawSky(ctx, state, size)` and `drawBaseBoard(ctx, R)`.
- `renderFrame`: `drawSky` → `ctx.save(); applyCamera(ctx, world.view.cam, size.w, size.h)` → base board → everything up to and including `drawLid` → `ctx.restore()`. The sky is not zoomed.
- Hook: call `updateCamera` after `tick` and before `renderFrame`; `pointerLive = world.pointerInCanvas && !document.body.classList.contains('relax-idle')`; when `Math.round(cam.z * 100)` changes, set `zoomPctAtom`.

- [ ] **Step 1: Write failing tests**

```ts
// view.test.ts
it('clampCam keeps zoom in 1..4 and the view inside the canvas', ...)
it('a point survives applyCamera then camToBase', ...)             // apply the same matrix by hand, 3 cameras
it('zoomAt keeps the point under the cursor fixed', ...)           // camToBase before === after, within 1e-6
it('zoomAt at zoom 1 leaves u, v at 0.5', ...)
it('framePlants ignores glass climbers and never zooms past 2.6', ...)
it('framePlants on a 390 px canvas lets the sides crop (fit = min(2.4, H / h))', ...)
it('focusOn saves the view once and releaseFocus restores it', ...)
it('a follow whose items are gone releases to the saved view', ...)
it('the phone start frames once and not again after the user zooms out', ...)
it('reduced motion jumps to the target in one update', ...)
it('parallax is zero with depth off and frozen while dragging', ...)
// render.test.ts
it('renderFrame saves and restores the same number of times with a zoomed camera', ...)
it('the sky is filled before the camera transform and the base board after', ...)   // order of fillRect / translate / roundRect
```

- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** — PASS; existing `render.test.ts` cases still pass.
- [ ] **Step 5: Commit** `feat(view): camera state, maths and frame transform`

### Task 4: Pointer mapping and gestures

**Files:**
- Modify: `src/components/stage/TerrariumCanvas.tsx`, `src/hooks/useKeyboardShortcuts.ts`
- Create: `src/engine/viewInput.ts` (pure gesture helpers, so they can be unit-tested without a DOM)
- Test: `tests/unit/engine/viewInput.test.ts`, `tests/unit/hooks/useKeyboardShortcuts.test.tsx`, `tests/unit/components/studio.test.tsx`

**Interfaces:**
- `viewInput.ts`: `wheelZoom(view, sx, sy, deltaY, ctrlKey)`; `beginPan(view, sx, sy)` → `PanState | null` (null at `z ≤ 1.01`); `movePan(view, pan, sx, sy)`; `beginPinch(view, a, b)` → `PinchState`; `movePinch(view, pinch, a, b)`; `doubleClick(view, world, R, kx, sx, sy)`.
- `TerrariumCanvas.norm`: `const b = camToBase(view.cam, clientX - rect.left, clientY - rect.top, rect.width, rect.height)` then the existing rect maths on `b`. Also set `view.pointerScreen`.
- Wheel: attach in an effect with `{ passive: false }` and `preventDefault()` (React's `onWheel` is passive).
- Pointer down: track pointers in a `Map`. Second pointer → end drag/mist/pour (Review Focus 4), `beginPinch`, `view.gesture = true`. First pointer: in relax mode start a pan if zoomed; in the studio run the existing tool/hit logic, and when nothing was hit and the tool is `select`, start a pan (the selection is still cleared, as now). Cursor: `grabbing` while panning.
- Pointer up / cancel: drop the pointer; under two pointers end the pinch; end the pan; `view.gesture = false`.
- `onDoubleClick` → `doubleClick`.
- Keys (ignored while typing, like `R`): `F` → `framePlants`, `0` → `camHome`.

- [ ] **Step 1: Write failing tests**

```ts
// viewInput.test.ts
it('wheel up zooms in about the cursor; ctrl+wheel is the stronger trackpad pinch', ...)
it('beginPan returns null at 100 % and a pan moves the view by dx / zoom', ...)
it('pinch scales by the finger distance ratio about the midpoint', ...)
it('a second pointer ends the drag and starts a pinch', ...)            // world.draggingId null afterwards
it('double-click on an item centres it at >= 240 %, on empty space zooms to 200 %, and when zoomed goes home', ...)
// useKeyboardShortcuts.test.tsx
it('F frames the plants and 0 shows the whole tank; neither fires while typing', ...)
// studio.test.tsx
it('a press on empty space at 200 % pans instead of only clearing the selection', ...)
```

- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** — PASS.
- [ ] **Step 5: Check by hand** in `pnpm dev`: wheel, trackpad pinch, drag a plant at 250 %, mist and pour at 250 % (the spray and the stream must start at the pointer), double-click.
- [ ] **Step 6: Commit** `feat(view): zoom, pan, pinch and double-click on the canvas`

### Task 5: View controls and the phone view

**Files:**
- Create: `src/components/stage/ViewControls.tsx`
- Modify: `src/components/layout/StudioLayout.tsx`, `src/index.css`
- Test: `tests/unit/components/viewControls.test.tsx`

**Interfaces:**
- `ViewControls`: `<div id="view-ctl" role="group" aria-label="View">` with five shadcn `Button`/`Toggle`s in the prototype order (markup 1048–1055, styles 442–482): zoom out (disabled at 100 %), percent (`zoomPctAtom`, click = home), zoom in (disabled at 400 %), divider, frame the plants, depth (`aria-pressed`, toggles `depthOnAtom`, toast). Icons from `LineIcon`; add `minus`, `plus`, `frame`, `layers` if missing.
- Position: `absolute right-3 bottom-4 z-20`. `#canvas-stage` becomes a container (`@container`), and under 1100 px of stage width the controls move to `bottom-[78px]` so they clear `CareToolbar`. In relax mode: top right, dark like `RelaxDock`, hidden with `relax-idle`. Add `#view-ctl` to none of the "hide in relax" rules.
- Buttons act on `tryGetWorld()?.view` through the Task 3 functions about the canvas centre.

- [ ] **Step 1: Write failing tests**

```ts
it('shows the zoom percent and disables zoom out at 100 % and zoom in at 400 %', ...)
it('the percent button returns to the whole tank', ...)
it('the depth toggle flips aria-pressed, saves the pref and shows the toast', ...)
it('every control has an accessible name', ...)
```

- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** — PASS.
- [ ] **Step 5: Check by hand** at 390×844, 820×1180 and 1440×900: the phone opens framed on the planted band (the tank should be clearly wider than the ~290 px measured before), the controls never overlap the care toolbar, the relax dock or the lighting control.
- [ ] **Step 6: Commit** `feat(view): view controls and a framed start on phones`

### Task 6: Automatic close-ups

**Files:**
- Modify: `src/hooks/useTour.ts`, `src/components/stage/AwayCard.tsx`, `src/components/growth/GrowthBoard.tsx`
- Test: `tests/unit/hooks/useTour.test.tsx`, `tests/unit/components/awayCard.test.tsx`, `tests/unit/components/growth/growthBoard.test.tsx`

- Tour step: next to `pingItem(world, step.uid, TOUR_PING_MS)` call `focusOn(world.view, [step.uid], 2, TOUR_PING_MS, performance.now())`. When the tour ends or is skipped: `releaseFocus`.
- Away card: clicking a line (where it selects the item today) also calls `focusOn(view, [uid], 2, 3200, now)`. Hover still only pings.
- Growth board: clicking a row calls `focusOn(view, uids.slice(0, 3), 2, 3200, now)`.

- [ ] **Step 1: Write failing tests**

```ts
it('each tour step aims the camera at its item and the end of the tour restores the view', ...)
it('Skip restores the view', ...)
it('clicking an away-card line focuses the item; hovering does not move the camera', ...)
it('clicking a growth-board row focuses up to three animals of that species', ...)
```

- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat(view): close-ups from the tour, the away card and the growth board`

### Task 7: Ground shadows

**Files:**
- Create: `src/engine/render/shadows.ts`
- Modify: `src/engine/render/specimens.ts`, `src/engine/geometry.ts`, `src/engine/simulation/pouring.ts` (use the shared helper)
- Test: `tests/unit/engine/shadows.test.ts`, `tests/unit/engine/geometry.test.ts`, `tests/unit/engine/render.test.ts`

**Interfaces:**
- `geometry.ts`: `isInPool(x: number, waterSplit: number): boolean` = `hasPool(waterSplit) && x < getDividerNormX(waterSplit) - BANK_W * 0.5` (the expression `pouring.ts` line 104 has inline).
- `shadows.ts`: `lightK(state): number`; `shadowSprite(): HTMLCanvasElement` (128×32 soft ellipse, prototype 7782–7796; returns a blank canvas when the context is null); `drawGroundShadow(ctx, world, state, R, item, def, box, shiftY)` — a port of 7802–7856 with the name table above. Called with the context translated to the item centre and **before** the item's rotation, flip and sway.
- Behaviour to keep exactly: none for `habitat === 'glass'`; floating leaves shade a strip of water just below them; `lean = clamp((px − cx) / (r·kx), −1, 1)` when the lamp is on, else 0; `lift = clamp((dy − 0.24·size) / (0.4·r), 0, 1)`; alpha `lightK · (pool ? 0.55 : 1) · (1 − 0.85·lift)`, skipped under 0.03; rotated to the soil slope (sampled ±0.012); clipped to the half on the ground; on soil it stops at the bank, on the pool bed it stays in the pool; a darker core under `lift < 0.25`.
- `specimens.ts`: delete the "Ground contact shadow" ellipse; call `drawGroundShadow` for items without `parentUid` right after `ctx.translate(px, py)`.

- [ ] **Step 1: Write failing tests**

```ts
// geometry.test.ts
it('isInPool is false without a pool and true left of the bank middle', ...)
// shadows.test.ts
it('lightK is 0.4 at night, 1 with the lamp on, 0.65 with it off by day', ...)
it('a glass climber gets no ground shadow', ...)                           // no drawImage recorded
it('a plant on the soil draws the shadow at the soil line, not at its own centre', ...)   // translate dy > 0
it('a lifted item draws a wider, fainter shadow and nothing once alpha < 0.03', ...)
it('a land shadow is clipped at the bank when there is a pool', ...)       // a rect + clip before the draw
it('does not throw with a context-less sprite factory', ...)
// render.test.ts
it('drawSpecimens draws no ellipse for the contact shadow any more', ...)
it('the shadow is drawn before the item rotation', ...)                    // order of drawImage and rotate
```

- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** — PASS.
- [ ] **Step 5: Check by hand** against the prototype side by side, sunlight and night, lamp on and off: a fern on a slope, a rock at the bank, a shrimp swimming mid-water, a plant held in a drag.
- [ ] **Step 6: Commit** `feat(render): lamp-aware ground shadows that only land on soil or the pool bed`

### Task 8: Silhouette shadows for mounted plants and glass climbers

**Files:**
- Modify: `src/engine/render/shadows.ts`, `src/engine/render/specimens.ts`
- Test: `tests/unit/engine/shadows.test.ts`

**Interfaces:**
- `silhouetteOf(src): HTMLCanvasElement` (7858–7874): blurred copy (`ctx.filter = blur(max(2, round(width / 52)) px)`, with the seven-offset fallback when `filter` is unsupported), then `source-in` fill `#0b130e`; cached in a `WeakMap`; returns `src` when the context is null.
- `drawMountShadow(ctx, world, state, R, item, box)` (7876–7924): a 192×192 canvas per item uid holding the item's silhouette, offset `0.07·size·lean` right and `0.09·size` down, masked (`destination-in`) by the parent's sprite at the parent's position, rotation and flip; redrawn only when its key changes; drawn at alpha `0.5 · lightK`. Cache cleared when it passes 60 entries. Do not pass this canvas through `gpuImage`.
- Glass climbers (3948–3955): after the −90° rotation, draw `silhouetteOf(sprite)` offset `(−0.03, +0.03)·size` at alpha `0.16 · lightK`.
- `specimens.ts`: items with `parentUid` call `drawMountShadow` instead of `drawGroundShadow`.

- [ ] **Step 1: Write failing tests**

```ts
it('silhouetteOf is cached per sprite and returns the source without a context', ...)
it('a mounted item draws a mount shadow and no ground shadow', ...)
it('the mount shadow is repainted when the parent moves and reused when nothing changed', ...)
it('an orphan (parentUid with no parent) draws no mount shadow and does not throw', ...)
it('a glass climber draws its faint offset copy before its sprite', ...)
```

- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** — PASS.
- [ ] **Step 5: Check by hand:** a moss or fern mounted on the root slate casts its shape onto the rock and nothing onto the air beside the rock.
- [ ] **Step 6: Commit** `feat(render): silhouette shadows on rock, wall and glass`

### Task 9: Depth planes, haze and the glass edge

**Files:**
- Create: `src/engine/render/depth.ts`
- Modify: `src/engine/render/specimens.ts`, `src/engine/render/renderFrame.ts`, `src/engine/render/marks.ts`
- Test: `tests/unit/engine/depth.test.ts`, `tests/unit/engine/render.test.ts`

**Interfaces:**
- `planeOf(item): 0 | 1 | 2`; `planeShiftFor(view, plane, r): Point` (zero when `!view.depthOn` or plane 0); `hazedSprite(src, plane, lighting, depthOn)` (cached per sprite and `plane|lighting`; returns `src` for plane 0, depth off or a null context); `drawGlassDepth(ctx, state, R, depthOn)`.
- `itemBox(R, item, view)` adds the plane shift, so the sprite, its shadow, the selection halo, the mount nodes, the rings and the camera follow all agree. Hit testing stays unshifted: the largest shift for plane 1 is about `0.02·r`, well inside the `0.085` hit radius.
- `renderFrame`: wrap `drawMiniatureBackdrop` in the plane-2 transform (shift × 1.4, scale 1.05 about the tank centre) when depth is on; call `drawGlassDepth` after `drawPaludariumFrontFrame` and before `drawLid`.
- `specimens.ts`: draw `gpuImage(hazedSprite(sprite, plane, …))`; pass the plane's `shift.y` to `drawGroundShadow`.

- [ ] **Step 1: Write failing tests**

```ts
it('planeOf: loose plants and animals 0, hardscape and mounted items 1, the moss wall 2', ...)
it('planeShiftFor is zero with depth off and for plane 0; plane 2 moves 0.034 r per unit of parallax', ...)
it('hazedSprite is cached per lighting and returns the source for plane 0 or without a context', ...)
it('itemBox with a view moves a mounted item with its rock', ...)          // same shift for parent and child
it('with depth off renderFrame draws exactly what it drew before this task', ...)   // makeTraceContext equality
it('the glass edge is drawn after the front frame and before the lid', ...)
```

- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** — PASS.
- [ ] **Step 5: Check by hand:** move the pointer across the tank: rock and backdrop slide a few pixels, soil does not; no backdrop edge shows at the tank sides; toggle Depth off and the picture is still.
- [ ] **Step 6: Commit** `feat(render): three depth planes with parallax, haze and a glass edge`

### Task 10: Crisp sprites when zoomed

**Files:**
- Modify: `src/engine/sprites/spriteCache.ts`, `src/engine/render/specimens.ts`
- Test: `tests/unit/engine/sprites.test.ts`

- `getSharpSprite(id, base, devicePx, frame): HTMLCanvasElement` (7926–7943): returns `base` under 300 device px; otherwise a 512 px sprite from `drawSprite(ctx, id, 512)`, created at most once per `frame`, cached (cap 48, cleared by `configureSpriteCache`).
- `specimens.ts`: `devicePx = box.size * world.view.cam.z * min(devicePixelRatio, 2) * world.view.renderScale`.

- [ ] **Step 1: Write failing tests**

```ts
it('returns the 256 sprite under 300 device px', ...)
it('builds one 512 sprite per frame at most and reuses it afterwards', ...)
it('configureSpriteCache clears the 512 sprites', ...)
```

- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat(render): 512 px sprites for close-ups`

### Task 11: Adaptive resolution

**Files:**
- Modify: `src/engine/render/perf.ts`, `src/hooks/useTerrariumEngine.ts`, `src/components/stage/TerrariumCanvas.tsx`, `src/lib/terrariumCanvas.ts`
- Test: `tests/unit/engine/perf.test.ts`, `tests/unit/hooks/useTerrariumEngine.test.tsx`

**Interfaces:**
- `perf.ts`: `RENDER_STEPS = [1, 0.85, 0.72, 0.6] as const`; `perfStep(p: PerfState, view: ViewState, ts: number): void` — a port of 8094–8115 (with smooth drawing off: `renderScale = 1`, no trial).
- `terrariumCanvas.ts`: `setCanvasCssSize(w, h)` / `getCanvasCssSize()`. `TerrariumCanvas`'s `ResizeObserver` only records the CSS size.
- Hook, at the top of each frame: `scale = min(devicePixelRatio, 2) * (view.fastDraw ? view.renderScale : 1)`; when `floor(cssW * scale)` or `floor(cssH * scale)` differs from the backing store, resize it; `ctx.setTransform(scale, 0, 0, scale, 0, 0)`; `W = cssW`, `H = cssH`. Update the hook's doc comment (it says the component owns the size).

- [ ] **Step 1: Write failing tests**

```ts
// perf.test.ts
it('steps down after 90 slow frames and starts a trial', ...)
it('a trial that does not help by 8 % goes back and locks for 5 minutes', ...)
it('steps up after 480 fast frames', ...)
it('a raise that falls again within 20 s stays down for 2 minutes', ...)
it('smooth drawing off pins renderScale to 1', ...)
// useTerrariumEngine.test.tsx
it('the backing store follows renderScale and the CSS size, and is not resized when neither changed', ...)
```

- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** — PASS.
- [ ] **Step 5: Re-measure** every row of the table, smooth drawing on and off, including relax full screen at 200 % zoom.
- [ ] **Step 6: Commit** `perf(render): adaptive drawing resolution with a trial check`

### Task 12: End-to-end checks and verification

**Files:**
- Create: `tests/e2e/view.spec.ts`
- Modify: `tests/e2e/drag.spec.ts` (only if a helper is shared)

```ts
test('wheel zoom raises the percent and 0 returns to 100 %', ...)
test('drags a plant at 200 % zoom and it ends under the pointer', ...)        // read window.__botanica.world().items
test('double-click on a plant centres it; double-click on empty space goes home', ...)
test('the Depth toggle survives a reload', ...)
test('at 390×844 the tank opens framed (zoom > 100 %) and the controls do not overlap the care toolbar', ...)   // boundingBox intersection
test('in relax mode the view controls sit top right and hide when idle', ...)
test('Show frame rate shows a readout that contains "fps"', ...)
test('an evening visit moves the camera and Skip restores it', ...)           // preview a gap, start the visit
```

- [ ] **Step 1:** Write the spec. **Step 2:** `pnpm e2e` — the new spec and every existing spec PASS.
- [ ] **Step 3:** `pnpm typecheck && pnpm lint && pnpm vitest run tests/unit && pnpm build` — PASS.
- [ ] **Step 4:** Hand check in the built app (`pnpm preview`): every vessel shape (the globe and the teardrop clip the glass edge correctly), each lighting, lid on and off, reduced motion on (System Settings → Accessibility), snapshot PNG export while zoomed (it captures the zoomed view; that is accepted).
- [ ] **Step 5:** Fill the last column of the table. **Target:** relax full screen at 100 % ≥ 55 fps and at 200 % ≥ 50 fps with smooth drawing on. If the target is missed, do Task 13; if it is met, skip it and say so in the PR.
- [ ] **Step 6: Commit** `test(e2e): camera, depth toggle, phone framing and frame-rate readout`

### Task 13 (only if Task 12 misses the target): Cached still layers

In the prototype this helped software rendering (7.6 → 11.6 fps at 3782×1864) and made **no measurable difference** on the owner's GPU, so it is not built by default.

**Files:** create `src/engine/render/layers.ts`; modify `src/engine/render/renderFrame.ts`. Test: `tests/unit/engine/layers.test.ts`.

- `cachedLayer(name, sig, rect, scale, frame, paint)` / `blitLayer` (8132–8153); two layers cropped to the vessel rect × 1.04: `back` (glass tint + backdrop) and `mid` (lamp cone + `drawSubstrates(…, 'soil')`), signatures as in 8172–8189, repainted at least every 300 frames, bypassed while pouring and (for `mid`) above 135 % zoom. `drawSubstrates(…, 'soil')` does not read `timestamp` today; if that changes, the animated part must leave the layer.
- Tests: `repaints when the signature changes and not otherwise`, `bypassed while pouring`, `with smooth drawing off the frame is identical to the uncached one` (trace equality).
- Commit `perf(render): cache the backdrop and soil layers`.

---

## Measurements (fill in)

Built app, Chrome, Falls Lake tank, readout on, 10 s settled. Note the machine and the backing-store size.

| Row | Case | Before (Task 1) | After Task 2 | After Task 11 | Final (Task 12) |
|---|---|---|---|---|---|
| 1 | Studio, maximised, 100 % | not taken | | | |
| 2 | Relax full screen, 100 % | 60 fps · slowest 18 ms · 2740×1546 (owner's Mac, one reading) | | | |
| 3 | Row 2 with plain smoothing | not taken: row 2 already at 60 | n/a | n/a | n/a |
| 4 | Row 2 with hidden chrome `display: none` | not taken: row 2 already at 60 | n/a | n/a | n/a |
| 5 | Row 2 with DPR capped at 1.5 | not taken: row 2 already at 60 | n/a | n/a | n/a |
| 6 | Studio, 200 % | n/a | | | |
| 7 | Relax full screen, 200 % | n/a | | | |
| 8 | Phone 390×844 (device or emulation), framed start | n/a | | | |

Task 1 note: the 34 fps relax reading from before this plan did not reproduce in the built app (`pnpm preview`); relax full screen held 60 fps with the readout on. No change from rows 3–4 is kept, and no Performance trace was needed.
