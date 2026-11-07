# 🌿 Botanica — Living Biosphere
**Real-Time Semi-Aquatic & Terrarium Studio**  
*Comprehensive Game Design & Technical Documentation*

---

## 1. Executive Summary & Core Vision
**Botanica — Living Biosphere** is an interactive, browser-based closed-loop ecosystem and semi-aquatic paludarium simulator. Designed specifically as a **digital sanctuary for relaxation after a long workday**, it combines tactile, hands-on terrarium crafting (scattering pebbles, pouring water lakes, mounting epiphytes on mossy cliffs) with a living, zero-punishment biological simulation.

### Core Design Pillars
1. **Zero-Punishment Sanctuary**: There are no "Game Over" states, stressful timers, or permanently dead plants. Neglecting the ecosystem simply eases plants into a peaceful dormant rest until the player returns.
2. **Tactile & ASMR Micro-Interactions**: Every action—pouring river gravel from a jar, filling a semi-aquatic lagoon with a glass pitcher, misting foliage, or pruning fronds—provides immediate visual particle feedback paired with procedural Web Audio API sound effects.
3. **Vertical & Semi-Aquatic Freedom**: Players aren't limited to flat soil. They can construct towering moss walls, cascading root waterfalls, and deep freshwater paludarium lakes with magnetic rock ledges that hold epiphytic plants.
4. **Biophilic Immersion ("Zen HUD" Relax Mode)**: With a single click (`🍃 Relax Mode` or `R`), all studio menus vanish, expanding the biosphere to full screen with generative nature soundscapes and dynamic weather.

---

## 2. Workspace Layout & UI Architecture

The studio interface is organized into four clean, non-overlapping zones:

### 2.1 Top Navigation Bar
* **Brand Identity**: Displays the **Botanica** title and `LIVING BIOSPHERE` badge.
* **Unified Telemetry Clock & Speed Pill**:
  * **Live Clock & Phase Readout**: Displays the current date, simulation day (`Nov 6 · Day 1`), real-time digital clock (`HH:MM:SS`), and active biological cycle (`DAWN · DEW CONDENSATION`, `DAY · PHOTOSYNTHESIS`, `DUSK · GOLDEN HOUR`, `NIGHT · RESPIRATION`).
  * **Simulation Speed Controls**:
    * `Real-Time`: Synchronizes the ecosystem loop with real-world time.
    * `Pause (⏸️)`: Freezes biological progression and creature movement.
    * `1×`: Standard active simulation pace.
    * `5× ⚡`: Fast-forwards plant growth, creature roaming, and mold cleanup.
    * `+1 Day`: Instantly advances the biosphere by 24 hours, boosting plant growth into the **Lush** stage.
* **Sky & Lighting Phase Controls**:
  * Manual phase buttons for `🌅 Dawn`, `☀️ Day`, `🌇 Dusk`, and `🌙 Night`.
  * `🔄 Auto Sync`: Automatically matches the terrarium's sky lighting to the player's local system clock.
* **Studio Utility Actions**:
  * `🍃 Relax Mode`: Enters full-screen Zen screensaver mode.
  * `🔊 / 🔇 Audio Toggle`: Enables or mutes the procedural Web Audio synthesizer.
  * `🎲 Biome`: Auto-crafts a complete Semi-Aquatic Rainforest Waterfall & Lake composition.
  * `🗑️ Clear`: Removes all placed specimens for a fresh start.
  * `📸 Snapshot`: Exports a high-resolution Retina PNG image of the terrarium.

### 2.2 Left Configuration & Catalog Sidebar
Divided into four primary tabs:
1. **`🫙 Vessel & Soil`**: Select glass enclosures, toggle hardware (`Cork Lid Sealed`, `💡 Halo LED Lamp`, `🌫️ Mist Fogger`), trigger one-click biome recipes, pick up **Scatter & Pour Containers**, or fine-tune substrate depths in millimeters (`mm`).
2. **`🌿 Flora`**: Choose between `🌱 Sprout` and `🌿 Mature` planting stages and browse 12 botanical species.
3. **`🪨 Hardscape`**: Browse 10 structural rocks, driftwood trees, waterfalls, and night-glowing crystals.
4. **`🐸 Fauna`**: Browse 8 autonomous terrestrial, semi-aquatic, and aquatic creatures.

