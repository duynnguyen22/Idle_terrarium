# Decor, Lamp Colour and Deferred Welcome Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the four features that the live Botanica artifact adds on top of prototype v9: the Decor catalog, night glow placed by `glowAt`/`glowR`, a white or warm grow lamp, and a sign-up prompt that waits for the first input.

**Architecture:** Decor is a fourth catalog family. Its data goes in `src/data/catalog/decor.ts`, its sprites in a new folder module `src/engine/sprites/decor/`, and its grounding rules in `src/engine/items.ts` and `src/engine/interaction.ts`. Lamp colour is a new saved studio field (`STUDIO_VERSION` 4 → 5). It is read by `lightDose`, the lamp renderers and a new warm-tint pass. The welcome prompt moves out of `initAccount` into a small service file that waits for the first pointer or key press.

**Tech Stack:** React 19, TypeScript, Vite, Jotai, Tailwind 4, Vitest, pnpm.

**Spec:** `docs/reference/prototype-v10.html` (the live artifact, saved 2026-11-17). Line numbers below refer to this file. To see every change from v9, diff it against `docs/reference/prototype-v9.html`.

## Global Constraints

- Follow `CONTRIBUTING.md` and `docs/ARCHITECTURE.md`. Imports point down only: lib → data → store → engine | auth → services → hooks → components. `src/components/ui/` imports only `lib`.
- A file has at most 300 lines and a function at most 80. Blank lines and comments don't count. Never add an entry to `eslint.legacy.js`. Split anything that grows too long.
- Code outside a folder module imports only its `index.ts`. Leave no re-exports at old locations.
- Prettier settings: no semicolons, single quotes, width 100. Run `pnpm format` before each commit.
- Storage key stays `botanica_studio_v1`. Only one saved field is added: `lampColor: 'white' | 'warm'`, default `'white'`. Old saves must keep loading.
- Welcome key stays `botanica_signin_prompt_seen_v1`, and the banner text stays `WELCOME_TEXT`.
- Copy UI text exactly as the spec has it: "Decor", "Lamp light colour", "White 6500 K", "Warm 3000 K", "Glows", "Mountable", `Decoration · ${material}`, and the two toasts in Task 9.
- Every task ends with `pnpm verify` passing. It runs lint, the format check, the type check and the unit tests.
- Commits use Conventional Commits and end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- These behaviour changes are requested, so editing the related assertions is allowed:
  - Falls Lake gains 4 decor items, so it has 21 items instead of 17.
  - The welcome prompt is deferred.
  - Hardscape glow is 0.8× smaller at twilight, and its inner radius is 2 instead of 4.

## Review Focus

These are the failure modes most likely to reach a user. Each one has a test in the task named on its line.

1. **A v4 save, or a garden snapshot, without `lampColor`** must load as `'white'` with no errors. Tested in Task 7.
2. **A hand-edited `lampColor`** such as `"WARM"`, `"cool"` or `42` must load as `'white'`. Tested in Task 7.
3. **A decor piece mounted on a rock, then resized or dropped,** must stay on its ledge. `settleDecor` must skip any item with a `parentUid`. Tested in Task 3.
4. **A decor piece dropped high in the air** stays where it was dropped. A piece dropped within 0.035 of the ground, or below it, snaps so its feet stand on the soil. Tested in Task 3.
5. **The welcome prompt must not appear** when any of these is true at the moment the 2.5 s timer fires:
   - relax mode is on
   - the account panel is already open
   - the user has signed in

   In those cases the seen-flag must stay unset, so the prompt can try again on the next visit. Tested in Task 10.

---

### Task 1: Decor data

**Files:**
- Modify: `src/data/types.ts`
  - `HardscapeDef` (lines 62–67)
  - `CatalogDef`
  - `PlacedItem.category` (line 120)
- Create: `src/data/catalog/decor.ts`
- Modify: `src/data/catalog/index.ts`
- Modify: `src/engine/care/ranges.ts:6`
- Test: `tests/unit/data/decor.test.ts`

**Interfaces:**
- Produces:
  - `type DecorTheme = 'village' | 'japan' | 'people' | 'animals' | 'lights'`
  - `interface GlowFields { glowsAtNight?: boolean; glowColor?: string; glowAt?: readonly [number, number]; glowR?: number }`
    - `HardscapeDef` and `DecorDef` both extend it.
    - Remove `HardscapeDef`'s own `glowsAtNight` and `glowColor`, since they now come from `GlowFields`.
  - `interface DecorDef extends BaseDef, GlowFields { category: 'decor'; theme: DecorTheme; material: string; canMountOnRock?: boolean }`
  - `CatalogDef = FloraDef | HardscapeDef | DecorDef | FaunaDef`
  - `PlacedItem.category: 'flora' | 'hardscape' | 'decor' | 'fauna'`
  - From `@/data/catalog`:
    - `DECOR`
    - `DecorId`
    - `DECOR_BY_ID: Readonly<Record<DecorId, DecorDef>>`
    - `DECOR_GROUPS: readonly { label: string; ids: readonly DecorId[] }[]`. This is the same shape as `FAUNA_GROUPS`.
    - `DECOR_FOOT = 30`
    - `decorFootN(scale: number): number`
  - `CATALOG.decor`. In `ALL_CATALOG_DEFS` the order is `[...FLORA, ...HARDSCAPE, ...DECOR, ...FAUNA]`, as in spec line 2952.

