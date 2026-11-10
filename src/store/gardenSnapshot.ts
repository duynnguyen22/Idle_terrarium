import type { GardenSummary } from '@/auth/backend'
import type { PlacedItem } from '@/data/types'
import { commitWorld, tryGetWorld } from '@/engine/engineBridge'
import { seedWorldEnv } from '@/engine/envSeed'
import { restoreWorld, snapshotWorld } from '@/engine/persistence'
import type { EngineWorld } from '@/engine/world'
import {
  migrate,
  sanitizeBackdropHaze,
  sanitizeMusicVolume,
  sanitizeSoundPreset,
} from './migrations'
import {
  partialize,
  STUDIO_VERSION,
  type PersistedStudio,
  type StudioState,
  type StudioStore,
  type StudioStoreHook,
} from './useStudioStore'

/** One saved terrarium: the persisted studio slice, stamped with the version it was written at. */
export type GardenSnapshot = PersistedStudio & { version?: number }

/** The persisted slice with a fresh world snapshot when a world is live (spec getSnapshot). */
export function getGardenSnapshot(store: StudioStore, world: EngineWorld | null): GardenSnapshot {
  return {
    ...partialize(store),
    worldSnapshot: world ? snapshotWorld(world) : store.worldSnapshot,
    version: STUDIO_VERSION,
  }
}

/**
 * Loads a saved terrarium (spec applySnapshotData): migrates it from its version, writes only the
 * persisted keys to the store, then rebuilds the registered world from it: scene, environment
 * gauges, cycle and glass residue. Mold and pending pour deltas belong to the previous build.
 */
export function applyGardenSnapshot(snapshot: GardenSnapshot, store: StudioStoreHook): void {
  const migrated = migrate(snapshot, snapshot.version ?? STUDIO_VERSION)
  const patch: Record<string, unknown> = {}
  // Only persisted keys: a stored snapshot must never overwrite an action or transient field.
  for (const k of Object.keys(partialize(store.getState())))
    if (Object.hasOwn(migrated, k)) patch[k] = migrated[k]
  if (Object.hasOwn(patch, 'backdropHaze'))
    patch.backdropHaze = sanitizeBackdropHaze(patch.backdropHaze)
  if (Object.hasOwn(patch, 'musicVolume'))
    patch.musicVolume = sanitizeMusicVolume(patch.musicVolume)
  if (Object.hasOwn(patch, 'soundPreset'))
    patch.soundPreset = sanitizeSoundPreset(patch.soundPreset)
  store.setState({ ...(patch as Partial<StudioState>), selectedId: null })

  const world = tryGetWorld()
  if (!world) return
  const s = store.getState()
  if (s.worldSnapshot) restoreWorld(world, s.worldSnapshot)
  world.moldPatches = []
  world.pendingSubstrates = {}
  world.pendingWaterSplit = undefined
  // The env flush is one-way (world -> store), so the gauges must be re-seeded from the snapshot.
  seedWorldEnv(world, s)
  commitWorld()
}

/** The card line for a terrarium (spec gardenSummary). */
export function gardenSummary(store: StudioState, items: readonly PlacedItem[]): GardenSummary {
  return {
    vessel: store.vessel,
    day: Math.floor(store.dayCount),
    plants: items.filter((i) => i.category === 'flora').length,
    animals: items.filter((i) => i.category === 'fauna').length,
  }
}