### 2.3 Center Interactive Terrarium Stage
* **High-DPI HTML5 Canvas**: Renders the glass vessel, gooseneck Halo LED lamp, multi-layered substrates, contoured terrain mounds, animated waterfall streams, ultrasonic mist clouds, and specimens.
* **Floating Bottom Care Toolbar**: Quick-access tools for `🖐️ Move / Mount`, `🫙 Active Pouring Indicator`, `💦 Mist Spray`, `✂️ Prune`, `✨ Bio-Feed`, and `🧽 Scrub Mold`.
* **Floating Specimen Inspector**: Appears when any plant, rock, or creature is selected, offering 1-click controls for **Scale Down/Up**, **Rotate Left/Right**, **Flip Horizontal**, **Layer Back/Front**, **Advance Growth**, **Duplicate**, and **Delete**.

### 2.4 Right Biosphere Telemetry Sidebar
* **Core Environmental Gauges**: Live percentage bars for `💧 Air Humidity`, `🌱 Soil Moisture`, `🧪 Bio-Nutrients`, and `🌬️ O₂ / CO₂ Balance`.
* **Micro-Ecology Activity Readout**: Tracks `Fungal Spores` (with a `+Spore` test button), `Cleanup Crew` count, `Moss Carpet` coverage percentage, and `Water Cycle` state.
* **Botanist Notes**: Contextual diagnostic tips explaining the current ecosystem balance.

---

## 3. Complete Materials & Asset Catalog

### 3.1 Glass Enclosures (6 Vessels)
| Vessel ID | Name | Description | Evap. Multiplier | Special Hardware |
| :--- | :--- | :--- | :---: | :--- |
| `paludarium_tank` | **Paludarium Tank** | Frameless glass cube + water dam | `0.65` | Silicone seams, front water-dam bar & door knob |
| `apothecary` | **Apothecary Jar** | Classic domed botanical jar | `0.45` | Fitted natural cork stopper |
| `wardian` | **Wardian Case** | Victorian faceted glasshouse | `0.55` | Angled geometric glass roof |
| `globe` | **Hanging Sphere** | Curved suspended terrarium | `0.70` | Open-top curved bowl |
| `cylinder` | **Zen Cylinder** | Tall gallery glass column | `0.60` | Vertical viewing column |
| `teardrop` | **Teardrop Flask** | Tapered condensation vessel | `0.50` | Narrow neck for high moisture retention |

---

### 3.2 Tactile Scatter & Pour Containers (8 Substrate & Water Tools)
The tank is split into **land** and a **pool**. Land layers stack bottom to top under the land side; the pool side holds a gravel bed and water. Players can either adjust exact millimeter sliders (land `0–60 mm`, pool gravel `0–30 mm`, pool water `0–80 mm`, plus the **Pool width** slider, `0–60 %`) or pick up an interactive container to **click and hold inside the enclosure** to scatter grains, sculpt custom terrain mounds, or pour into the pool:

| Layer ID | Material Name | Container Tool | Side | Role & Behavior |
| :--- | :--- | :--- | :--- | :--- |
| `pebbles` | **Drainage layer (LECA)** | *LECA Scoop Jar* | Land | Clay balls under the mesh hold excess water away from roots. |
| `charcoal` | **Activated charcoal** | *Carbon Shaker* | Land | Absorbs odours and gases from decaying matter. |
| `soil` | **Tropical substrate** | *Substrate Bag* | Land | Coir, bark and peat-free mix where roots grow. |
| `sand` | **Silica sand** | *Quartz Sand Bottle* | Land | Top dressing for arid builds and paths. |
| `leaflitter` | **Leaf litter** | *Leaf Litter Bag* | Land | Magnolia and oak leaves: food and cover for the cleanup crew (boosts nutrient recycling and soil moisture). |
| `rivergravel` | **Pool gravel** | *River Gravel Can* | Pool | Rounded gravel for the pool bed and shoreline. |
| `water` | **Pool water** | *Glass Water Pitcher* | Pool | Fresh water for the pool section. |
| `siphon` | **Siphon / scoop out** | *Siphon & Scoop* | Tool | Lowers the water or scoops out the top layer. |