- [ ] **Step 1: Write the failing test** `tests/unit/data/decor.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import { ALL_CATALOG_DEFS, DECOR, DECOR_GROUPS, decorFootN, findCatalogDef } from '@/data/catalog'

describe('decor catalog', () => {
  it('has the 26 pieces of the live artifact, all category decor', () => {
    expect(DECOR).toHaveLength(26)
    expect(DECOR.every((d) => d.category === 'decor')).toBe(true)
    expect(findCatalogDef('deco_cottage')?.category).toBe('decor')
  })
  it('keeps catalog ids unique', () => {
    const ids = ALL_CATALOG_DEFS.map((d) => d.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
  it('groups every piece once, in spec order', () => {
    expect(DECOR_GROUPS.map((g) => [g.label, g.ids.length])).toEqual([
      ['Village and garden', 9],
      ['Japanese garden', 3],
      ['Little people', 4],
      ['Animals', 7],
      ['Mushrooms and lights', 3],
    ])
    expect(DECOR_GROUPS.flatMap((g) => g.ids)).toEqual(DECOR.map((d) => d.id))
  })
  it('gives the four glowing pieces their anchor and radius', () => {
    const glow = DECOR.filter((d) => d.glowsAtNight).map((d) => [d.id, d.glowAt, d.glowR])
    expect(glow).toEqual([
      ['deco_cottage', [8, 15], 0.32],
      ['deco_street_lamp', [0, -46], 0.36],
      ['deco_glow_mushrooms', [0, 14], 0.4],
      ['deco_firefly_jar', [0, 8], 0.36],
    ])
  })
  it('measures the foot lift in normalized units', () => {
    expect(decorFootN(1)).toBeCloseTo(0.0421875, 7)
    expect(decorFootN(1.55)).toBeCloseTo(0.065390625, 7)
  })
})
```

- [ ] **Step 2: Run the test to check it fails**

Run: `pnpm vitest run tests/unit/data/decor.test.ts`
Expected: FAIL, because `DECOR` is not exported from `@/data/catalog`.

- [ ] **Step 3: Add the types to `src/data/types.ts`.** Then fix the type error this causes in `src/engine/care/ranges.ts:6`: change the check to `d && (d.category === 'flora' || d.category === 'fauna') ? d.idealHumidity : undefined`. Decor has no ideal humidity, just as hardscape has none.

- [ ] **Step 4: Create `src/data/catalog/decor.ts`.**
  - Copy the 26 entries from spec lines 1368–1393 field for field: `id`, `name`, `theme`, `baseScale`, `material`, `desc`, plus `canMountOnRock` and the four glow fields where present.
  - Declare `DECOR` the way `HARDSCAPE` is declared.
  - Build `DECOR_BY_ID` the way `FAUNA_BY_ID` is built.
  - Build `DECOR_GROUPS` from this label table, filtering `DECOR` by `theme` in catalog order:
    - `village` → "Village and garden"
    - `japan` → "Japanese garden"
    - `people` → "Little people"
    - `animals` → "Animals"
    - `lights` → "Mushrooms and lights"
  - Implement `decorFootN(scale) = DECOR_FOOT * (scale || 1) * 0.36 / 128 / 2`, as at spec line ~1560. The function needs a comment saying that it converts the sprite's foot line at design y = +30 into normalized tank units.
  - Export the new names from `src/data/catalog/index.ts`.

- [ ] **Step 5: Run the test to check it passes**

Run: `pnpm vitest run tests/unit/data/decor.test.ts`
Expected: PASS.

- [ ] **Step 6: Find every place that treats "not flora" or "not fauna" as a third kind**

Run: `grep -rn "category !== '\|category === 'hardscape'" src`
- Confirm each hit still gives the right answer for decor.
- Known safe hits:
  - `growthRows.ts:133`, `dayTick.ts:59`, `life.ts:122` and `ecology.ts:59` skip anything that is not flora or not fauna.
  - `depth.ts:22` and `shadows.ts:105` give decor the same depth and shadow as flora and fauna, which matches the spec.
