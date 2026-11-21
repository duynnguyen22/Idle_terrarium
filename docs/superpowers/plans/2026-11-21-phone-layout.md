# Phone Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the phone layout that prototype v11 adds on top of v10. Portrait phones get a short top bar, a bottom tab bar and panels that slide up as resizable sheets. Short landscape screens get a side rail. Desktop does not change.

**Architecture:** One transient atom, `layoutModeAtom` (`'desktop' | 'phone' | 'land'`), is set by a `matchMedia` hook. Each component reads the atom and picks its class set in TypeScript. CSS variants are not used, so there are no cascade fights with the existing `max-lg:` drawer classes, and jsdom tests can assert on classes and attributes. The drawer state moves from `StudioLayout`'s `useState` to a store atom, because the tab bar, the catalog (peek on add) and the growth board all need it. A phone sheet is the existing left sidebar, right sidebar or growth board, restyled. The sheet's height lives in atoms, and a render-null component writes it to CSS variables on the root.

**Tech Stack:** React 19, TypeScript, Vite, Jotai, Tailwind 4, Radix (shadcn), Vitest, Playwright, pnpm.

**Spec:** `docs/reference/prototype-v11.html` (the live artifact, saved 2026-11-21). Line numbers below refer to this file. Every change from v10 is in `git diff --no-index docs/reference/prototype-v10.html docs/reference/prototype-v11.html` (282 lines). The sections are:
- phone CSS: 606–733 (shared `m-ui` rules 606–662, portrait 663–694, relax dock 695–715, landscape 716–733)
- phone rows in the More menu: 813–828
- tab bar: 850–856
- catalog peek: 3949
- `initPhoneLayout`: 8937–9059 (reframe 8965, sync 8975, openSheet 8985, peek 8995, drag 9003, menu proxies 9033, setMode 9044)

## Global Constraints

- Follow `CONTRIBUTING.md` and `docs/ARCHITECTURE.md`. Imports point down only: lib → data → store → engine | auth → services → hooks → components. `src/components/ui/` imports only `lib`.
- A file has at most 300 lines and a function at most 80. Never add an entry to `eslint.legacy.js`. Split anything that grows too long.
- No re-exports at old locations. `DrawerSide` moves from `TopNav.tsx` to `src/store/layout.ts`, so update its importers.
- Nothing new is saved. No storage key, saved field or `STUDIO_VERSION` changes. All new atoms are transient.
- Media queries are copied exactly: phone `(max-width: 640px)`, landscape `(max-height: 480px) and (orientation: landscape) and (max-width: 960px)`. Landscape wins when both match.
- Sizes are copied exactly:
  - tab bar 58 px; phone top bar 48 px; landscape rail 60 px
  - sheet heights: peek 0.27 × viewport, half 0.54 × viewport, full `max(200, innerHeight − 48 − 58 − 8)`
  - drag: smallest height 60 px, a move counts after 6 px, the sheet closes below `0.62 × peek`
  - touch targets: at least 44 px for tabs, care tools and menu rows; 40 px for view and light buttons
- UI text is copied exactly:
  - tabs: "Build", "Health", "Growth", "Relax", "More"; tab bar `aria-label="Sections"`
  - menu rows: "Sign in to save your work" / `Account: ${name}`, the group label "Time", "Live", "Pause", "1×", "5×", "Skip ahead one tank day", "Ambient sound" with "On"/"Off", "Save a snapshot picture"
  - grab handle `aria-label`: "Resize this panel. Tap to change its height, drag down to close"
- Desktop behaviour and the existing `tests/unit/components/drawers.test.tsx` must not change. Do not edit its assertions.
- Every task ends with `pnpm verify` passing. Prettier settings: no semicolons, single quotes, width 100.
- Commits use Conventional Commits and end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Rotating or resizing while a sheet is open.** The sheet height must be recomputed from the new viewport height, and phone ↔ landscape must keep the same panel open. Test in Task 2 (`useLayoutMode`: a resize updates `viewportHeightAtom`) and Task 1 (`sheetHeightPxAtom` follows `viewportHeightAtom`).
2. **Escape on a phone with a sheet open** closes only the sheet. The selection stays and relax mode stays off. The drawer and growth-board Escape handlers already do this. Test in Task 3.
3. **Entering relax from the tab bar** first closes the open sheet, then hides the tab bar and drops the stage's bottom margin. Test in Task 3.
4. **A drag that ends by `pointercancel`**, or is released below the close threshold, must not leave the drag height behind (`sheetDragPxAtom` back to `null`). Test in Task 4.
5. **Desktop is untouched.** In `'desktop'` mode the tab bar is not rendered, adding a catalog item never changes `sheetLevelAtom`, and the existing drawer tests pass unchanged. Test in Task 1 (peek guard) and Task 3 (no tab bar).