* **Mesh barrier**: A dashed fibreglass mesh sits above the drainage layer (drawn in the tank and noted between the charcoal and drainage sliders) to keep soil out of the drainage.
* **Land / pool split**: The land depth readout (`mm of land`) sums only the land layers; pool gravel and water are excluded. With **Pool width** at `0` the build is all land and pool layers have no effect on the scene.

#### One-Click Biome Recipes
* **`🌊 Falls Lake`**: The signature paludarium: 32 % pool on gentle pump flow (already cycled), Living Moss Wall, Root & Slate Waterfall, Golden River Boulders, mounted epiphytes and swimming fauna. Toast: *Falls Lake: 30% pool, waterfall and moss wall*.
* **`🌴 Rainforest`**: All land under a sealed lid, deep tropical substrate and leaf litter. Toast: *Rainforest: all land, sealed lid*.
* **`💧 Lagoon`**: A 45 % pool (already cycled) over deeper pool gravel for fish and shrimp. Toast: *Lagoon: 45% pool for fish and shrimp*.
* **`🌵 Arid Sand`**: All land, open top, fogger off, silica sand over a shallow substrate. Toast: *Arid: open top, sand, no fogger*.

---

### 3.3 Flora Catalog (12 Botanical Species)
Plants can be placed as **🌱 Sprouts** (`62%` scale with tender lime cotyledon base leaves that gradually grow into mature plants) or **🌿 Mature** (`100%` scale), and can advance to **🌸 Lush** (`+blossoms`).

| ID | Name | Biome | Mountable on Rock? | Floats on Water? | Ideal Humidity | O₂ Rate | Visual Description |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| `peacock_fern` | **Blue Peacock Fern** | Tropical | ✅ Yes | No | 65–95% | `1.8` | Iridescent blue-teal *Selaginella uncinata* fronds. |
| `cryptanthus_pink` | **Pink Earth Star** | Tropical | ✅ Yes | No | 60–90% | `1.4` | Rose-pink star bromeliad rosette. |
| `pogostemon_star` | **Starburst Pogostemon** | Tropical | ✅ Yes | No | 60–95% | `1.6` | Dense radiating crown of bright lime-green needle leaves. |
| `subwassertang` | **Aquatic Lake Moss** | Tropical | ✅ Yes | No | 70–100% | `1.7` | Translucent emerald underwater moss clumps. |
| `boston_fern` | **Sword Fern** | Tropical | ✅ Yes | No | 60–90% | `1.8` | Classic arching emerald fern fronds. |
| `fittonia` | **Pink Fittonia** | Tropical | ✅ Yes | No | 65–92% | `1.4` | Deep green nerve plant leaves with rose-pink veins. |
| `moss_mound` | **Pillow Moss Cushion** | Tropical | ✅ Yes | No | 60–95% | `1.5` | Velvety dome of bright *Leucobryum* cushion moss. |
| `anubias_nana` | **Anubias Petite** | Tropical | ✅ Yes | No | 65–98% | `1.5` | Broad-leafed rheophyte that clings to wet waterfall rocks. |
| `trailing_ivy` | **Creeping Fig Vine** | Tropical | ✅ Yes | No | 55–90% | `1.5` | Cascading vine that drapes down vertical cliffs. |
| `frogbit_pads` | **Floating Frogbit** | Tropical | No | ✅ Yes | 65–98% | `1.4` | Floating lily-like pads with dangling aquatic roots. |
| `echeveria` | **Rosette Succulent** | Desert | ✅ Yes | No | 25–55% | `1.1` | Sculptural blue-sage desert succulent rosette. |
| `barrel_cactus` | **Golden Barrel Cactus** | Desert | No | No | 20–50% | `1.0` | Ribbed desert globe with golden-yellow spines. |

---

### 3.4 Hardscape Catalog (10 Structural & Waterfall Accents)
Hardscape pieces feature **Magnetic Mounting Ledges** (`mountPoints`). When a player drags a mountable plant or creature near a rock or driftwood, glowing green nodes appear and magnetically snap the specimen onto the ledge. Moving the parent rock moves all attached plants together.