- Then run `pnpm verify`. Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/data tests/unit/data/decor.test.ts src/engine/care/ranges.ts
git commit -m "feat(data): add the decor catalog"
```

---

### Task 2: Decor sprites

**Files:**
- Create: `src/engine/sprites/decor/` with these files:
  - `shapes.ts`
  - `village.ts`
  - `paths.ts`
  - `japan.ts`
  - `people.ts`
  - `wildlife.ts`
  - `pets.ts`
  - `lights.ts`
  - `index.ts`
- Modify: `src/engine/sprites/drawSprite.ts`
- Test: `tests/unit/engine/sprites.test.ts`

**Interfaces:**
- Consumes: `DecorId` (Task 1), and `DrawFn` and `fillShape` from `../fauna`.
- Produces: `DECOR_SPRITES: Record<DecorId, DrawFn>` from `@/engine/sprites/decor`.

- [ ] **Step 1: Write the failing test.** Add `describe('decor sprites')` to `tests/unit/engine/sprites.test.ts`.

```ts
it('has a sprite for every decor piece', () => {
  expect(Object.keys(DECOR_SPRITES).sort()).toEqual(DECOR.map((d) => d.id).sort())
})
it('draws every decor piece without the fallback blob', () => {
  for (const d of DECOR) {
    const ctx = mockCtx() // reuse the mock this file already builds for drawSprite
    drawSprite(ctx, d.id)
    expect(ctx.fillStyleLog).not.toContain('#84cc16')
  }
})
```

If the file's mock does not record fill colours yet, give it a `fillStyleLog` array that the `fillStyle` setter appends to.

- [ ] **Step 2: Run the test to check it fails**

Run: `pnpm vitest run tests/unit/engine/sprites.test.ts`
Expected: FAIL, because `@/engine/sprites/decor` does not exist.

- [ ] **Step 3: Port the helpers into `shapes.ts`.**
  - The helpers are `decorEllipse`, `decorRect`, `decorPoly`, `decorShine` and `decorFace`, from spec lines ~1560–1588.
  - Each takes `ctx: Ctx` first and builds on `fillShape` from `../fauna`.
  - Each sprite is a `DrawFn` named in camelCase after its id, for example `drawCottage`. Copy each body verbatim from its `case` in `drawDecorSprite` (spec lines 1590–1990). Change only the syntax TypeScript and Prettier need.
  - Put the sprites in files by group:

| File | Sprites |
|---|---|
| `village.ts` | cottage, windmill, well, mailbox, bench |
| `paths.ts` | street_lamp, bridge, stone_steps, ruin_arch |
| `japan.ts` | torii, pagoda, little_monk |
| `people.ts` | raincoat_kid, hiker, reader, fisher |
| `wildlife.ts` | fox, deer, rabbit, owl |
| `pets.ts` | cat, ducklings, turtle |
| `lights.ts` | mushrooms, glow_mushrooms, firefly_jar |

  - `index.ts` assembles `DECOR_SPRITES` keyed by catalog id.
  - Add `...DECOR_SPRITES` to `SPRITES` in `drawSprite.ts`.
  - `warmSpriteCache` and the thumbnails take decor automatically through `ALL_CATALOG_DEFS`.

- [ ] **Step 4: Run `pnpm format`, then `pnpm vitest run tests/unit/engine/sprites.test.ts`**

Expected: PASS. If lint reports a file over 300 lines after formatting, move its last sprite into a new file named after its group. Do not shorten the drawing code.

- [ ] **Step 5: `pnpm verify`, then commit**

```bash
git add src/engine/sprites tests/unit/engine/sprites.test.ts
git commit -m "feat(sprites): draw the 26 decor pieces"
```

---

### Task 3: Decor stands on the ground and mounts on ledges

**Files:**
- Create: `src/engine/currentTerrain.ts`
- Modify: `src/engine/items.ts`
  - `addItem` line 72
  - `scaleItem` lines 107–110
- Modify: `src/engine/interaction.ts`
  - `updateDrag` lines 63–82
  - `endDrag` lines 87–90
- Modify: `src/engine/render/specimens.ts:265-268`. This is the mount-point highlight shown while dragging.
- Modify the callers:
  - `src/components/stage/useWindowPointerTracking.ts:70`
  - `src/components/stage/canvasPointerDown.ts:30`
  - `src/components/stage/ItemInspectorControls.tsx:57,62`
- Test: `tests/unit/engine/items.test.ts` and `tests/unit/engine/interaction.test.ts`

**Interfaces:**
- Consumes: `decorFootN` (Task 1).
- Produces:
  - `currentTerrain(world: EngineWorld, store: Store = appStore): TerrainInput`. It returns `{ substrates, waterSplit }` from the studio atoms and `world.terrainContour`.
  - `settleDecor(item: PlacedItem, terrain: TerrainInput, prevScale?: number): void`, exported from `src/engine/items.ts`.
  - `scaleItem(world, uid, direction, terrain?: TerrainInput)`. It settles decor only when `terrain` is given.
  - `endDrag(world: EngineWorld, terrain?: TerrainInput)`. It settles the dragged item before it clears `draggingId`.

- [ ] **Step 1: Write the failing tests.** Use the `terrain` fixture that `items.test.ts` already has. In these tests, `ground(x)` means `getSoilSurfaceNormalizedY(terrain, x)`.
  - `addItem › decor stands its feet on the soil`
    - Call `addItem(w, 'deco_fox', 'mature', { terrain, rng: () => 0.5 })`.
    - Then `y` is close to `ground(x) - decorFootN(1.15)` (5 digits) and `scale` is `1.15`.
  - `settleDecor › drops a piece within 0.035 of the ground onto it`
    - The item has `y = ground - decorFootN(s) - 0.02`.
    - After settling, `y` is close to `ground - decorFootN(s)`.
  - `settleDecor › lifts a piece whose feet are below the ground`
    - The item has `y = ground`.
    - After settling, `y` is close to `ground - decorFootN(s)`.
  - `settleDecor › leaves a piece dropped high in the air`
    - The item has `y = ground - decorFootN(s) - 0.1`.
    - After settling, `y` is unchanged.
  - `settleDecor › leaves mounted decor and non-decor alone`
    - Use a decor item with `parentUid: 'rock'`, and a flora item with `y = ground`.
    - After settling, both are unchanged.
  - `scaleItem › decor on the ground keeps its feet on the ground when resized`
    - Start at `scale 1.15` on the ground, then call `scaleItem(w, uid, 1, terrain)`.
    - Then `y` is close to `ground - decorFootN(1.25)`.
  - `scaleItem › mounted decor keeps its y when resized` (Review Focus 3).
  - `updateDrag › mountable decor snaps with its feet on the ledge`
    - Place `moss_wall_cliff` and `deco_fox`, then drag the fox onto the first mount point.
    - Then `parentUid` is the host's uid, and `y` is close to `mpy - decorFootN(fox.scale)`.
  - `updateDrag › decor without canMountOnRock does not snap`
    - Do the same with `deco_cottage`.
    - Then `parentUid` is `null`.
  - `endDrag › settles a dropped decor piece when given terrain`
    - Then `y` is close to `ground - decorFootN(s)`.
  - `endDrag › without terrain only clears the drag`
    - Then `y` is unchanged and `draggingId` is `null`.

- [ ] **Step 2: Run the tests to check they fail**

Run: `pnpm vitest run tests/unit/engine/items.test.ts tests/unit/engine/interaction.test.ts`
Expected: FAIL, because `settleDecor` is not exported and the decor `y` is off by the foot lift.

- [ ] **Step 3: Implement.**
  - **`settleDecor`.** Follow spec ~3214–3219:
    - Return early unless the item is decor and has no `parentUid`.
    - `feet = y + decorFootN(prevScale ?? scale)`.
    - If `feet > ground || ground - feet < 0.035`, set `y = ground - decorFootN(scale)`.
  - **`addItem`.** The land fallback lift becomes:
    - `0.03` for fauna
    - `decorFootN(def.baseScale)` for decor
    - `0.05` otherwise
  - **`scaleItem`.** Remember `was = it.scale || 1` before clamping, then call `settleDecor(it, terrain, was)` when `terrain` is given.
  - **`updateDrag`.**
    - The snap condition becomes `(def.category === 'flora' || def.category === 'decor') && def.canMountOnRock || item.category === 'fauna'`.
    - Let `footN = item.category === 'decor' ? decorFootN(item.scale) : 0`.
    - Test the distance with `Math.hypot(targetX - mpx, targetY + footN - mpy)`.
    - On a snap, set `targetY = mpy - footN`. The `offsetY` still comes from `targetY - host.y`.
  - **`endDrag`.** Settle the dragged item when `terrain` is given.
  - **`specimens.ts`.** The highlight condition must match the snap condition.
  - **The three component callers.** Pass `currentTerrain(world)`.

- [ ] **Step 4: Run the tests to check they pass**

Run: `pnpm vitest run tests/unit/engine/items.test.ts tests/unit/engine/interaction.test.ts`
Expected: PASS.

- [ ] **Step 5: `pnpm verify`, then commit**

```bash
git add src/engine src/components/stage tests/unit/engine
git commit -m "feat(engine): ground and mount decor pieces"
```

---

### Task 4: Night glow placed by `glowAt` and `glowR`

**Files:**
- Create: `src/engine/render/glow.ts`. Move `drawNightGlow` here from `specimens.ts:97-117`. `specimens.ts` is 348 lines, so this move also shrinks it.
- Modify: `src/engine/render/specimens.ts`. Import the moved function and remove the old copy.
- Test: `tests/unit/engine/glow.test.ts`

**Interfaces:**
- Consumes: `GlowFields` (Task 1).
- Produces: `drawNightGlow(ctx: CanvasRenderingContext2D, state: Pick<StudioState, 'lighting'>, def: CatalogDef, drawSize: number): void`

- [ ] **Step 1: Write the failing test.** Use a mock ctx whose `createRadialGradient` records its arguments and returns `{ addColorStop() {} }`. Use `drawSize = 256`.

| Test | Expected `createRadialGradient` args |
|---|---|
| lantern at night | `[0, 0, 2, 0, 0, 256 * 0.65]` |
| lantern at twilight | `[0, 0, 2, 0, 0, 256 * 0.65 * 0.8]` |
| deco_street_lamp at night | `[0, -92, 2, 0, -92, 256 * 0.36]` |
| deco_cottage at twilight | `[16, 30, 2, 16, 30, 256 * 0.32 * 0.8]` |
| lantern in sunlight, deco_bench at night | not called |

- [ ] **Step 2: Run the test to check it fails.** Run `pnpm vitest run tests/unit/engine/glow.test.ts`. Expected: FAIL, because the module is not found.

- [ ] **Step 3: Implement.**
  - Draw the glow when `'glowsAtNight' in def && def.glowsAtNight` and lighting is night or twilight. This covers both hardscape and decor.
  - Centre: `gx = glowAt ? glowAt[0] * drawSize / 128 : 0`, and the same rule with `glowAt[1]` for `gy`.
  - Radius: `gr = drawSize * (glowR ?? 0.65) * (night ? 1 : 0.8)`.
  - Inner radius 2.
  - The arc uses the same centre and radius as the gradient.

- [ ] **Step 4: Run the test to check it passes,** then run `pnpm verify`. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/render tests/unit/engine/glow.test.ts
git commit -m "feat(render): place night glow by glowAt and glowR"
```