---

### Task 1: Layout state and sheet maths

**Files:**
- Create: `src/lib/sheetMath.ts`, `src/store/layout.ts`
- Test: `tests/unit/lib/sheetMath.test.ts`, `tests/unit/store/layout.test.ts`

**Interfaces:**
- Produces, in `src/lib/sheetMath.ts`:
  - `type SheetLevel = 'peek' | 'half' | 'full'`
  - `sheetLevelPx(level: SheetLevel, innerHeight: number): number`. Rounds peek and half; full is `Math.max(200, innerHeight - 48 - 58 - 8)`.
  - `nextTapLevel(level: SheetLevel): SheetLevel`. peek → half, half → full, full → half.
  - `snapDraggedSheet(px: number, innerHeight: number): SheetLevel | 'close'`. Returns `'close'` when `px < sheetLevelPx('peek', h) * 0.62`, otherwise the nearest level, with ties going to the earlier one in `['peek', 'half', 'full']`.
  - `clampDragPx(px: number, innerHeight: number): number`. Clamps to 60..full.
- Produces, in `src/store/layout.ts`:
  - `type LayoutMode = 'desktop' | 'phone' | 'land'`, `type DrawerSide = 'left' | 'right'`, `type SheetName = 'build' | 'health' | 'growth'`
  - `layoutModeFor(phoneMatches: boolean, landMatches: boolean): LayoutMode`
  - `layoutModeAtom` (default `'desktop'`), `viewportHeightAtom` (default `800`), `drawerAtom: DrawerSide | null`, `sheetLevelAtom` (default `'half'`), `sheetDragPxAtom: number | null`
  - derived `isHandheldAtom` (mode is not desktop)
  - derived `activeSheetAtom: SheetName | null`. Priority as at spec 8960: the growth board if it is open, then `left` → `'build'`, then `right` → `'health'`.
  - derived `sheetHeightPxAtom`: the drag height if one is set, else the level height. It is 0 when the mode is not `'phone'` or no sheet is open.
  - derived `stagePadPxAtom`: equals `sheetHeightPxAtom` in phone mode with a sheet open below `'full'`, otherwise 0. During a drag it follows the level height, not the drag height (spec 8979).
  - write `openSheetAtom(name: SheetName | null, level?: SheetLevel)`. Follows spec 8985–8993: it clears `drawerAtom`; closes the growth board when switching away from it; for a non-null name sets the level (default `'half'`); sets the drawer for build/health; for growth calls `openGrowthBoardAtom`, which also closes the away card.
  - write `peekBuildSheetAtom()`. In phone mode, with build open and the level not `'peek'`, it sets `'peek'`. Otherwise it does nothing.
  - Add `drawerAtom` to `resetOverlayAtom` in `src/store/overlay.ts`.

- [ ] **Step 1: Write the failing tests**

```ts
// sheetMath.test.ts, with innerHeight 800
expect(sheetLevelPx('peek', 800)).toBe(216)
expect(sheetLevelPx('half', 800)).toBe(432)
expect(sheetLevelPx('full', 800)).toBe(686)
expect(sheetLevelPx('full', 250)).toBe(200)
expect([nextTapLevel('peek'), nextTapLevel('half'), nextTapLevel('full')]).toEqual(['half', 'full', 'half'])
expect(snapDraggedSheet(133, 800)).toBe('close')   // 0.62 × 216 = 133.92
expect(snapDraggedSheet(134, 800)).toBe('peek')
expect(snapDraggedSheet(500, 800)).toBe('half')
expect(snapDraggedSheet(600, 800)).toBe('full')
expect(clampDragPx(10, 800)).toBe(60)
expect(clampDragPx(900, 800)).toBe(686)

// layout.test.ts, against a fresh createStore()
expect(layoutModeFor(true, true)).toBe('land')
expect(layoutModeFor(true, false)).toBe('phone')
expect(layoutModeFor(false, false)).toBe('desktop')
it('opening growth replaces build and closes the away card')
  // set awayIndexAtom 0, openSheet('build'), then openSheet('growth')
  // → drawerAtom null, growthBoardOpenAtom true, awayIndexAtom null, activeSheetAtom 'growth'
it('sheet height is 0 on desktop and follows the viewport on phone')
  // desktop + build open → 0; phone + build + viewport 800 → 432; viewport 600 → 324
it('stage pad is 0 at full and while closed')
it('stage pad keeps the level height while dragging')   // drag px 300 → height 300, pad 432
it('peek only acts on a phone with build open')         // desktop: level stays 'half'
```