| ID | Name | Ledges | Special Effect | Description |
| :--- | :--- | :---: | :--- | :--- |
| `moss_wall_cliff` | **Living Moss Wall Cliff** | `7` | Vertical Backdrop | Sculpted multi-tiered rainforest moss wall backdrop. |
| `root_slate_waterfall` | **Root & Slate Waterfall** | `6` | 🌊 Animated Waterfall + Mist | Diagonal dark slate chute & driftwood roots with flowing water. |
| `golden_river_boulders`| **Golden River Boulders** | `3` | Shoreline Cluster | Warm yellow-ochre river stones with tucked moss pockets. |
| `dragon_peak` | **Dragon Stone Spire** | `4` | Tall Spire | Eroded *Ohko* stone tower with deep natural crevices. |
| `cliff_waterfall` | **Alpine Gorge Falls** | `4` | 🌊 Animated Waterfall + Mist | Layered grey slate cliff with central waterfall plunge pool. |
| `bonsai_driftwood` | **Bonsai Driftwood Tree** | `4` | Branching Canopy | Twisted driftwood trunk for mounting air plants and moss. |
| `quartz` | **Rose Quartz Cluster** | `0` | ✨ Pink Night Glow | Crystalline pink spires that emit a soft rose aura at night. |
| `amethyst_geode` | **Amethyst Geode** | `0` | ✨ Violet Night Glow | Crystal cavern that shimmers with purple light at dusk/night. |
| `lantern` | **Stone Pagoda Lantern** | `0` | ✨ Warm Amber Glow | Miniature Japanese zen stone lantern that lights up at night. |
| `river_stones` | **Grey Zen Stones** | `1` | Stacked Basalt | Smooth stacked river pebbles for minimalist accents. |

---

### 3.5 Fauna Catalog (8 Autonomous Micro-Fauna & Aquatic Creatures)
All fauna run an autonomous **4-state AI state machine** (`Wandering 🐾`, `Resting 💤`, `Eating 🍃`, and `Exploring 🧭`). Detritivores actively seek out and devour fungal mold spores on the substrate.

| ID | Name | Habitat | Cleans Mold? | Speed | Behavioral Traits |
| :--- | :--- | :--- | :---: | :---: | :--- |
| `tree_frog` | **Red-Eyed Tree Frog** | Terrestrial / Canopy | No | `0.18` | Peaceful emerald amphibian that rests on rocks and leaves. |
| `vampire_crab` | **Vampire Lagoon Crab** | Semi-Aquatic Bank | ✅ Yes | `0.24` | Violet crab with golden eyes that patrols the shoreline. |
| `medaka_fish` | **Golden Medaka Fish** | Aquatic Lake (`swimsInWater`) | No | `0.42` | Graceful amber ricefish that swims along the freshwater table. |
| `cherry_shrimp` | **Red Cherry Shrimp** | Aquatic Lake (`swimsInWater`) | ✅ Yes | `0.35` | Bright red dwarf shrimp that grazes underwater biofilm and mold. |
| `isopod` | **Dairy Cow Isopod** | Soil & Bark | ✅ Yes | `0.32` | Spotted detritivore with high mold-consumption efficiency. |
| `ducky_isopod` | **Rubber Ducky Isopod** | Soil & Limestone | ✅ Yes | `0.28` | Rare yellow-faced detritivore that cleans decaying matter. |
| `springtails` | **White Springtails** | Soil Surface | ✅ Yes | `0.45` | Fast-moving micro-arthropods that prevent fungal outbreaks. |
| `garden_snail` | **Amber Glass Snail** | Soil & Moss | ✅ Yes | `0.10` | Slow, meditative grazer with a translucent spiral shell. |

---

## 4. Core Simulation Systems & Mechanics

### 4.1 Plant Growth & Gentle Sway Physics
* **Multi-Stage Progression**: Plants placed in the `🌱 Sprout` stage start at `62%` scale with visible lime-green cotyledon leaves at their base. As simulation time ticks forward, their `growthProgress` smoothly increases until they transition into `🌿 Mature` (`100%` scale). Using **Bio-Feed** (`✨`), the Inspector **Grow** button, or **+1 Day** advances plants into the `🌸 Lush` stage with delicate yellow blossoms.
* **Meditative Sway**: Every flora specimen sways continuously using a low-frequency sine wave (`Math.sin(timestamp * 0.0009 + px * 0.02) * 0.025`) so foliage breathes calmly without jerky bouncing.