---

### Task 5: Falls Lake gets its four decor pieces

**Files:**
- Modify: `src/data/presets.ts`. Append to `FALLS_ITEMS`.
- Modify: `src/engine/presets.ts:111-124`
- Test: `tests/unit/engine/seeding.test.ts`

**Interfaces:**
- Consumes: `decorFootN` (Task 1).

- [ ] **Step 1: Update the tests.**
  - Change the three `toHaveLength(17)` checks to `21`. This is a requested behaviour change.
  - Add `falls places the four decor pieces on the soil`. After `applyPreset(w, 'falls', store)`, each piece below must match `{ x, scale: baseScale, flipX, zIndex, stage: 'mature', parentUid: null }`. Its `y` must be close to `getSoilSurfaceNormalizedY(terrain, x) - decorFootN(baseScale)`.

| id | x | flipX | zIndex |
|---|---|---|---|
| deco_cottage | 0.645 | false | 16 |
| deco_raincoat_kid | 0.575 | false | 17 |
| deco_mushrooms | 0.795 | true | 18 |
| deco_fisher | 0.415 | true | 19 |

- [ ] **Step 2: Run the tests to check they fail.** Run `pnpm vitest run tests/unit/engine/seeding.test.ts`. Expected: FAIL with length 17 ≠ 21.