- [ ] **Step 2: Run them and check they fail**

Run: `pnpm vitest run tests/unit/lib/sheetMath.test.ts tests/unit/store/layout.test.ts`
Expected: FAIL, because the modules do not exist.

- [ ] **Step 3: Implement `src/lib/sheetMath.ts` and `src/store/layout.ts` to the interfaces above, and extend `resetOverlayAtom`**

- [ ] **Step 4: Run them and check they pass, then run `pnpm verify`**

- [ ] **Step 5: Commit** `feat(store): add phone layout and sheet state`

---

### Task 2: Detect the mode and move the drawer into the store

**Files:**
- Create: `src/hooks/useLayoutMode.ts`
- Modify: `src/components/layout/StudioLayout.tsx`, `src/components/layout/TopNav.tsx` (import `DrawerSide` from `@/store/layout`; delete the local type)
- Test: `tests/unit/hooks/useLayoutMode.test.tsx`

**Interfaces:**
- Consumes: `layoutModeFor`, `layoutModeAtom`, `viewportHeightAtom`, `drawerAtom`, `isHandheldAtom` (Task 1).
- Produces: `useLayoutMode(): void`. It listens to both queries (`addEventListener('change')`, falling back to `addListener`) and to window `resize`, which sets `viewportHeightAtom` to `innerHeight`. If `matchMedia` is missing, it does nothing, like `useReducedMotion`.
- Produces: the `StudioLayout` root `<div>` gets `id="studio-root"` and `data-layout={mode}`. Later tasks and e2e tests read both.

- [ ] **Step 1: Write the failing test**

Stub `matchMedia` with a controllable `matches` per query.
- `it('sets phone, then land after a rotate')`: `layoutModeAtom` becomes `'phone'`; after both stubs flip and fire `change`, it becomes `'land'`.
- `it('tracks the viewport height on resize')`: set `innerHeight` to 600, dispatch `resize`, and expect `viewportHeightAtom` to be 600.

- [ ] **Step 2: Run it and check it fails**: `pnpm vitest run tests/unit/hooks/useLayoutMode.test.tsx`

- [ ] **Step 3: Implement the hook, then change `StudioLayout`**
  - Call `useLayoutMode()`.
  - Replace `useState<DrawerSide | null>` with `useAtom(drawerAtom)`, keeping both effects as they are.
  - Add an unmount cleanup that sets `drawerAtom` to `null`. It keeps the old per-mount reset, so `drawers.test.tsx` stays isolated.
  - Do not render the drawer scrim when handheld (spec 626).

- [ ] **Step 4: Run** `pnpm vitest run tests/unit/hooks/useLayoutMode.test.tsx tests/unit/components/drawers.test.tsx`. Both must pass with `drawers.test.tsx` unedited. Then run `pnpm verify`.

- [ ] **Step 5: Commit** `feat(layout): detect phone and landscape layouts`

---

### Task 3: Tab bar, bottom sheets and catalog peek

**Files:**
- Create: `src/components/layout/phone/PhoneTabBar.tsx`, `src/components/layout/phone/PhoneSheetVars.tsx`, `src/components/layout/phone/sheetClasses.ts`
- Modify: `StudioLayout.tsx` (render `<PhoneTabBar />` and `<PhoneSheetVars />`, plus the stage margin), `LeftSidebar.tsx`, `RightTelemetry.tsx`, `src/components/growth/GrowthBoard.tsx`, `src/components/catalog/CatalogGrid.tsx`
- Test: `tests/unit/components/phoneLayout.test.tsx`