### 4.2 Interactive Terrain Sculpting & Pouring Physics
* When a user selects a container from **3. Scatter & Pour Containers** and clicks/holds inside the jar:
  * **Tilting Container Cursor**: A custom vector jar or glass water pitcher renders at the pointer location and tilts (`-0.68 rad`) while pouring.
  * **Particle Gravity & Accumulation**: Individual grains (`state.fallingStreams`) accelerate downward under gravity (`vy += 0.00085`). Upon hitting the soil surface (`getSoilSurfaceNormalizedY(x)`):
    * The corresponding substrate layer depth (`state.substrates[id]`) increments and updates the sidebar sliders in real time.
    * A localized 21-point heightmap (`state.terrainContour`) rises at the impact X-coordinate, creating organic hills, slopes, and sand dunes.
    * Persistent multi-toned surface pebbles (`state.surfaceGrains`) remain visible along the top contour.

### 4.3 Fungal Spores & Detritivore Cleanup Loop
* Fungal spores (`state.moldPatches`) can be spawned via the **`+Spore`** button in the telemetry panel.
* **Two Ways to Clean**:
  1. **Active Care**: Select the **`🧽 Scrub Mold`** tool in the bottom bar and click inside the enclosure to wipe spores away with tactile audio feedback.
  2. **Passive Biological Balance**: Introduce detritivores (*Dairy Cow Isopods*, *Rubber Ducky Isopods*, *Springtails*, *Cherry Shrimp*, or *Vampire Crabs*), which automatically shrink and eliminate mold patches over time.

### 4.4 Pool and Pump
* **Divider**: `waterSplit` (`0–0.6`) is the fraction of the tank given to the pool, on the left. The divider sits at normalized x `0.15 + 0.7 × min(0.6, waterSplit)`; a pool exists once `waterSplit > 0.02`, and holds water once pool water is above `4 mm`.
* **Bank**: A sloping bank `6 %` of the tank wide (`BANK_W = 0.06`) runs from the pool bed (top of the pool gravel) up to the land surface at the divider. Items rest on the pool bed, the bank slope, or the land, depending on their x; land items scatter only to the right of the divider.
* **Waterfall pump** (`pumpFlow`: `off` / `gentle` / `strong`, disabled with no pool, which reads *No pool in this build*):
  * Ripples on the water line scale with flow (amplitude `0.4` off, `1.5` gentle, `2.8` strong; strong also moves twice as fast).
  * With a waterfall placed and a watered pool, any flow other than `off` adds `+3 %` to the humidity target (the pool itself adds up to `+12 %`, scaled by pool width and water depth).
  * `off` slows the nitrogen cycle to `40 %` speed; `strong` stresses tree frogs and cherry shrimp (see the care report).
* **21-day water cycle**: A new pool starts at `cycleProgress = 0` and advances to `1` over about 21 in-game days (`CYCLE_DAYS = 21`; **+1 Day** steps it a day at a time). Readings follow `cycleChemistry(p)`: ammonia peaks near `3.5 ppm` around 30 % of the cycle (`3.5·e^-((p-0.3)/0.18)²`), nitrite peaks near `2.5 ppm` around 62 % (`2.5·e^-((p-0.62)/0.15)²`), and both read `0` once cycled. The Water cycle row reads *Cycling, day N of ~21* and then *Cycled · ammonia 0 ppm*; reaching the end toasts *The pool has cycled. Ammonia and nitrite read 0.*
* **Pool creation rule**: Dragging **Pool width** from no pool to a pool restarts the cycle, tops pool water up to at least `40 mm`, and toasts *New pool: it cycles for about 3 weeks before fish and shrimp are safe*. Pouring the first water into an existing dry pool also restarts the cycle.

### 4.5 Care Report
The telemetry sidebar lists the current issues (humidity and temperature per species against their ideal ranges, predation and tankmates, pump flow, vessel height, fogged glass, dry substrate and low nutrients). Most issues carry a one-click action; each toasts its result:

| Action ID | Button label(s) | What it changes | Toast |
| :--- | :--- | :--- | :--- |
| `mist` | *Mist now* | Mist boost `+10` (max `25`) and soil moisture `+4` (max `98`). | *Misted the plants* |
| `openLid` | *Crack the lid open*, *Vent the heat* | Removes the lid (`hasLid = false`). | *Lid cracked open to vent moisture* |
| `closeLid` | *Seal the lid* | Seals the lid (`hasLid = true`). | *Lid sealed; humidity will rise* |
| `fogOff` | *Turn the fogger off* | Turns the fogger off. | *Fogger off* |
| `pumpGentle` | *Set pump to gentle*, *Run the pump* | Sets `pumpFlow` to `gentle`. | *Pump set to gentle flow* |
| `feed` | *Add bio-feed* | Nutrients `+15` (max `100`), with the feed chime. | *Added organic bio-feed* |
| `widenPool` | *Add a pool* | Sets `waterSplit` to `0.3`, pool water to at least `40 mm`, and restarts the cycle. | *Added a pool. New water cycles for about 3 weeks.* |

---

## 5. Sensory & Biophilic "Relax Mode" (`🍃`)

Activated via the **`🍃 Relax Mode`** button in the top bar or by pressing **`R`** on the keyboard (`Esc` to exit):
* **Full-Screen Expansion**: Hides the top header, left catalog, right telemetry sidebar, and bottom care toolbar, expanding the terrarium stage to 100% of the screen.
* **Auto-Hiding "Zen HUD" & Cursor**: After `2.6 seconds` of mouse inactivity, the cursor disappears (`cursor: none`) and the floating bottom soundscape dock smoothly fades to `opacity: 0`, turning the monitor into a living terrarium screensaver. Moving the mouse immediately restores the dock.
* **4 Procedural Web Audio Soundscapes**:
  1. **`🏞️ Waterfall Stream`**: Babbling brook droplets and resonant water-on-stone acoustics.
  2. **`🌧️ Rain on Leaves`**: Soft pattering rain on canopy foliage and glass.
  3. **`🎍 Bamboo Breeze`**: Pentatonic harmonic wind chimes (`392 Hz – 659.25 Hz`) and gentle forest air.
  4. **`🦗 Midnight Insects`**: Nocturnal cricket and katydid trills (`3400–3700 Hz`).
* **4 Instant Weather & Lighting Moods**:
  * `🌫️ Misty Dawn`, `🌦️ Sun Shower`, `🌇 Golden Hour`, and `🌙 Moonlight`.

---

## 6. Technical Architecture

* **Stack**: React 19 + TypeScript on Vite 6, styled with Tailwind CSS 4, with HTML5 Canvas 2D for the stage and the Web Audio API for sound.
  * The canvas engine lives in `src/engine` (world, simulation, render, sprites) and runs on a single `requestAnimationFrame` loop. It never imports React or the audio modules (`src/engine/audio`, which only the `useAudio` hook drives). Components change the mutable `EngineWorld` only through `mutateWorld(fn)`; the world itself is never put in a store.
  * **Two Zustand stores**: `useStudioStore` holds the build and UI settings under Zustand `persist` (including the `envSeed` described below). `useTelemetryStore` holds the live gauges (humidity, temperature, moisture, nutrients, O2, condensation, mold, cleanup crew, care issues) and is not persisted. The engine's per-frame writes go only through `pushTelemetry`, throttled to 250 ms; the `envSeed` is also flushed when the tab is hidden or the engine unmounts.
* **Retina / High-DPI Rendering**:
  * Dynamically scales the main canvas backing store by `Math.min(window.devicePixelRatio || 1, 2)` and applies `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)` with `imageSmoothingQuality = 'high'`.
  * All 30+ flora, hardscape, and fauna sprites are pre-rendered at startup onto `256×256` offscreen `<canvas>` buffers (`canvasSpriteCache`), guaranteeing zero broken image links and crisp vector scaling at any zoom level.
* **Automatic Persistence (`localStorage`)**:
  * Saves vessel selection, hardware toggles, substrate depths, 21-point terrain contours, scattered surface grains and placed specimens (with parent-child rock attachments) under the key `botanica_studio_v1` (persist `version: 2`). The live gauges are not persisted; instead an `envSeed` (humidity, temperature, soil moisture and nutrients, rounded to 1 decimal) is written at most once every 5 seconds and seeds the environment on the next load, so a depleted nutrient level survives a reload. O2 and condensation restart from their defaults and re-converge within seconds. A save without `envSeed` loads the default gauges. The v6 build fields `pumpFlow`, `waterSplit` and `cycleProgress` (plus `setupDay`) persist alongside them, so the pool width, pump setting and cycle progress survive a reload.