- [ ] **Step 3: Implement.**
  - In `src/data/presets.ts`, add a local helper `decorAt(defId: DecorId, x: number, flipX: boolean, zIndex: number): PresetItem`. It returns:
    - `anchor: 'surface'`
    - `scale: DECOR_BY_ID[defId].baseScale`
    - `yOffset: -decorFootN(scale)`
  - Append the four calls, so the file stays under 300 lines.
  - In `applyPreset`, give decor `{ stage: 'mature', parentUid: null, offsetX: 0, offsetY: 0 }`, as at spec line 3197.

- [ ] **Step 4: Run the tests to check they pass,** then run `pnpm verify`.

- [ ] **Step 5: Commit**

```bash
git add src/data/presets.ts src/engine/presets.ts tests/unit/engine/seeding.test.ts
git commit -m "feat(presets): add decor to Falls Lake"
```

---

### Task 6: The Decor tab

**Files:**
- Modify: `src/components/ui/StudioIcons.tsx`. Add `'decor'` to `TabIconName` and the toadstool paths.
- Modify: `src/index.css`. Add the `.tab-ic .cap` and `.tab-ic .dot` rules next to line 239.
- Modify: `src/components/layout/LeftSidebar.tsx`
  - `TABS`
  - `grid-cols-6`
  - the decor panel
- Modify: `src/components/catalog/CatalogGrid.tsx`. Render grouped grids for fauna and decor through one component.
- Modify: `src/components/catalog/CatalogCard.tsx`. Add the decor chips.
- Modify: `src/components/stage/ItemInspector.tsx`. Add the decor meta line to `inspectorMeta`.
- Test: `tests/unit/components/sidebar.test.tsx`