**Interfaces:**
- Consumes: `openSheetAtom`, `activeSheetAtom`, `sheetHeightPxAtom`, `stagePadPxAtom`, `peekBuildSheetAtom`, `layoutModeAtom` (Task 1); `#studio-root` (Task 2).
- Produces:
  - `sheetClasses(mode: LayoutMode, open: boolean): string | null`. It returns the phone sheet or landscape panel classes, or `null` on desktop so the caller keeps its current classes. Phone (spec 670–676): fixed, `left-0 right-0`, `bottom-[calc(58px+env(safe-area-inset-bottom))]`, `h-[var(--sheet-h)]`, `rounded-t-[18px]`, translated down 112% when closed, `z-[44]`. Landscape (spec 727–729): fixed, full height, `left-[60px]`, `w-[min(350px,54vw)]`, translated −130% when closed.
  - `PhoneSheetVars` renders nothing. In an effect it writes `--sheet-h` and `--stage-pad` (px) onto `#studio-root`.
  - `PhoneTabBar` renders `<nav aria-label="Sections">` with `aria-pressed` tabs. Each tab is a `<button>`: an icon from spec 851–855 and the label.
    - It returns `null` on desktop or in relax mode.
    - On phone it is fixed to the bottom, 4 columns, `h-[calc(58px+env(safe-area-inset-bottom))]`.
    - On landscape it is a fixed left rail, `w-[60px]`, one column. The fifth tab, More, is added in Task 5.
    - A sheet tab calls `openSheetAtom(active === name ? null : name)`. Relax calls `openSheetAtom(null)`, then `enterRelax` (Task 5 moves `enterRelax` into a shared module; until then import it from where it lives).
- The stage `<main>` gets `mb-[calc(58px+env(safe-area-inset-bottom)+var(--stage-pad))]` on phone and `ml-[60px]` on landscape, and neither in relax mode.
- `CatalogGrid`'s `place` calls `appStore.set(peekBuildSheetAtom)` after placing, matching spec 3949.
- Phone touch sizes inside the panels (spec 686–688): sidebar tabs `min-h-[52px]`, `.seg` buttons 36 px, growth pace buttons 40 px. Sheets and tab icons take `motion-reduce:transition-none` (spec 733).
- The tab-bar test that presses Relax mocks `@/services/audio`, because `enterRelax` starts audio.

- [ ] **Step 1: Write the failing tests** (stub `matchMedia` so the phone query matches)
  - `it('renders no tab bar on desktop')`: `queryByRole('navigation', { name: 'Sections' })` is null.
  - `it('Build opens the left sidebar as a sheet and a second press closes it')`: check `aria-pressed` and `#left-sidebar[data-drawer-open]`.
  - `it('Health replaces Build')`.
  - `it('Growth opens the growth board and closes the away card')`.
  - `it('Escape closes the sheet but keeps the selection')`.
  - `it('Relax closes the sheet and hides the tab bar')`: afterwards `relaxModeAtom` is true, `drawerAtom` is null and the nav is gone.
  - `it('writes the sheet height to #studio-root')`: with viewport 800 and Build open, `--sheet-h` is `432px`.
  - `it('placing a catalog card drops the Build sheet to peek')`: render `CatalogGrid category="flora"` with a stub world registered through the engine bridge, as `sidebar.test.tsx` does; after a card click, `sheetLevelAtom` is `'peek'`.

- [ ] **Step 2: Run them and check they fail**: `pnpm vitest run tests/unit/components/phoneLayout.test.tsx`

- [ ] **Step 3: Implement `sheetClasses`, `PhoneSheetVars` and `PhoneTabBar`**, then wire the sidebars, the growth board, the stage margin and the catalog peek. The sidebars and the growth board use `cn(sheetClasses(mode, open) ?? <current classes>)`.

- [ ] **Step 4: Run the tests and `pnpm verify`**

- [ ] **Step 5: Commit** `feat(layout): bottom tab bar and phone sheets`

---

### Task 4: Grab handle, tap to step and drag to resize

