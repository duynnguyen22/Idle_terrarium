import { vesselKX } from '@/data/vessels'
import type { Store } from 'jotai'
import { appStore } from '@/store/appStore'
import { studioStateAtom, type StudioState } from '@/store/studio'
import { computeCareReport } from '../care'
import { envModel } from '../room'
import type { AsmrCue } from '../interaction'
import type { EngineWorld } from '../world'
import { advanceClock } from './clock'
import type { Rng } from './constants'
import { dayTick } from './dayTick'
import { wakeResting, wokeToast } from './ecology'
import { updateEnvironment } from './environment'
import { updateFauna } from './fauna'
import type { EventKind, LifeEvent } from './life'
import { updateMold } from './mold'
import { pointerInsideGlass, spraySpawn, stepMistParticles } from './mist'
import { initWorldParticles, updateAmbientMotes, updateFireflies } from './particles'
import { siphonStep, spawnPourStream, stepPourParticles } from './pouring'
import { eventText, NOTABLE } from './report'
import { pushTelemetry } from './telemetry'

export interface TickDeps {
  /** The jotai store holding the studio atoms; defaults to the app store. */
  store?: Store
  rng?: Rng
  now?: Date
  /** Optional audio hook; the engine stays free of audio imports. */
  onCue?: (cue: AsmrCue) => void
  /** Optional toast hook (e.g. the pool finished cycling); the engine stays free of UI imports. */
  onToast?: (msg: string) => void
  /** Optional snapshot hook (the hook passes `commitWorld`); called about once a minute. */
  commit?: () => void
}

/** Life events worth a live toast: the notable ones, minus `grown`, which is left to the away card and the almanac. */
function isLiveToastKind(kind: EventKind): boolean {
  return NOTABLE[kind] === 1 && kind !== 'grown'
}
/** At most one live event toast per this many milliseconds. */
const LIVE_TOAST_GAP_MS = 20_000

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

/** Recomputes the care report from the studio state and the live world into `world.careIssues` (a fresh array). */
export function refreshCareReport(world: EngineWorld, state: StudioState): void {
  world.careIssues = computeCareReport({
    ...state,
    ...world.env,
    items: world.items,
    mineralSpots: world.mineralSpots,
  })
}

/**
 * Per-frame simulation step, in the prototype's order: frame counter, pour spawn / siphon, clock, environment,
 * fauna AI, ambient motes,
 * the tank-day step (ecology, life cycles, breeding, sprouts, pool cycle, nutrients; paced by wall-clock time) and
 * the mold bloom (all skipped at timeSpeed 0, ambient motes included, as the prototype early-returns), then the draw-phase mutations
 * (child sync, firefly drift, stream integration), the care report refresh and the throttled store flush
 * (live gauges to the telemetry atom, persisted fields to the studio atoms).
 */
export function tick(
  world: EngineWorld,
  dtMs: number,
  timestamp: number,
  deps: TickDeps = {},
): void {
  const store = deps.store ?? appStore
  // One read per frame: `s` is a snapshot, so writes made during the frame (e.g. advanceClock's lighting)
  // are seen from the next frame on.
  const s = store.get(studioStateAtom)
  const rng = deps.rng ?? Math.random
  world.frame++
  if (world.ambientMotes.length === 0 && world.fireflies.length === 0)
    initWorldParticles(world, rng)

  if (s.timeSpeed !== 0) {
    if (world.isPouring && s.activeTool === 'pour' && s.activePourMaterial) {
      if (s.activePourMaterial === 'siphon') siphonStep(world, s)
      else {
        spawnPourStream(world, s.activePourMaterial, rng)
        // prototype 2575-2577: ~45% of spawn frames emit a scatter / water cue
        if (deps.onCue && rng() > 0.55) {
          deps.onCue(s.activePourMaterial === 'water' ? 'pour_water' : 'scatter')
        }
      }
    }
    advanceClock(store, deps.now)
    const em = envModel(s.room, s.hasLid)
    updateEnvironment(world, { ...s, airEff: em.airEff, tds: em.tds }, dtMs)
    updateFauna(world, s, dtMs, timestamp, rng)
    if (!s.reducedMotion) updateAmbientMotes(world, dtMs)
    const liveEmit = (e: LifeEvent): void => {
      if (!isLiveToastKind(e.kind) || !deps.onToast) return
      if (timestamp - world.lastLiveToast < LIVE_TOAST_GAP_MS && world.lastLiveToast > 0) return
      world.lastLiveToast = timestamp
      deps.onToast(eventText(e.kind, e.id))
    }
    dayTick(world, s, dtMs, rng, liveEmit, () =>
      deps.onToast?.('The pool has cycled. Ammonia and nitrite read 0.'),
    )
    updateMold(world, s, dtMs, rng, deps.onToast)
  }

  // Care wakes resting plants on the frame misting or pouring begins, at any time speed.
  if ((world.isMisting && !world.wasMisting) || (world.isPouring && !world.wasPouring)) {
    const woke = wakeResting(world)
    if (woke.length) deps.onToast?.(wokeToast(woke))
  }
  world.wasMisting = world.isMisting
  world.wasPouring = world.isPouring

  // Hold-to-mist runs at any time speed, like the artifact's draw-phase spray.
  if (world.isMisting && s.activeTool === 'mist' && !s.relaxMode && pointerInsideGlass(world)) {
    spraySpawn(world, dtMs, rng)
    if (deps.onCue && rng() < 0.06) deps.onCue('pour_water')
  }
  stepMistParticles(world, s, dtMs, rng)

  syncChildren(world, vesselKX(s.vessel))
  if (!s.reducedMotion && (s.lighting === 'night' || s.lighting === 'twilight'))
    updateFireflies(world, dtMs)
  stepPourParticles(world, s, dtMs, rng, deps.onToast)
  // Care report every 30 frames (prototype 3138, 3307); every frame while paused so edits show at once.
  // Assign a fresh array; the throttled flush copies it into the telemetry atom (compared by content).
  if (world.frame % 30 === 0 || s.timeSpeed === 0) refreshCareReport(world, s)
  pushTelemetry(world, store, timestamp, s, deps.commit)
}