**Interfaces:**
- Consumes: `CATALOG.decor`, `DECOR_GROUPS` and `DECOR_BY_ID` (Task 1). Thumbnails come from Task 2.

- [ ] **Step 1: Write the failing tests** in `sidebar.test.tsx`.
  - `has six tabs in spec order`: the tab names are `['Vessel','Flora','Hardscape','Decor','Fauna','Room']`.
  - `decor tab lists 26 pieces in five headed groups`
    - Click "Decor".
    - `getByTestId('catalog-decor')` holds 26 buttons.
    - The headings read "Village and garden 9", "Japanese garden 3", "Little people 4", "Animals 7" and "Mushrooms and lights 3".
    - The blurb contains "rock ledges".
  - `decor cards show material, Glows and Mountable chips`
    - The "Moss-Roof Cottage" card has "Glows" and its material.
    - The "Sitting Fox" card has "Resin" and "Mountable".
  - `inspector names decor with its material`
    - Select a placed `deco_fox`.
    - The meta reads `Decoration · Resin`.
    - Put this test with the other inspector tests if they live in another file.

- [ ] **Step 2: Run the tests to check they fail.** Run `pnpm vitest run tests/unit/components/sidebar.test.tsx`.

- [ ] **Step 3: Implement.**
  - **Icon.** Copy the paths from spec line 752. The CSS comes from spec lines 112–115:
    - `.cap` has fill `currentColor` at fill-opacity .14.
    - `.dot` has stroke-width 2.2.
    - On the selected tab (`[data-state=active]`, the way the other icons are targeted), `.cap` uses `#d9483b` at .9 with stroke `#a8342a`, and `.dot` uses stroke `#fff`.
  - **Panel copy.** Use this text exactly, with "rock ledges" in `STRONG`: "Miniature figurines and ornaments. Click to place, then drag. Small pieces snap onto **rock ledges**. One to three pieces usually look best; let the plants stay the star."
  - **Chips.** Decor gets three chips:
    - the material, in the neutral fauna chip style
    - "Glows", with bg `#fbf0cc`, text `#8a5a00` and border `#f0dc9a`
    - "Mountable"
  - **Inspector meta.** `Decoration · ${def.material || 'Resin'}`.

- [ ] **Step 4: Run the tests to check they pass,** then run `pnpm verify`.

- [ ] **Step 5: Commit**

```bash
git add src/components src/index.css tests/unit/components
git commit -m "feat(ui): add the Decor catalog tab"
```

---

### Task 7: Saved `lampColor` setting

**Files:** These follow "Adding a saved setting" in `docs/ARCHITECTURE.md`.
- Modify: `src/store/studio/state.ts`
- Modify: `src/store/studio/persisted.ts`. Add the field to `partialize` and set `STUDIO_VERSION = 5`.
- Modify: `src/store/studio/atoms.ts` and `src/store/studio/index.ts`
- Modify: `src/store/migrations.ts`
- Modify: `src/store/studio/storage.ts:22-31`
- Modify: `src/store/importPrototypeSave.ts:106`
- Test: `tests/unit/store/migrations.test.ts`, `tests/unit/store/studio.test.ts` and `tests/unit/store/importPrototypeSave.test.ts`

**Interfaces:**
- Produces:
  - `type LampColor = 'white' | 'warm'`, exported from `@/store/studio`
  - `StudioState.lampColor`, default `'white'`
  - `lampColorAtom`
  - `migrateV4toV5`
  - `sanitizeLampColor(v: unknown): LampColor`

- [ ] **Step 1: Write the failing tests.**
  - `migrate › v4 saves gain lampColor white`: the output has `lampColor` equal to `'white'`, and every other field is unchanged (Review Focus 1).
  - `sanitizeLampColor`: `'warm'` gives `'warm'`, and each of `'white'`, `'WARM'`, `'cool'`, `42`, `null` and `undefined` gives `'white'` (Review Focus 2).
  - `studio › lampColor defaults to white and is saved`: check it is in `partialize(createDefaultState())`.
  - `studio › a current save with lampColor "cool" loads as white`: this goes through `bindStudioStorage`.
  - `importPrototypeSave › reads lampColor warm, else white`.

- [ ] **Step 2: Run the tests to check they fail.** Run `pnpm vitest run tests/unit/store`.

- [ ] **Step 3: Implement the five steps from ARCHITECTURE.md.** `migrateV4toV5` adds `lampColor: 'white'` when the field is missing. Call it from `migrate` after `migrateV3toV4`.

- [ ] **Step 4: Run the tests to check they pass,** then run `pnpm verify`. Saved-garden tests that compare a whole snapshot shape may now need the field. Add it to their fixtures; do not change what they assert.

- [ ] **Step 5: Commit**