**Files:**
- Create: `src/components/layout/phone/SheetGrab.tsx`
- Modify: `LeftSidebar.tsx`, `RightTelemetry.tsx`, `GrowthBoard.tsx` (render `<SheetGrab />` first when `mode === 'phone'`)
- Test: `tests/unit/components/sheetGrab.test.tsx`

**Interfaces:**
- Consumes: `nextTapLevel`, `snapDraggedSheet`, `clampDragPx`, `sheetLevelPx` (Task 1); `sheetLevelAtom`, `sheetDragPxAtom`, `viewportHeightAtom`, `openSheetAtom`.
- Produces: `SheetGrab()`, a `<button type="button">` with the spec `aria-label`, `touch-action: none`, 26 px tall, holding a 40×4 px pill (spec 680–684).
  - `pointerdown` captures the pointer and records the start Y and height.
  - `pointermove` past 6 px sets `sheetDragPxAtom` to `clampDragPx(startH + (startY − y))`.
  - `pointerup` without a move sets `nextTapLevel`. After a move, it either closes the sheet (`openSheetAtom(null)`) or sets the snapped level.
  - Both `pointerup` and `pointercancel` reset `sheetDragPxAtom` to `null`.
- While dragging, the sheet drops its height transition (spec 678). Set `data-dragging` on the sheet from `sheetDragPxAtom !== null`.
- In `RightTelemetry`, which scrolls and has 16 px padding, the grab is `sticky top-0 z-[3] -mx-4 -mb-2` (spec 683). In the left sidebar its background is the tab-bar sand colour (spec 684).

- [ ] **Step 1: Write the failing tests** (viewport 800, phone, Build open at `'half'`)
  - `it('a tap steps half → full → half')`.
  - `it('dragging up 200px from half snaps to full')`: 432 + 200 = 632, which is nearest full (686).
  - `it('dragging down to 100px closes the sheet')`: `drawerAtom` becomes null.
  - `it('pointercancel mid-drag clears the drag height and keeps the level')`.

- [ ] **Step 2: Run them and check they fail**: `pnpm vitest run tests/unit/components/sheetGrab.test.tsx`

- [ ] **Step 3: Implement `SheetGrab` and mount it**

- [ ] **Step 4: Run the tests and `pnpm verify`**

- [ ] **Step 5: Commit** `feat(layout): resize phone sheets with a grab handle`

---

### Task 5: Short top bar and the More menu on phone and landscape

**Files:**
- Create: `src/components/nav/studioActions.ts`, `src/components/nav/speeds.ts`, `src/components/nav/MoreMenuPhoneGroup.tsx`
- Modify: `UtilityActions.tsx`, `ClockSpeedPill.tsx`, `MoreMenu.tsx`, `TopNav.tsx`, `src/components/layout/phone/PhoneTabBar.tsx`
- Test: `tests/unit/components/moreMenuPhone.test.tsx`

**Interfaces:**
- Produces, in `studioActions.ts`: `enterRelax()`, `toggleAudio()` and `takeSnapshot(): Promise<void>`, moved unchanged from `UtilityActions.tsx`. Leave no copy behind.
- Produces, in `speeds.ts`: `type SpeedId`, `SPEEDS`, `activeSpeed(realTime: boolean, speed: number): SpeedId | ''` and `applySpeed(id: string): void`. `applySpeed` sets `realTimeModeAtom` and `timeSpeedAtom` through `appStore` and shows the toast. They are moved from `ClockSpeedPill`, which now uses them.
- Produces: `MoreMenu({ trigger }: { trigger?: 'icon' | 'rail' })`.
  - `'rail'` renders the More tab as the trigger, with content `side="right" align="end"`.
  - When handheld, the content is `w-[calc(100vw-16px)]` (phone) or `w-[300px]` (landscape), with rows at least 44 px tall.
  - When handheld it also renders `<MoreMenuPhoneGroup />` first, then a separator (spec 813–828).
- `MoreMenuPhoneGroup` has these rows:
  - Account: label from `panelOpenAtom`'s source data (signed out → "Sign in to save your work", otherwise `Account: ${name}`); `onSelect` runs `useAccountActions().openPanel`.
  - The "Time" label, then 4 toggle items with `aria-pressed` from `activeSpeed`.
  - "Skip ahead one tank day" (`showToast(plusOneDay())`).
  - "Ambient sound" with `<small>` "On"/"Off" from `audioEnabledAtom`.
  - "Save a snapshot picture".
