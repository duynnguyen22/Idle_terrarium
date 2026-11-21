# Feature map

This page lists every feature a player can see, and for each one: where its code lives, what state
and saved data it touches, which tests guard it, and what you must not break.

Read [ARCHITECTURE.md](ARCHITECTURE.md) first. It explains the layers and the two kinds of state
(the engine world and the atoms). This page assumes you know them.

**How to use this page.** Find the feature you are changing. Open the files in its "Code" row. Run
the tests in its "Tests" row while you work. Read its "Watch out" row before you open a pull
request.

## Contents

1. [The screen at a glance](#the-screen-at-a-glance)
2. [Building the tank](#building-the-tank): vessel, catalog, placing and dragging, pouring, room
3. [The living tank](#the-living-tank): simulation, care, gauges, lighting and lamp colour
4. [Living time](#living-time): pace, catch-up, away card, evening visit, growth board
5. [Looking at the tank](#looking-at-the-tank): camera, depth, backdrops, performance, phone layout
6. [Relax mode and sound](#relax-mode-and-sound)
7. [Account and saved gardens](#account-and-saved-gardens)
8. [Saving and loading](#saving-and-loading)
9. [Storage key registry](#storage-key-registry)
10. [Rules that protect players' data](#rules-that-protect-players-data)
11. [Debugging](#debugging)
12. [Keeping this map current](#keeping-this-map-current)

## The screen at a glance

`src/App.tsx` renders `StudioLayout` (`src/components/layout/StudioLayout.tsx`). The screen has
four regions:

```
+------------------------------------------------------------------+
| TopNav: clock & speed, lighting, utility actions, More menu,     |
|         account chip                     (components/nav, account)
+--------------+-----------------------------------+---------------+
| LeftSidebar  | TerrariumCanvas                   | RightTelemetry|
| six tabs:    |   the <canvas> the engine draws   | gauges, eco   |
| Vessel Flora |   + CareToolbar, ItemInspector,   | stats,        |
| Hardscape    |     ViewControls, AwayCard,       | Botanist's    |
| Decor Fauna  |     TourCaption, RelaxDock,       | Notes         |
| Room         |     PerfHud    (components/stage) | (telemetry)   |
| (catalog)    |                                   |               |
+--------------+-----------------------------------+---------------+
  Overlays on top: GrowthBoard (components/growth), AccountDialog
```

The engine starts in `useTerrariumEngine` (`src/hooks/useTerrariumEngine.ts`), which
`TerrariumCanvas` calls. That hook builds the world, runs the frame loop
(`src/hooks/engineFrameLoop.ts`) and starts the time-away catch-up
(`src/hooks/engineCatchUp.ts`).

Keyboard shortcuts are in `src/hooks/useKeyboardShortcuts.ts`: **R** toggles relax mode,
**Escape** leaves relax mode or clears the selection, **F** frames the plants, **0** shows the
whole tank. They are ignored while the player types in a field.

## Building the tank

### Vessel and hardware

| | |
|---|---|
| What the player sees | The Vessel tab: tank shapes, lid, grow lamp, fogger, pump flow, substrate sliders, backdrop. |
| Code | UI: `src/components/catalog/VesselTab.tsx`, `VesselGrid.tsx`, `HardwarePanel.tsx`, `HardwareRow.tsx`, `PumpFlowControl.tsx`, `SubstrateSliders.tsx`, `vesselPreview.ts` (thumbnails). Data: `src/data/vessels.ts`, `src/data/substrates.ts`. Shape: `src/engine/geometry.ts`. Drawing: `src/engine/render/vessel.ts`, `frame.ts`, `substrates.ts`, `water.ts`. |
| State | Studio atoms `vessel`, `hasLid`, `hasGrowLamp`, `hasFogger`, `pumpFlow`, `substrates`, `waterSplit`. All saved. |
| Tests | `tests/unit/engine/geometry.test.ts`, `tests/unit/components/studio.test.tsx`, `tests/e2e/studio.spec.ts`, `tests/e2e/pool.spec.ts` |
| Watch out | Item x positions are scaled by each vessel's `kx`. Switching vessel must keep children on their parents (`syncChildren` in `src/engine/simulation/tick.ts`). `waterSplit` is capped at 60% of the tank width (`src/store/migrations.ts`). |

### Catalog: flora, hardscape, decor, fauna

| | |
|---|---|
| What the player sees | The Flora, Hardscape, Decor and Fauna tabs: cards with a drawn thumbnail. Click to place, or drag onto the tank. Flora has a planting-stage toggle (sprout or mature). |
| Code | Data: `src/data/catalog/` (`flora.ts`, `hardscape.ts`, `decor.ts`, `fauna.ts`; `index.ts` exports `ALL_CATALOG_DEFS` and `findCatalogDef`). Sprites: `src/engine/sprites/` (`flora.ts`, `hardscape.ts`, `decor/`, `fauna/`, `faunaExtra/`), drawn through `drawSprite.ts` and cached by `spriteCache.ts`. UI: `src/components/catalog/CatalogGrid.tsx`, `GroupedCatalogGrid.tsx`, `CatalogCard.tsx`, `PlantingStageToggle.tsx`; thumbnails from `src/hooks/useSpriteThumbnail.ts`. |
| State | Placed items live in the engine world (`world.items`), not in atoms. `plantingStage` is a studio atom. |
| Tests | `tests/unit/data/data.test.ts`, `tests/unit/data/decor.test.ts`, `tests/unit/engine/sprites.test.ts`, `tests/unit/components/sidebar.test.tsx` |
| Watch out | A catalog id is a saved value: it is stored in every garden. **Never rename or remove an id.** Every catalog id needs a sprite under the same id. Decor that glows at night needs `glowAt` and `glowR` (drawn by `src/engine/render/glow.ts`). |

To add a species or a figurine, follow "Where do I put...?" in [ARCHITECTURE.md](ARCHITECTURE.md).

### Placing, dragging, mounting and inspecting

| | |
|---|---|
| What the player sees | Click an item to select it. The inspector shows its details and controls. Drag to move it. Plants and small decor snap onto glowing rock ledges. |
| Code | Hit tests and dragging: `src/engine/interaction.ts`. Item rules (grounding, mounting, inspector steps): `src/engine/items.ts`. Pointer wiring: `src/components/stage/canvasPointerDown.ts`, `canvasGesture.ts`, `canvasCoordinates.ts`, `useWindowPointerTracking.ts`. Inspector: `ItemInspector.tsx`, `ItemInspectorControls.tsx`. Selection rings: `src/engine/marks.ts`, `src/engine/render/marks.ts`. |
| State | `world.items`, `world.draggingId` (engine world). `selectedId` (studio atom). |
| Tests | `tests/unit/engine/interaction.test.ts`, `tests/unit/engine/items.test.ts`, `tests/e2e/drag.spec.ts` |
| Watch out | A mounted item has a `parentUid` and offsets. When its parent goes, the child is detached (`syncChildren`), never left pointing at nothing. Change the world only through `mutateWorld` (see ARCHITECTURE.md). |

### Pouring substrates and water

| | |
|---|---|
| What the player sees | Pour gravel, soil or water from containers. Grains fall and settle. The first water to land makes a pool. |
| Code | Simulation: `src/engine/simulation/pouring.ts`. Drawing: `src/engine/render/pouring.ts`. UI: `src/components/catalog/PourContainersGrid.tsx`. |
| State | `activeTool`, `activePourMaterial`, `substrates`, `waterSplit` (studio atoms). Falling grains live in the world. |
| Tests | `tests/e2e/pool.spec.ts`, `tests/unit/engine/simulation/simulation.test.ts` |
| Watch out | A new pool starts its nitrogen cycle (`cycleProgress`, `src/engine/care/cycle.ts`). Fish in an uncycled pool raise a care warning. That is intended. |

### Room

| | |
|---|---|
| What the player sees | The Room tab: water source, minerals, pH, outdoor air, air purifier. These feed the care report and the spots on the glass. |
| Code | Data: `src/data/room.ts`. Model: `src/engine/room.ts` (`envModel`). UI: `src/components/catalog/RoomTab.tsx`, `RoomWaterTuning.tsx`, `EnvOptionList.tsx`. Care rules: `src/engine/care/envIssues.ts`. |
| State | `room`, `mineralSpots` (studio atoms, saved). |
| Tests | `tests/unit/engine/room.test.ts`, `tests/unit/components/roomTab.test.tsx`, `tests/e2e/room.spec.ts` |

### Presets and biome recipes

| | |
|---|---|
| What the player sees | Ready-made biomes, and "Rebuild Falls Lake" in the More menu. |
| Code | Data: `src/data/presets.ts`. Apply: `src/engine/presets.ts` (`applyPreset`). UI: `src/components/catalog/BiomeRecipes.tsx`, `src/components/nav/moreMenuActions.ts`. |
| Tests | `tests/unit/engine/seeding.test.ts` |
| Watch out | The tests count the items in each preset (Falls Lake has 21). Adding an item to a preset is a behavior change, so update the count on purpose and say so in the pull request. |

## The living tank

### The frame loop and the simulation

Each animation frame, `createFrameLoop` (`src/hooks/engineFrameLoop.ts`) calls `tick`
(`src/engine/simulation/tick.ts`) and then `renderFrame` (`src/engine/render/renderFrame.ts`).
`tick` runs these steps in order:

| Step | File in `src/engine/simulation/` | What it does |
|---|---|---|
| Clock | `clock.ts`, `phases.ts` | Advances the tank clock; picks dawn, day, twilight or night. |
| Environment | `environment.ts`, `../world.ts`, `../room.ts` | Eases humidity, temperature, soil moisture, nutrients and air quality toward targets set by the build. |
| Animals | `fauna.ts` | Wander, rest, swim, graze. Each animal keeps to its band (pool, shore, land). |
| Particles | `particles.ts`, `mist.ts`, `pouring.ts` | Motes, fireflies, mist, falling grains. |
| Tank day | `dayTick.ts`, `ecology.ts`, `life.ts`, `breed.ts`, `moss.ts` | Once per tank day: growth, blooms and fronds, breeding and hunting, moss spread, the pool's cycle. |
| Mold | `mold.ts` | A mold bloom on new builds. Springtails and isopods clean it up. |
| Care | `../care/` | Recomputes the care report into `world.careIssues`. |
| Store flush | `telemetry.ts` | Writes gauges and changed saved fields to atoms, at most 4 times a second. |

| | |
|---|---|
| Tests | Everything in `tests/unit/engine/simulation/`. `catchup.test.ts`, `life.test.ts`, `ecology.test.ts` and `breed.test.ts` matter most. |
| Watch out | `tick` runs about 60 times a second, so keep it fast. Do not call `store.set` from a step; `pushTelemetry` is the only writer. The simulation takes a random source (`Rng`) as input so tests and the catch-up repeat exactly. Inside a step, use the `rng` you are given, never `Math.random`. |

**What may and may not die.** This is a calm game, and these limits are deliberate:

- Plants never die. A struggling plant rests at a vitality floor (`ecology.ts`).
- Dart frogs eat feeder prey (springtails, dwarf white isopods). `huntStep` in `breed.ts` takes one
  prey only while the player is watching, **never during time away**, and **never the last two**.
- Nothing else removes items. Keep it that way unless a spec says otherwise.

### Care report and Botanist's Notes

| | |
|---|---|
| What the player sees | The Botanist's Notes in the right panel: a short list of warnings and tips, some with a one-click fix button. |
| Code | Rules: `src/engine/care/report.ts` (`computeCareReport`), `envIssues.ts` (room, water, air, glass), `faunaMix.ts` (tankmates), `ranges.ts` (ideal ranges per species). Actions: `src/engine/care/actions.ts` (`runCareAction`). Ids and types: `src/data/care.ts`. UI: `src/components/telemetry/BotanistNotes.tsx`, `src/components/stage/CareToolbar.tsx`. |
| Tests | `tests/unit/engine/care.test.ts` |
| Watch out | The report is ordered, and a journal entry keeps only the first few issues (`MAX_ISSUES` in `src/services/account/constants.ts`). Put serious problems first. A new action needs a `CareActionId` in `src/data/care.ts` and a case in `runCareAction`. |

### Gauges

| | |
|---|---|
| What the player sees | Humidity, temperature, soil moisture, nutrients and more, in the right panel. |
| Code | Atom: `src/store/telemetry.ts`. Writer: `src/engine/simulation/telemetry.ts`. UI: `src/components/layout/RightTelemetry.tsx`, `ClimateGauges.tsx`, `BiosphereGauges.tsx`, `src/components/telemetry/GaugeBar.tsx`, `EcoStats.tsx`. |
| State | The telemetry atom (not saved). The environment seed `envSeed` (saved, written at most every 5 seconds) lets the gauges resume after a reload. |
| Tests | `tests/unit/store/telemetry.test.ts` |

### Lighting, day cycle and lamp colour

| | |
|---|---|
| What the player sees | Lighting presets and auto light sync in the top bar. Time speed. A grow lamp with white (6500 K) or warm (3000 K) light. |
| Code | UI: `src/components/nav/LightingControls.tsx`, `ClockSpeedPill.tsx`, `src/components/catalog/LampColorControl.tsx`. Effect on growth: `lightDose` and `growthFactor` in `src/engine/simulation/life.ts` (warm light grows plants 10% slower, `WARM_LIGHT_FACTOR`). Drawing: `src/engine/render/lamp.ts`, `vessel.ts`, `background.ts`, `glow.ts`. |
| State | `lighting`, `autoLightSync`, `timeSpeed`, `realTimeMode`, `hasGrowLamp`, `lampColor` (studio atoms, saved). |
| Tests | `tests/unit/components/lampColor.test.tsx`, `tests/unit/engine/glow.test.ts`, `tests/unit/engine/simulation/life.test.ts` |
| Watch out | `lampColor` arrived in save version 5; `migrateV4toV5` gives older saves `'white'`. `timeSpeed` 0 pauses the whole simulation, ambient motes included. |

## Living time

This is what makes Botanica an idle game: the tank keeps living while the app is closed. The design
is in [the living-time spec](superpowers/specs/2026-11-11-living-time-design.md).

### Pace

| | |
|---|---|
| What the player sees | A pace toggle: Brisk (1 tank day = 30 min), Garden (2 h, the default), Calm (6 h), Real life (1 day). |
| Code | `src/data/pace.ts` (`PACES`), `src/engine/simulation/pace.ts`, UI `src/components/growth/GrowthPaceToggle.tsx`. |
| State | `pace` (studio atom, saved). |
| Tests | `tests/unit/engine/simulation/pace.test.ts` |

### Catch-up and the away card

| | |
|---|---|
| What the player sees | Come back after 10 minutes or more, and the tank has grown. A card shows what happened while you were away. |
| Code | Simulation: `src/engine/simulation/catchup.ts` (`runCatchUpIfDue`; `CATCHUP_MIN_GAP_MS` = 10 min, `CATCHUP_MAX_DAYS` = 30). Report text: `src/engine/simulation/report.ts`. Trigger: `src/hooks/engineCatchUp.ts` (on load, after a saved garden replaces the world, on each return to the tab). After the catch-up: `recordReport` in `src/services/awayFlow.ts`. Card: `src/components/stage/AwayCard.tsx`, `AwayCardSections.tsx`. |
| State | `lastSimulatedAt`, `catchupEnabled`, `worldSeed`, `awayLog` (studio atoms, saved; the log keeps the newest 12, `AWAY_LOG_MAX`). `awayIndexAtom` in `src/store/overlay.ts` (which report the card shows; not saved). |
| Tests | `tests/unit/engine/simulation/catchup.test.ts`, `tests/unit/services/awayFlow.test.ts`, `tests/unit/components/awayCard.test.tsx`, `tests/e2e/livingTime.spec.ts` |
| Watch out | The catch-up is **deterministic**: its random source is seeded from `worldSeed` and the start of the gap, so the same gap always gives the same result. Never use `Math.random` in a catch-up path. The catch-up waits while the account phase is `'checking'`, because sign-in may still swap in a saved garden. If a catch-up throws, `engineCatchUp.ts` skips that gap and moves `lastSimulatedAt` forward, so one bad save cannot break every reload. |

### "+1 day", preview gaps and the evening visit

| | |
|---|---|
| What the player sees | In the More menu: jump the tank forward one day, or preview an 8 h, 1 day, 3 day or 1 week absence. In relax mode in the evening, a short tour pings the items that changed. |
| Code | `plusOneDay`, `previewGap` and `startEveningVisit` in `src/services/awayFlow.ts`. Menu: `src/components/nav/MoreMenuTimeAwayGroup.tsx`, `moreMenuActions.ts` (`GAPS`). Tour: `src/hooks/useTour.ts`, `src/components/stage/TourCaption.tsx`, `tourAtom` in `src/store/overlay.ts`. |
| Tests | `tests/unit/services/awayFlow.test.ts`, `tests/unit/hooks/useTour.test.tsx`, `tests/unit/components/moreMenu.test.tsx` |
| Watch out | `previewGap` is how you test the away card by hand. You do not need to wait 10 minutes. |

### Growth board

| | |
|---|---|
| What the player sees | A board with every plant and animal: its stage, its progress, what comes next. |
| Code | `src/components/growth/` (`GrowthBoard.tsx` and its sections; rows built in `growthRows.ts`). Opened from `src/components/nav/UtilityActions.tsx` through `openGrowthBoardAtom`. |
| Tests | `tests/unit/components/growth/` |
| Watch out | The growth board and the away card close each other (`src/store/overlay.ts`). Keep that pairing if you add another overlay. |

## Looking at the tank

| | |
|---|---|
| What the player sees | Zoom and pan (wheel, pinch, buttons), frame the plants (F), whole tank (0), a depth effect, smooth drawing, a frame-rate readout, painted or photo backdrops with haze. |
| Code | Camera: `src/engine/view.ts`, `src/engine/viewInput.ts`, `src/components/stage/ViewControls.tsx`, `useWheelZoom.ts`. Depth: `src/engine/render/depth.ts`. Performance: `src/engine/render/perf.ts`, `src/components/stage/PerfHud.tsx`, `src/engine/sprites/gpuImage.ts`. Backdrops: `src/data/backdrops.ts`, `src/engine/render/backdrop.ts`, `src/engine/render/backdropPainters/` (one file per scene), `src/lib/backdropPhoto.ts`, UI `src/components/catalog/BackdropSection.tsx` and its siblings. Drawing options: `src/components/nav/MoreMenuDrawingGroup.tsx`. |
| State | `depthOnAtom`, `smoothDrawingAtom`, `perfHudAtom` in `src/store/view.ts` (saved under their own key). `zoomPctAtom`, `perfTextAtom` (not saved). `backdrop`, `backdropHaze` (studio atoms, saved). The camera itself is `world.view`. |
| Tests | `tests/unit/engine/view.test.ts`, `viewInput.test.ts`, `depth.test.ts`, `perf.test.ts`, `backdrop.test.ts`, `tests/unit/lib/backdropPhoto.test.ts`, `tests/e2e/view.spec.ts` |
| Watch out | View preferences describe the device, not the garden. They never go into the studio save or a garden snapshot. The canvas backing store is sized only in `useTerrariumEngine` (setting width or height clears the canvas), so do not size it anywhere else. |

Saving a PNG of the tank: `src/lib/snapshot.ts` (`exportSnapshotPng`; file name
`botanica-living-biosphere-day-N`). Tested in `tests/unit/engine/snapshot.test.ts`.

### Phone layout

| | |
|---|---|
| What the player sees | On a phone (width up to 640 px) a tab bar sits at the bottom: Build, Health, Growth, Relax. Build, Health and Growth open as a bottom sheet with a grab handle: tap it to step the height, drag it down to close. Adding a catalog item shrinks the Build sheet to its peek height so the tank stays in view. In short landscape (height up to 480 px) the tabs become a left rail with a fifth More tab, the top bar is gone, and the panels open beside the rail. The More menu gains the Time, Live, Pause, 1×, 5×, +1 day, sound and snapshot rows that the phone top bar has no room for. Desktop is unchanged. |
| Code | Layout mode and sheet math: `src/hooks/useLayoutMode.ts` (mirrors the two media queries), `src/store/layout.ts` (atoms), `src/lib/sheetMath.ts` (levels, snapping, drag clamp). Reframing when a sheet or rotation changes the stage: `src/hooks/usePhoneReframe.ts`. Chrome: `src/components/layout/phone/` (`PhoneTabBar.tsx`, `TabButton.tsx`, `SheetGrab.tsx`, `PhoneSheetVars.tsx`, `sheetClasses.ts`), `src/components/layout/useDrawerA11y.ts`. Menu: `src/components/nav/MoreMenu.tsx`, `MoreMenuPhoneGroup.tsx`, `speeds.ts`, `studioActions.ts`. Adapted for touch: `StudioLayout.tsx`, `TopNav.tsx`, `LeftSidebar.tsx`, `RightTelemetry.tsx`, `ClockSpeedPill.tsx`, `LightingControls.tsx`, the care toolbar, view controls, relax dock, item inspector, away card and growth board in `src/components/stage/` and `src/components/growth/`. |
| State | `layoutModeAtom`, `viewportHeightAtom`, `sheetLevelAtom`, `sheetDragPxAtom` in `src/store/layout.ts`; the open sheet is derived from `drawerAtom` and `growthBoardOpenAtom` (`src/store/overlay.ts`). **No storage key.** All layout state is transient and nothing is saved or added to a garden snapshot. |
| Tests | `tests/unit/lib/sheetMath.test.ts`, `tests/unit/store/layout.test.ts`, `tests/unit/hooks/useLayoutMode.test.tsx`, `tests/unit/hooks/usePhoneReframe.test.tsx`, `tests/unit/components/phoneLayout.test.tsx`, `sheetGrab.test.tsx`, `moreMenuPhone.test.tsx`, `drawers.test.tsx`, `tests/e2e/phone.spec.ts` |
| Watch out | The two media queries are copied from the prototype and landscape wins when both match. Sizes are fixed: tab bar 58 px, top bar 48 px, rail 60 px, sheet heights 0.27, 0.54 of the viewport and a full height. Touch targets are at least 44 px (40 px for view and light buttons). Rotating while a sheet is open must keep the same panel open and recompute its height. Escape with a sheet open closes only the sheet. Entering relax closes the sheet first. On desktop the tab bar is not rendered and adding an item never changes the sheet level. |

## Relax mode and sound

| | |
|---|---|
| What the player sees | Press R: the interface hides, ambient sound plays, a small dock shows. The dock and cursor hide after 2.6 s without a mouse move. |
| Code | `src/hooks/useRelaxMode.ts` (body classes `relax-active` and `relax-idle`; CSS in `src/index.css`), `src/components/stage/RelaxDock.tsx`, `RelaxDockControls.tsx`. Sound: `src/engine/audio/` (`ambient.ts` loops, `asmr.ts` one-shot cues, `audioContext.ts`), controlled by `src/services/audio.ts` and `src/hooks/useAudio.ts`. Presets: `src/data/soundPresets.ts`. |
| State | `relaxMode`, `audioEnabled`, `soundPreset`, `musicVolume` (studio atoms, saved). `reducedMotion` mirrors the OS setting and is not saved. |
| Tests | `tests/unit/hooks/useRelaxMode.test.tsx`, `tests/unit/engine/audio.test.ts`, `tests/e2e/relax.spec.ts` |
| Watch out | Browsers start audio only after a user gesture. Call `startAudioFromGesture` inside the event handler, as `useKeyboardShortcuts` does. The engine never imports audio; `tick` takes an `onCue` callback instead. Respect `reducedMotion` in new animations. |

## Account and saved gardens

The account is optional. A player who never signs in still has the full game, saved in the browser.
Signing in adds several named gardens, autosave and a growth journal.

| | |
|---|---|
| What the player sees | An account chip in the top bar. Sign-up, sign-in, magic link, one-time code, password reset. An account panel with Gardens, Journal and Profile tabs. On a first visit, a sign-up prompt 2.5 s after the first click or key press. |
| Code | Sign-in: `src/auth/` (`AuthService` in `types.ts`; the local implementation in `localAuthService/`, one file per flow). Garden storage: `src/auth/backend.ts` (`GardenBackend`, `createLocalBackend`). Account logic: `src/services/account/` (start at `index.ts`; `session.ts` sign-in and sign-out, `cloudSave.ts` autosave, `gardenList.ts` open, rename, delete, `journal.ts`, `welcome.ts` the deferred prompt). Lifecycle: `src/hooks/useAccountLifecycle.ts`. UI: `src/components/account/` (screens in `auth/`; panel tabs `GardensTab.tsx`, `JournalTab.tsx`, `ProfileTab.tsx`; chip `AccountChip.tsx`). |
| State | Account atoms in `src/services/account/atoms.ts` (not saved; the auth service saves the session). Other code reads `phaseAtom` most: `'checking'`, `'signedout'`, `'onboarding'` or `'cloud'` (signed in). |
| Tests | `tests/unit/auth/`, `tests/unit/services/account.test.ts`, `tests/unit/components/account/`, `tests/unit/components/auth/`, `tests/unit/hooks/useAccountLifecycle.test.tsx`, `tests/e2e/account.spec.ts` |
| Watch out | Everything is local today. App code uses only the `AuthService` and `GardenBackend` interfaces, so a real server can replace them later ("Adding a backend" in ARCHITECTURE.md). Autosave waits `SAVE_DEBOUNCE_MS` (2.5 s) after a change and retries `unavailable` errors. Full browser storage raises `quota_exceeded`, which shows a toast; never swallow it. The demo account is `demo@botanica.app` / `terrarium1`. |

## Saving and loading

| | |
|---|---|
| What happens | The studio state is written to the browser on every change and loaded at start. A saved garden is a snapshot of the studio state plus the world. A save from the old prototype is imported once. |
| Code | Binding: `src/store/appStore.ts` (importing it loads the save). Studio save: `src/store/studio/` (`state.ts` shape and defaults, `persisted.ts` saved fields and `STUDIO_VERSION`, `storage.ts` load and write, `atoms.ts`). Upgrades: `src/store/migrations.ts`. World snapshot: `src/engine/persistence.ts`. Garden snapshot: `src/services/gardenSnapshot.ts` (`getGardenSnapshot`, `applyGardenSnapshot`). Prototype import: `src/store/importPrototypeSave.ts`. |
| Tests | `tests/unit/store/studio.test.ts`, `migrations.test.ts`, `importPrototypeSave.test.ts`, `tests/unit/engine/persistence.test.ts`, `tests/unit/services/gardenSnapshot.test.ts` |
| Watch out | Follow "Adding a saved setting" in ARCHITECTURE.md step by step. The step people miss is the last: garden snapshots load through `applyGardenSnapshot`, which has its own sanitize list. |

## Storage key registry

Every key the app writes to `localStorage`. Changing a key, or the shape of its value, breaks
players' saves. Add any new key to this table in the same pull request.

| Key | Holds | Owner |
|---|---|---|
| `botanica_studio_v1` | The studio save: `{ state, version }`. Version is `STUDIO_VERSION` (now 5). | `src/store/studio/persisted.ts` |
| `botanica_view_v1` | Drawing preferences: depth, smooth drawing, frame-rate readout. | `src/store/view.ts` |
| `botanica_backdrop_photo_v1` | The player's own backdrop photo. | `src/lib/backdropPhoto.ts` |
| `botanica_auth_users_v1` | Local accounts (salted password hashes, lockout state). | `src/auth/localAuthService/constants.ts` |
| `botanica_auth_session_v1` | The signed-in session. | `src/auth/localAuthService/constants.ts` |
| `botanica_store_<accountId>` | One account's profile, gardens and journal. | `src/auth/backend.ts` |
| `botanica_signin_prompt_seen_v1` | Set once the first-visit sign-up prompt has shown. | `src/services/account/constants.ts` |
| `botanica_journal_draft` | The unsent journal note. | `src/components/account/JournalTab.tsx` |
| `botanica_paludarium_v6` | Read only: a save from the old prototype, imported once. | `src/store/importPrototypeSave.ts` |

## Rules that protect players' data

These rules add to the code rules in [CONTRIBUTING.md](../CONTRIBUTING.md). Breaking one does not
fail the build. It loses someone's garden. Reviewers check them by hand.

1. **Old saves keep loading.** Never rename a storage key, a saved field or a catalog id. Add a
   migration instead ("Adding a saved setting" in ARCHITECTURE.md).
2. **Saved data is untrusted.** A save may be old, hand-edited or cut short. Every saved field goes
   through a `sanitize...` function on load, in both `sanitizeSaved` and `applyGardenSnapshot`.
3. **The engine world changes only through the bridge.** Use `mutateWorld` or a service. Never keep
   your own copy of the world in a component.
4. **The catch-up is deterministic.** Same seed and same gap, same result.
5. **The frame loop does not touch React.** No `store.set` from a simulation step.
6. **Time away is gentle.** Nothing is eaten while the player is away, and plants never die (see
   "What may and may not die").
7. **Device settings stay out of the garden.** View preferences and the backdrop photo belong to the
   device. They never go into `botanica_studio_v1` or a garden snapshot.

## Debugging

- **Inspect the live state.** In `pnpm dev`, the browser console has `window.__botanica`.
  `__botanica.world()` returns the engine world. `__botanica.store.get(atom)` reads an atom. The
  e2e tests use this handle too. It is not in a production build.
- **Test time away without waiting.** More menu, time away group, pick a gap. That runs
  `previewGap`.
- **Check the frame rate.** More menu, drawing group, turn on the frame-rate readout.
- **Start fresh.** Clear the site's storage in the browser's dev tools. To start fresh but keep
  your account, delete only `botanica_studio_v1`.
- **Hide the sign-up prompt in e2e tests.** Call `dismissWelcomePrompt` from
  `tests/e2e/helpers.ts` before `page.goto`.
- **Find the prototype's behavior.** Many comments say "prototype 2907-3020" or "prototype v8".
  Those point at line numbers in the saved prototypes in `docs/reference/` (`prototype-v11.html` is
  the newest). Each plan in `docs/superpowers/plans/` names the prototype file its line numbers use.
  When the app and the prototype disagree and no spec explains why, treat the prototype as the
  intended behavior and ask before changing it.
- **Check the layer table.** Lint does not enforce it yet. Before a pull request, run
  `grep -rn "from '@/" src/<layer>` for each layer you touched and compare it with the table in
  ARCHITECTURE.md. Today no import breaks the table. Keep it at zero.

## Keeping this map current

This page is only useful while it is true. Update it in the same pull request when you:

- add a feature, a tab, an overlay or a menu entry;
- add a storage key or bump `STUDIO_VERSION`;
- move a feature's code to another folder;
- add a rule that protects saved data.

The reviewer checks that the map matches the change, the same way they check the tests.