```bash
git add src/store tests/unit/store
git commit -m "feat(store): save the grow lamp colour"
```

---

### Task 8: What a warm lamp changes

**Files:**
- Modify: `src/engine/simulation/life.ts:87-89`. This is `lightDose`.
- Modify: `src/components/growth/GrowthBoard.tsx:55`. Pass `lampColor` here.
- Modify: `src/engine/render/lamp.ts`. Change the LED colours and add `drawLampTint`.
- Modify: `src/engine/render/vessel.ts:20-38`. This is the cone colours.
- Modify: `src/engine/render/renderFrame.ts:89`. Call `drawLampTint` right after `drawMist`.
- Test: `tests/unit/engine/simulation/life.test.ts` (or wherever `lightDose` is tested now) and `tests/unit/engine/render.test.ts`

**Interfaces:**
- Consumes: `StudioState.lampColor` (Task 7).
- Produces:
  - `lightDose(state: Pick<StudioState, 'hasGrowLamp' | 'lampColor'>): number`
  - `drawLampTint: RenderFn`, exported from `./lamp`

The spec also adds `lampColor` to a back-layer cache signature (spec line 8744). This codebase has no such cache: `renderFrame` redraws the lamp and its cone every frame. Nothing needs to change for that line.

- [ ] **Step 1: Write the failing tests.**
  - `lightDose`:

| hasGrowLamp | lampColor | expected |
|---|---|---|
| true | 'white' | 0.55 |
| true | 'warm' | close to 0.495 |
| false | 'warm' | 0.1 |

  - `renderFrame › a warm lamp tints the tank`: with lighting sunlight, `hasGrowLamp` true and `lampColor` `'warm'`:
    - `addColorStop` receives `'#ffd9a0'` (LED) and `'rgba(255,222,170,0.32)'` (cone). Match the format the spec writes.
    - `globalCompositeOperation` is set to `'multiply'` and then `'screen'`.
  - `renderFrame › a white lamp adds no tint`: `'multiply'` is never set by the lamp, and `'#e0f2fe'` is still used.
  - `renderFrame › a warm lamp resting at night adds no tint`: with lighting night and auto light sync, the lamp is off, so there is no multiply.

- [ ] **Step 2: Run the tests to check they fail.**

- [ ] **Step 3: Implement.**
  - `lightDose` returns `hasGrowLamp ? 0.55 * (lampColor === 'warm' ? 0.9 : 1) : 0.1`.
  - The LED gradient stops:

| Lamp | 0 | 0.55 | 1 |
|---|---|---|---|
| warm | `#fff6e6` | `#ffd9a0` | `rgba(255,170,70,0)` |
| white | unchanged | unchanged | unchanged |

  - The cone stops:

| Lamp | 0 | 0.5 | 1 |
|---|---|---|---|
| warm | `rgba(255,222,170,0.32)` | `rgba(255,196,120,0.13)` | `rgba(255,196,120,0)` |
| white | unchanged | unchanged | unchanged |

  - `drawLampTint` ports spec lines 3892–3905. The spec's names map to ours like this:
    - `state.lampOn` → `isLampOn(state)`
    - `R` → `r` from `vesselMetrics(R)`
    - `KX` → `kx`

- [ ] **Step 4: Run the tests to check they pass,** then run `pnpm verify`.

- [ ] **Step 5: Commit**

```bash
git add src/engine src/components/growth tests/unit/engine
git commit -m "feat(lamp): warm light tints the tank and slows growth 10%"
```

---

### Task 9: Lamp colour control

**Files:**
- Create: `src/components/catalog/LampColorControl.tsx`. Model it on the segmented control in `PumpFlowControl.tsx`.
- Modify: `src/components/catalog/HardwarePanel.tsx`. Render it directly under the Grow lamp `SwitchRow`.
- Test: `tests/unit/components/studio.test.tsx`. Put the tests where the hardware panel is tested now.

**Interfaces:**
- Consumes: `lampColorAtom`, `hasGrowLampAtom` and `showToast`.

- [ ] **Step 1: Write the failing tests.**
  - `lamp colour is a two-option radio group`
    - `getByRole('radiogroup', { name: 'Lamp light colour' })` holds two radios: "White 6500 K" (checked) and "Warm 3000 K".
  - `choosing warm saves it and explains the cost`
    - Click Warm.
    - `appStore.get(lampColorAtom)` is `'warm'`.
    - The toast is `'Warm light, 3000 K: a cosy glow. Plants grow about 10% slower.'`
  - `choosing white again toasts the white copy`
    - The toast is `'White light, 6500 K: best for growth.'`
  - `choosing the current colour does nothing`
    - There is no toast.
  - `without a grow lamp the colour buttons are disabled`

- [ ] **Step 2: Run the tests to check they fail.**