- Handheld top bar (spec 663–669):
  - `TopNav` returns `null` in landscape. On phone it is 48 px tall and keeps the logo, "Botanica" (17 px, hidden below 380 px) and the clock.
  - `ClockSpeedPill` leaves out the speed toggle and "+1 day" when handheld.
  - `UtilityActions` renders only `<MoreMenu />` (a 40 px button) when handheld.
  - Hide the drawer buttons when handheld.
- `PhoneTabBar` adds `<MoreMenu trigger="rail" />` as a fifth tab in landscape only.

- [ ] **Step 1: Write the failing tests**
  - `it('phone top bar keeps only the clock and More')`: no "Relax", "Growth", "Snapshot", "+1 day" or "Toggle catalog panel".
  - `it('menu Time row reflects and sets the speed')`: press "5×", then `timeSpeedAtom` is 5 and the 5× row has `aria-pressed="true"`.
  - `it('Ambient sound row shows Off then On')`: mock `@/services/audio` as `moreMenu.test.tsx` does.
  - `it('signed-out account row opens the account panel')`.
  - `it('landscape renders no header and a More tab in the rail')`.
  - `it('desktop menu has no phone rows')`: "Skip ahead one tank day" is absent.

- [ ] **Step 2: Run them and check they fail**: `pnpm vitest run tests/unit/components/moreMenuPhone.test.tsx`

- [ ] **Step 3: Extract `studioActions.ts` and `speeds.ts`, then build the phone group and the top-bar changes.** Run `pnpm vitest run tests/unit/components/moreMenu.test.tsx tests/unit/components/studio.test.tsx` after the extraction, before any new UI. Both must pass unedited. That proves the move is a pure refactor.

- [ ] **Step 4: Run all the tests and `pnpm verify`**

- [ ] **Step 5: Commit** in two parts, `refactor(nav): share studio actions and speed table`, then `feat(nav): phone top bar and More menu rows`

---

### Task 6: Stage overlays sized for touch

**Files:**
- Modify: `src/components/stage/CareToolbar.tsx`, `ViewControls.tsx`, `src/components/nav/LightingControls.tsx`, `ItemInspector.tsx`, `AwayCard.tsx`, `PerfHud.tsx`, `TourCaption.tsx`
- Test: extend `tests/unit/components/viewControls.test.tsx` with new `it` blocks only, and create `tests/unit/components/careToolbarPhone.test.tsx`

**Interfaces:**
- Consumes: `isHandheldAtom`, `layoutModeAtom`, `stagePadPxAtom`.
- Values from spec 634–661:
  - care tools: 44×44, icon only, the label kept as `aria-label` and `title`; the pour indicator keeps its label, cut off at 96 px
  - view controls: a vertical stack at `right-2.5 bottom-[72px]`, 40 px buttons, zoom −/+ hidden; while `stagePadPxAtom > 0` the percent button and the divider hide too; in relax mode they sit at `top-[calc(12px+env(safe-area-inset-top))] right-3`; on landscape `bottom-1.5`
  - light buttons: 40 px; inspector: `top-[60px] inset-x-2`
  - away card: `inset-x-2 bottom-2 max-h-[64%]` with 44 px action buttons
  - perf HUD: `bottom-[72px] left-2`; tour caption on phone: `bottom-[calc(132px+env(safe-area-inset-bottom))]`

- [ ] **Step 1: Write the failing tests**
  - `it('care tools are icon buttons named by their label on a phone')`: `getByRole('button', { name: 'Mist Spray' })` has no visible text node.
  - `it('phone view controls hide zoom in/out')`.
  - `it('a peeking sheet hides the percent button')`: set `stagePadPxAtom`'s inputs so the pad is greater than 0.

- [ ] **Step 2: Run them and check they fail**

- [ ] **Step 3: Implement the class switches** with `cn(..., handheld && '...')`

- [ ] **Step 4: Run the tests and `pnpm verify`**

- [ ] **Step 5: Commit** `feat(stage): touch-sized tools and overlays on phones`

---

### Task 7: Relax dock in two rows

**Files:**
- Modify: `src/components/stage/RelaxDock.tsx`, `src/components/stage/RelaxDockControls.tsx`
- Test: `tests/unit/components/relaxDockPhone.test.tsx`

