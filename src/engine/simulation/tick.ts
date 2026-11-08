import { vesselKX } from '@/data/vessels'
import { useStudioStore, type StudioStore } from '@/store/useStudioStore'
import { computeCareReport } from '../care'
import { envModel } from '../room'
import type { AsmrCue } from '../interaction'
import type { EngineWorld } from '../world'
import { advanceClock } from './clock'
import type { Rng } from './constants'
import { updateEnvironment } from './environment'
import { updateFauna } from './fauna'
import { updateGrowth } from './growth'
import { updateMold } from './mold'
import { pointerInsideGlass, spraySpawn, stepMistParticles } from './mist'
import { initWorldParticles, updateAmbientMotes, updateFireflies } from './particles'
import { siphonStep, spawnPourStream, stepPourParticles } from './pouring'
import { pushTelemetry } from './telemetry'

export interface TickDeps {
  store?: StudioStore
  rng?: Rng
  now?: Date
  /** Optional audio hook; the engine stays free of audio imports. */
  onCue?: (cue: AsmrCue) => void
  /** Optional toast hook (e.g. the pool finished cycling); the engine stays free of UI imports. */
  onToast?: (msg: string) => void
}

/**
 * Child items follow their parent via offsetX/offsetY; orphans are detached (prototype 2361-2370). offsetX is
 * kx-independent and divided by the current tank's kx, so a child keeps its pixel offset across vessel switches.
 */
export function syncChildren(world: EngineWorld, kx = 1): void {
  for (const item of world.items) {
    if (!item.parentUid || item.uid === world.draggingId) continue
    const parent = world.items.find((p) => p.uid === item.parentUid)
    if (parent) {
      item.x = parent.x + (item.offsetX || 0) / kx
      item.y = parent.y + (item.offsetY || 0)
    } else {
      item.parentUid = null
    }
  }
}

/** Recomputes the care report from the store and the live world into `world.careIssues` (a fresh array). */
export function refreshCareReport(world: EngineWorld, store: StudioStore): void {
  world.careIssues = computeCareReport({
    ...store,
    ...world.env,
    items: world.items,
    mineralSpots: world.mineralSpots,
  })
}

/**
 * Per-frame simulation step, in the prototype's order: frame counter, pour spawn / siphon, clock, environment,
 * fauna AI, ambient motes,
 * growth, mold cleanup (all skipped at timeSpeed 0, ambient motes included, as the prototype early-returns), then the draw-phase mutations
 * (child sync, firefly drift, stream integration), the care report refresh and the throttled store flush
 * (live gauges to the telemetry store, persisted fields to the studio store).
 */
export function tick(
  world: EngineWorld,
  dtMs: number,
  timestamp: number,
  deps: TickDeps = {},
): void {
  const store = deps.store ?? useStudioStore.getState()
  const rng = deps.rng ?? Math.random
  world.frame++
  if (world.ambientMotes.length === 0 && world.fireflies.length === 0)
    initWorldParticles(world, rng)

  if (store.timeSpeed !== 0) {
    if (world.isPouring && store.activeTool === 'pour' && store.activePourMaterial) {
      if (store.activePourMaterial === 'siphon') siphonStep(world, store)
      else {
        spawnPourStream(world, store.activePourMaterial, rng)
        // prototype 2575-2577: ~45% of spawn frames emit a scatter / water cue
        if (deps.onCue && rng() > 0.55) {
          deps.onCue(store.activePourMaterial === 'water' ? 'pour_water' : 'scatter')
        }
      }
    }
    advanceClock(store, deps.now)
    const em = envModel(store.room, store.hasLid)
    updateEnvironment(world, { ...store, airEff: em.airEff, tds: em.tds }, dtMs, deps.onToast)
    updateFauna(world, store, dtMs, timestamp, rng)
    if (!store.reducedMotion) updateAmbientMotes(world, dtMs)
    updateGrowth(world, store, dtMs)
    updateMold(world, store, dtMs, rng, deps.onToast)
  }

  // Hold-to-mist runs at any time speed, like the artifact's draw-phase spray.
  if (
    world.isMisting &&
    store.activeTool === 'mist' &&
    !store.relaxMode &&
    pointerInsideGlass(world)
  ) {
    spraySpawn(world, dtMs, rng)
    if (deps.onCue && rng() < 0.06) deps.onCue('pour_water')
  }
  stepMistParticles(world, store, dtMs, rng)

  syncChildren(world, vesselKX(store.vessel))
  if (!store.reducedMotion && (store.lighting === 'night' || store.lighting === 'twilight'))
    updateFireflies(world, dtMs)
  stepPourParticles(world, store, dtMs, rng, deps.onToast)
  // Care report every 30 frames (prototype 3138, 3307); every frame while paused so edits show at once.
  // Assign a fresh array; the throttled flush copies it into the telemetry store (compared by content).
  if (world.frame % 30 === 0 || store.timeSpeed === 0) refreshCareReport(world, store)
  pushTelemetry(world, store, timestamp)
}