- [ ] **Step 3: Implement.**
  - Each radio has `role="radio"` and `aria-checked`, and is `disabled={!hasGrowLamp}`.
  - The colour dots are `#f3f7ff` (white) and `#ffc27a` (warm). "6500 K" and "3000 K" go in a `<small>`.
  - The care report and the telemetry need no extra wiring, because `tick.ts:63` recomputes the report from studio state every frame.

- [ ] **Step 4: Run the tests to check they pass,** then run `pnpm verify`.

- [ ] **Step 5: Commit**

```bash
git add src/components/catalog tests/unit/components
git commit -m "feat(ui): choose white or warm grow light"
```

---

### Task 10: Sign-up prompt waits for the first input

**Files:**
- Create: `src/services/account/welcome.ts`
- Modify: `src/services/account/session.ts:70-78`
- Modify: `src/services/account/contract.ts:56-64`. Add an optional `welcomeTarget` to `AccountDeps`.
- Test: `tests/unit/services/account.test.ts`. Replace the test at line 173. This is a requested behaviour change.

**Interfaces:**
- Produces:
  - `WELCOME_DELAY_MS = 2500`
  - `deferWelcome(ctx: AccountContext): void`
  - `AccountDeps.welcomeTarget?: Pick<Window, 'addEventListener' | 'removeEventListener'>`. It defaults to `globalThis.window`. With no window, nothing is scheduled.
  - Relax mode is read as `ctx.store.get(relaxModeAtom)` from `@/store/studio`.

- [ ] **Step 1: Write the failing tests.** Use `vi.useFakeTimers()`, an `EventTarget` as `welcomeTarget`, and the existing `welcome` MemoryStorage.
  - `first visit: no prompt until the first pointer or key press`
    - After `initAccount()`, the panel is closed and the key is `null`.
  - `first visit: the prompt opens 2.5 s after the first input`
    - Dispatch `pointerdown`, then advance 2499 ms: the panel is still closed.
    - Advance 1 more ms: `view` is signup, the banner is `{ kind: 'info', text: WELCOME }`, and the key is `'1'`.
  - `later inputs do not schedule a second prompt`
    - Dispatch `keydown` twice and advance 5000 ms.
    - `openAuth` ran once, which you can check through the view history or a spy.
  - `no prompt when relax mode is on as the timer fires`
    - The panel is closed and the key is still `null` (Review Focus 5).
  - `no prompt when the panel is already open or the user signed in during the delay`
    - The key is still `null`.
  - `seen visitors get no listener`
    - When the key is `'1'`, a dispatched input opens nothing.
  - `storage that throws counts as seen`.

- [ ] **Step 2: Run the tests to check they fail.** Run `pnpm vitest run tests/unit/services/account.test.ts -t "first visit|seen|relax|throws"`.

- [ ] **Step 3: Implement.**
  - **`initAccount`.** It only reads the key. If the read throws, treat the prompt as seen. When the prompt has not been seen, it calls `deferWelcome(ctx)`.
  - **`deferWelcome`.** It follows spec lines ~3330–3345:
    - Add the `pointerdown` and `keydown` listeners in the capture phase.
    - The first event removes both listeners.
    - After `WELCOME_DELAY_MS`, return early if any of these is true:
      - `state().phase !== 'signedout'`
      - `state().panelOpen`
      - relax mode is on
    - Otherwise set the key to `'1'` (ignore a failure) and call `actions.openAuth('signup', { banner: { kind: 'info', text: WELCOME_TEXT } })`.

- [ ] **Step 4: Run the tests to check they pass,** then run `pnpm verify`.

- [ ] **Step 5: Commit**

```bash
git add src/services/account tests/unit/services/account.test.ts
git commit -m "feat(account): show the sign-up prompt after the first input"
```

---

### Task 11: Final checks

- [ ] **Step 1:** Run `pnpm verify`, `pnpm build` and `pnpm e2e`. All must pass.
  - If an e2e test expects the sign-up prompt at load, change that expectation to the deferred behaviour.
  - If an e2e test expects five sidebar tabs, change it to six.
  - Note each of these changes in the PR as a requested behaviour change.
- [ ] **Step 2:** Check by hand in `pnpm dev`. The `run` skill can help.
  - Falls Lake shows the cottage, the child, the toadstools and the fisherman standing on the soil.
  - At night, the cottage window and the lamp head glow in the right places.
  - Warm light tints the tank amber.
  - A fresh profile, with localStorage cleared, gets the sign-up prompt only after the first click.
- [ ] **Step 3:** Add a row for decor to "Where do I put...?" in `docs/ARCHITECTURE.md`:
  - `DECOR` goes in `src/data/catalog/decor.ts`.
  - Sprites go in `src/engine/sprites/decor/`.

  Then commit with `docs: note where decor lives`.