**Interfaces:**
- Values from spec 695–714. On phone:
  - The dock is `inset-x-2 bottom-[calc(10px+env(safe-area-inset-bottom))]` with no translate, `flex-wrap justify-between`, `rounded-[24px]`.
  - The "Sanctuary" mark, the dividers and the exit key hint are hidden.
  - Row 1 is the sound trigger (it grows, its label is cut off) and the volume controls (range 104 px).
  - Row 2 is the light choices and the exit button (40 px tall, pill, light background).
  - Below 400 px the exit padding is 11 px.

- [ ] **Step 1: Write the failing test** `it('phone dock hides the Sanctuary mark and wraps')`: in phone mode with relax on, "Sanctuary" is not in the document and the dock has `flex-wrap`.

- [ ] **Step 2–4: Run it and check it fails, implement, then run the tests and `pnpm verify`**

- [ ] **Step 5: Commit** `feat(stage): two-row relax dock on phones`

---

### Task 8: Keep the plants framed when a sheet changes size

**Files:**
- Create: `src/hooks/usePhoneReframe.ts`
- Modify: `StudioLayout.tsx` (call it)
- Test: `tests/unit/hooks/usePhoneReframe.test.tsx`

**Interfaces:**
- Consumes: `stagePadPxAtom`, `isHandheldAtom`, `relaxModeAtom`; `frameThePlants(relaxMode)` from `@/hooks/useKeyboardShortcuts`; `tryGetWorld`.
- Produces:
  - `camUntouched(t: Cam, auto: Cam | null, tol = 0.02): boolean`, exported for the test. It is true when `auto` is null or when z, u and v are each within `tol`.
  - `usePhoneReframe(): void`. When `stagePadPxAtom` changes, or the mode changes, it waits two animation frames, as at spec 8965–8972. Then, if handheld, not relaxing, the world has items, `view.follow` is null and `camUntouched(view.camT, autoCam)`, it calls `frameThePlants(false)` and stores a copy of `view.camT` as `autoCam`.
  - Changing between handheld and desktop resets `autoCam` to `null` (spec 9049).

- [ ] **Step 1: Write the failing tests**
  - `camUntouched`: null → true; a 0.01 difference → true; 0.03 → false.
  - `it('reframes when a sheet opens, but not after the user zoomed')`: register a stub world, spy on `framePlants`, flush rAF with `vi.useFakeTimers` and a `requestAnimationFrame` stub, change `camT.z` by 0.5 and open a sheet, then expect no second call.

- [ ] **Step 2–4: Run them and check they fail, implement, then run the tests and `pnpm verify`**

- [ ] **Step 5: Commit** `feat(view): keep plants framed as phone sheets resize`

---

### Task 9: Phone e2e tests and docs

**Files:**
- Create: `tests/e2e/phone.spec.ts`
- Modify: `docs/FEATURE_MAP.md` (add a "Phone layout" entry that names the files from Tasks 1–8, and say there is no storage key)

**Interfaces:**
- Consumes: `dismissWelcomePrompt` (`tests/e2e/helpers.ts`), `#studio-root[data-layout]`, `window.__botanica`.

- [ ] **Step 1: Write the spec**
  - `test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })` for the portrait block.
  - `test('portrait shows the tab bar and opens Build as a sheet')`: `data-layout="phone"`; tapping Build makes `#left-sidebar` visible, and its bounding box bottom is at `844 − 58`, within 2 px.
  - `test('dragging the handle down closes the sheet')`: use `page.mouse` from the grab centre down 400 px.
  - `test('adding a plant peeks the sheet and keeps the canvas visible')`.
  - In a `describe` with `viewport: { width: 844, height: 390 }`: `test('short landscape uses the side rail')`: `data-layout="land"`, `#top-nav` is absent and the More tab opens the menu.
  - `test('desktop is unchanged')` at 1280×800: `data-layout="desktop"` and no Sections nav.

- [ ] **Step 2: Run** `pnpm e2e tests/e2e/phone.spec.ts`. Expected: PASS. Then run the full `pnpm e2e`, `pnpm build` and `pnpm verify`.

- [ ] **Step 3: Commit** `test(e2e): phone and landscape layouts` and `docs: map the phone layout`
