# Living Time — design

Port of three features from the Botanica Living Biosphere artifact (https://claude.ai/artifact/MTB6Dwi2MbfXGRKq4sXEQE, local copy at `/Users/nguyenduy/.claude/projects/-Users-nguyenduy-Desktop-idle-terrarium/6e8105a1-5be6-4950-901d-8e37ee7f0748/tool-results/artifact-a59e5455-1794312243-4ecc.html`) into the React/Vite project: the **Growth board**, the **Time-away summary card** (with catch-up simulation and the "+1 day" preview), and **journal auto-entries** listing what changed. The relax dock stays as it is.

## Intent

Today the terrarium only changes while the tab is open and only on a per-frame basis; closing the app freezes it, "+1 day" is a flat 6 % size bump, and the journal records a day number with gauges but not *what happened*. The artifact models a tank that lives on wall-clock time: plants cycle through buds, flowers, fronds and runners; animals breed; resting plants wait for care; and when the person comes back the app tells them what they missed and offers to show them. That is the experience to bring over.

## Goals

- A **tank day** runs on wall-clock time at a chosen pace (default: one tank day every 2 hours) and continues while the app is closed, reconstructed on return.
- A **life-cycle model** per species (bloom / frond / shoot / moss) plus breeding, seedlings, babies, resting and moss spread, so the tank has things to report.
- The **Growth board**: a side panel listing, per plant and per species of animal, what phase it is in and when the next thing happens.
- The **Time-away card**: shown on return after ≥10 min away (or after "+1 day" / a preview), listing the changes with rings on the canvas, hints of what comes next, and a "Start the evening visit" tour.
- **Journal auto-entries** after each time away and each "+1 day", carrying the event list and a pool score.
- Controls in the ⋯ menu: show last summary, preview a gap, "Grow while I'm away" switch.

## Non-goals / anti-goals

- No change to the relax dock, music presets or volume.
- No change to the existing environment model (`updateEnvironment`), fauna movement, mold, mist, pouring.
- No new runtime dependencies; no server-side scheduling.
- Not a pixel copy of the artifact's DOM; the port uses the project's Tailwind/React components and design tokens.
- Must not make a save from a current user break: store v3 → v4 migration fills defaults.

## Constraints

- React 19, Zustand 5 persist, Tailwind 4, vitest (`tests/unit/**`), Playwright (`tests/e2e`), pnpm. `pnpm typecheck`, `pnpm lint`, `pnpm vitest run tests/unit`, `pnpm build` pass at every commit.
- Engine modules (`src/engine/**`) import no React, no audio, no stores except the `StudioStore` types; `EngineWorld` never lives in Zustand.
- Copy is verbatim from the artifact where listed below.
- All numbers below are the artifact's unless marked *(my call)*.

## The model

### Pace and tank days

`PACES = { brisk: 30·60e3, garden: 2·36e5, calm: 6·36e5, real: 864e5 }` ms per tank day; default `garden`. Subtitles: brisk "1 tank day = 30 min", garden "1 tank day = 2 h", calm "1 tank day = 6 h", real "1 tank day = 1 day".
Per frame: `frameMs = min(dtMs, 250)`, `dtDay = frameMs · (timeSpeed === 5 ? 5 : 1) / paceMs`. When `timeSpeed === 0` nothing advances. `realTimeMode` stays a styling flag only.

The world gets `ecoTime` (tank days elapsed); `dayCount = floor(ecoTime) + 1` is flushed to the store whenever it changes. "Tank age" on the board is `Day ${dayCount}`.

Per tank day: sprouts `growthProgress += dtDay · 0.6`, sprout render scale `base · (0.58 + min(0.42, gp · 0.42))` (replaces the current frame-based sprout growth); pool `cycleProgress += dtDay / 21 · (pumpFlow === 'off' ? 0.4 : 1)`; `nutrients += (−0.4·flora + 1.4·min(4, crew)·(leaflitter > 1 ? 1 : 0.35)) · dtDay`; mold cleared `27 · min(6, crew) · dtDay` patches (fractional accumulation).

### Stress, vitality, resting *(stress formula is my call; the project has no stress field)*

`plantStress(def, env) = clamp01(distance of humidity outside def.idealHumidity / 20) + (env.nutrients < 20 ? 0.3 : 0)`, capped at 1. `faunaStress(def, env)` = same humidity term plus temperature distance outside `def.idealTemp` / 6, capped at 1.

Each tank day (`ecologyStep`): `target = max(4, 100·(1 − stress))`; `rate = target < v ? 1.1 : 0.32`; `v' = clamp(3, 100, v + (target − v)·min(1, rate·dt))`. Resting: when `away && target < 62` a plant marks `resting = true` and its vitality floors at 55; resting clears when `target > 75 && v' > 75`, or when the person mists / waters (care wakes every resting plant: +8 vitality, toast `The ${names} woke up and perked up.`). `lush += (v > 85 ? 0.25 : −0.6)·dt`, clamped 0..1. Non-sprouts with `v > 68` grow `scale += (v − 68)/32 · 0.045 · dt` up to `base·1.35`; `v < 32` shrinks `scale ·= 1 − 0.012·dt` down to `base·0.62`. Stage = `lush > 0.75 && v > 85 ? 'lush' : 'mature'` (sprouts stay `sprout` until `growthProgress ≥ 1`).

### Life cycles

Table (species → kind, days, bloom word): cryptanthus_pink bloom 9 "small white flowers"; fittonia bloom 8 "small flower spikes"; pogostemon_star bloom 10 "lilac flower spikes"; anubias_nana bloom 11 "a white flower"; frogbit_pads bloom 7 "tiny white flowers"; echeveria bloom 12 "coral flowers"; barrel_cactus bloom 14 "a crown of flowers"; peacock_fern frond 5; boston_fern frond 5; trailing_ivy shoot 4; moss_mound moss 3; subwassertang moss 4.

Steps: bloom `bud 0.5, open 0.68, fade 0.9, seed 1`; frond `fiddle 0.55, frond 1`; shoot `tendril 1`; moss `spread 1`.
Each plant with a life entry carries `life = { cyc: rng()·0.45, n: 0, tendrils: 0 }` (initialised on placement and for existing items lacking it).
`lifePace(plant)`: 0 if resting; 1 if v > 70; 0.4 if v > 55; else 0. For bloom kinds, halve when `lightDose < 0.3` where `lightDose = hasGrowLamp ? 0.55 : 0.1` *(my call: the project has no room window setting, so the artifact's window term is dropped)*.
`lifeStep`: `after = before + dt / days · pace`; each threshold crossed emits an event `{ kind, uid, id }`; at `after ≥ 1` wrap `cyc −= 1`, `n++`. On crossing: `seed` → 40 % chance `spawnSeedling`; `frond` → `scale ·= 1.02` up to `base·1.35`, else a leaf-drop particle; `tendril` → `tendrils = min(4, tendrils + 1)`; `spread` → `spreadMoss`.

Seedlings: refused when flora ≥ 18, ≥ 3 of that species, or items ≥ 70. Placed within ±0.06 x of the parent, snapped to the land surface, `scale = base·0.62`, `stage 'sprout'`, `growthProgress 0.2`, `vitality 90`, `born: true`.

### Breeding, babies

BREED (species → days, cap, condition): springtails 4 d cap 6 (`nutrients > 30 && soilMoisture > 55`); isopod 6 d cap 5 and ducky_isopod 7 d cap 5 (`leaflitter > 1 && soilMoisture > 50`); cherry_shrimp 6 d cap 6 (`poolHasWater && cycleProgress ≥ 1 && poolScore > 60`); garden_snail 9 d cap 3 (`humidity > 60`). Also requires the species' mean stress < 0.4 and count < cap. `breed[id] += dt / days`; at ≥ 1: `breed[id] −= 1`, `spawnBaby` (copy of a random adult, `baby: 0`, scale = adult·0.55) and emit `hatch`. Babies `baby += dt / 3`; render scale `adult·(0.55 + 0.45·baby)`; at ≥ 1 the field is removed.
`poolScore` *(my call)* = `100 − 20·nh3 − 20·no2` from `cycleChemistry(cycleProgress)`, clamped 0..100.

### Moss tufts

`world.mossTufts: { x, r, w, seed }[]` (persisted). `spreadMoss(parent)`: a tuft with `|dx| < 0.09 && r < 1` and `rng() < 0.6` gets `r += 0.2`; else if tufts ≥ 18 a random tuft gets `r += 0.15`; else push `{ x: parent.x + (rng()−0.5)·0.1, r: 0.35, w: 0.04 + rng()·0.03, seed: rng() }`. "Moss cover" = `min(100, round(Σ r / 18 · 100))` %. Tufts draw as soft green ellipses on the land surface in the substrate pass *(rendering detail is the builder's)*.

### Catch-up

Store persists `lastSimulatedAt` (written every 60 s while running, on tab hide, on unmount), `catchupEnabled` (default true), `worldSeed` (random 8-char base36 at store creation), `pace`, `awayLog` (newest first, ≤ 12 entries).
Trigger: on engine mount and on tab becoming visible. `gap = now − lastSimulatedAt`. If `gap < 10 min` → nothing (quiet). If `catchupEnabled` is false → set `lastSimulatedAt = now`, no simulation. Else `tankHours = min(720, gap / paceMs · 24)`; `advanceWorld` in 1-hour steps `steps = floor(h) + (frac > 0.02 ? 1 : 0)`, each step `dt = 1/24` tank day: `ecologyStep(dt, { away: true })`, `lifeStep(dt, rng, emit)`, `breedStep(dt, rng, emit)`, slow step (ecoTime, pool cycle, nutrients, mold clearing). While away: nutrients never fall below `min(startNutrients, 30)`. If `tankHours ≥ 8` and no NOTABLE event was emitted, `nudgeOne`: the plant whose `cyc` is closest below its next non-fade threshold (within 0.35) jumps to that threshold and emits that event. RNG = `mulberry32(hashStr(`${worldSeed}:${from}`))` (FNV-1a) so re-running the same gap gives the same report. The world is snapshotted before and restored if `advanceWorld` throws.
Result: `AwayReport = { from, to, hours (wall-clock), tankHours, capped, mode: 'away' | 'preview' | 'day', reason, items: ReportItem[], more: number, rest: string[] (names), hints: Hint[] }`, pushed to `awayLog`, journal auto-entry written, card opened.

Constants: `CATCHUP_MIN_GAP_MS = 600 000`, `CATCHUP_MAX_DAYS = 30`, `AWAY_LOG_MAX = 12`.

### Report copy

NOTABLE kinds: open, seedling, hatch, frond, bud, spread, tendril, grown. Not notable: fiddle, fade, rest.
EVENT_ORDER: open, seedling, hatch, frond, bud, spread, tendril, grown, fiddle, fade, rest.
EVENT_TEXT (`${name}` = species name, `${bloom}` = bloom word):
- bud `The ${name} is forming buds.`
- open `The ${name} opened ${bloom}.`
- fade `The ${name}'s flowers faded.`
- seedling `A ${name} seedling came up.`
- fiddle `The ${name} is unfurling a new frond.`
- frond `The ${name} put out a new frond.`
- tendril `The ${name} sent out a runner.`
- spread `The ${name} spread a little.`
- grown `The ${name} seedling filled out.`
- hatch `The ${name} had young.`

`buildReport(events, rest)`: group by `kind|id`; drop `bud` when the same uid also `open`ed; drop `fiddle` when the same uid also `frond`ed; order by EVENT_ORDER, one of each kind first, then the rest; keep 3 lines when there is a rest line else 4; `more` = remaining count. Rest line: `The ${names ≤ 2 joined ' and '} slowed down to rest. A mist or a drink will wake ${1 ? 'it' : 'them'}.` Hints: `upcomingHints(2)` — nearest `open` first, then soonest other step, one per species: `{ uid, text: `${name}: ${next}`, eta }`.

Labels: `durationLabel(h)`: < 1 h `N min`, < 36 h `N h`, else `N days`. `sinceLabel(ts, now)`: `today at HH:MM`, `last night at` (yesterday and hour ≥ 17) / `yesterday at`, else `${weekday} at`. `etaLabel(days, paceMs)`: wall ms = days·paceMs; < 90 s `in a minute or so`; < 1 h `in about N min`; < 36 h `in about X h` (1 dp under 10); else `in about N days`.

### Time-away card

Overlay on the canvas (`section#away-card`, `role="dialog"`, `aria-labelledby` title). Eyebrow: away `While you were away · ${dur}${td}` where td = ` · N tank days` (≥ 1.5), ` · 1 tank day` (≥ 0.75), ` · N tank hours` otherwise, plus ` (capped)` when capped; preview `Preview · ${dur} later`; day `One tank day later`. Title `${n} change${n===1?'':'s'} since ${since}`, or `A quiet night` (no items, no rest), or `Resting since ${since}` (rest only). Empty body: `The tank rested while you were away. Nothing needs doing.` Lines with a colour dot: open/bud/fade `#e0789f`, hatch `#c2853f`, rest `#9aa79d`, seedling/grown `#a3cf4f`, default `#65a33a`. `And N smaller change${s}.` when `more > 0`. Hints under `Coming up, if it stays healthy`. Buttons `Start the evening visit` (hidden when no items with live uids), `Got it`. Pager `‹ Earlier` / `Latest` or `N of M` / `Later ›`, hidden when the log has < 2 entries. Escape = Got it.
While the card is open, dashed white rings (`setLineDash([4,4])`) draw around every reported uid; hovering a line pings it (solid yellow ring pulsing, 2600 ms); clicking selects the item.

"Start the evening visit" *(my call: tour only, no greeting/fireflies)*: close the card, enter relax mode, step through the report items that still exist, pinging each for 4200 ms with a caption `#tour-caption` (`${isEvening ? 'Tonight' : 'Since last time'} · ${i+1} of ${n}` + the line text; `isEvening = h ≥ 17 || h < 5`) and a `Skip` button; with no live items show `Nothing new to look at yet. Enjoy the quiet.` for 3200 ms. Leaving relax ends the tour.

Live toasts while open: NOTABLE events except `grown`, at most one per 20 s.

### "+1 day"

`catchUpSpan(from = now − paceMs, to = now, { mode: 'day', reason: '+1 day', away: false, preview: true, tankHours: 24 })`, chime, 60 % mold patch in the first 3 days (existing rule), existing toast format kept (`Day N: plants grew…`), journal auto-entry, card opened. The flat ×1.06 bump and forced `lush` stage are removed.

### Growth board

`aside#growth-board` (`role="dialog"`, right side of the stage, same slot the right telemetry uses on narrow screens), opened by a `Growth` button in the top bar between the clock pill and the utility actions; hidden by relax (add to the relax CSS list). Header: eyebrow `Growth board`, title `How your tank is growing`, pace radiogroup `Brisk / Garden / Calm / Real life` (click toasts `Tank pace: ${sub}`), subtitle `${sub}. ` + (`Paused while you watch.` if timeSpeed 0 / `Running 5× while you watch.` if 5 / `Growth continues while the app is closed.`).
Stats: `Tank age` `Day N`; `Pool cycle` `Cycled` + `Filter bacteria are established` or `N%` + `Done ${eta((1 − cp)·21·(pump off ? 2.5 : 1))}` (none without a pool); `Moss cover` `N%` + `N patches`. `Up next`: the row with the smallest eta as `<b>name</b>: next` (lowercase next) or `Nothing is due. Healthy plants keep cycling.`
Phases: bloom [0–.5 `Leafy growth` → `buds form`], [.5–.68 `In bud` → `buds open`], [.68–.9 `Flowering` → `petals fade`], [.9–1 `Setting seed` → `a new cycle starts`]; frond [0–.55 `Growing` → `a new frond appears`], [.55–1 `Unfurling a frond` → `the frond opens`]; shoot [0–1 `Growing a runner` → `the runner reaches out`]; moss [0–1 `Creeping` → `it spreads a little`].
Health chip: resting `Resting`; v > 85 `Thriving`; > 70 `Healthy`; > 55 `Slowed`; else `Struggling`.
Flora row: name, chip, `size = min(100, round(scale / (base·1.35) · 100))`; sprout → phase `Seedling` (born) / `Sprout`, bar `(gp − 0.2)/0.8`, next `Fills out ${eta((1 − gp)/0.6)}`; no life entry → `Mature`, `Settled in`; else phase name (+ ` · N of 4 runners` for shoot), bar `cyc` with tick marks at thresholds < 1, next `Paused. Mist or water to wake it` (resting) / `Paused until it recovers` (pace 0) / `${Capitalised next} ${eta((phaseEnd − cyc)·days/pace)}` + ` (slowed)` when pace < 1.
Fauna rows grouped by species: `name ×N`, chip `Stressed` (mean stress ≥ 0.4) / `Calm`, `Young growing up: N%` when babies exist, `Breeding · N of cap` bar, next: `Colony is full. Numbers hold steady` / `Waiting for ${needs}` (needs: a short phrase per condition, builder's wording) / `Waiting until they settle down` / `Next young ${eta}` / `Does not breed in this tank`.
Empty: `No plants yet. Add some from the Flora tab.` / `No animals yet. Add a cleanup crew from the Fauna tab.` Footer: `Times are estimates at 1× speed and assume conditions stay the same. Struggling plants slow down; resting ones pause until you care for them.`
Rows refresh every 1000 ms while open; Escape closes; hovering a row pings its item(s) 2600 ms; clicking selects.

### Journal

`JournalEntry` gains optional `events: { kind, text }[]`, `key: string`, `metrics.pool: number`. `addJournalEntry(note, auto, extra?)` with `extra = { events, key }`; when `key` matches the newest entry's key the call is skipped (dedupe on retriggered catch-ups). Auto note: `${mode === 'day' ? 'One day later' : `While you were away (${durationLabel(hours)})`}: ${texts joined ' '}` or `A quiet stretch. The tank rested while you were away.` The Journal tab renders the events as a bulleted list under the note and shows a `Pool N` chip when present. Helper copy: `An entry is added after each time away and each "+1 day", listing what changed. Add notes about what you see.`

### ⋯ menu additions

Group `Time away`: `Show the last summary` (toast `No time away recorded yet. Come back later, or preview a gap below.` when the log is empty); `Preview a gap` with `8 h`, `1 day`, `3 days`, `1 week` (runs `catchUpSpan` with `mode: 'preview'`, `away: true`, `preview: true`, `tankHours = gap / paceMs · 24`; preview reports are **not** logged to the journal and are pushed to `awayLog` like any other); `Grow while I'm away` switch (toasts `The tank will keep growing while you are away` / `Growing while away is off. The tank waits for you.`).

## Persistence

- `PlacedItem` gains optional `life`, `born`, `baby`, `resting`, `lush`.
- `WorldSnapshot` gains `mossTufts`, `ecoTime`, `breed`.
- `StudioState` gains `pace` (`'garden'`), `lastSimulatedAt` (`null`), `catchupEnabled` (`true`), `worldSeed`, `awayLog` (`[]`); `STUDIO_VERSION` 4 with `migrateV3toV4` filling defaults and sanitising on merge.
- The world snapshot is committed on tab hide, on unmount and every 60 s while running, so life state is not lost on reload.

## Left to the builder

Exact Tailwind classes and layout of the board, card and caption (follow the right telemetry's card style); ring/ping drawing details; the `needs` phrase per breed condition; leaf-drop particle look; how "Preview a gap" sub-items are laid out inside the menu.
