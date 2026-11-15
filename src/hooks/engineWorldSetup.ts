import { isOwnSnapshot, registerWorld } from '@/engine/engineBridge'
import { seedWorldEnv } from '@/engine/envSeed'
import { seedInitialScene } from '@/engine/presets'
import { ecoTimeFromDayCount, restoreWorld } from '@/engine/persistence'
import { createWorld, type EngineWorld } from '@/engine/world'
import { appStore } from '@/store/appStore'
import { dayCountAtom, studioStateAtom, worldSnapshotAtom } from '@/store/studio'

/** Builds the engine world from the saved studio state and snapshot, and registers it with the bridge. */
export function createEngineWorld(): EngineWorld {
  const world = createWorld()
  seedWorldEnv(world, appStore.get(studioStateAtom))
  const initial = appStore.get(worldSnapshotAtom)
  const dayCount = appStore.get(dayCountAtom)
  world.ecoTime = ecoTimeFromDayCount(dayCount)
  if (initial) restoreWorld(world, initial, dayCount)
  registerWorld(world)
  seedInitialScene(world)
  return world
}

/** Keeps `world` in step with snapshots written from outside the engine. Returns the unsubscribe. */
export function followWorldSnapshots(world: EngineWorld): () => void {
  // External snapshot changes (e.g. a preset load) replace the world's persistable parts;
  // snapshots the bridge wrote itself are skipped so mid-interaction item objects are not replaced.
  let prevSnapshot = appStore.get(worldSnapshotAtom)
  return appStore.sub(worldSnapshotAtom, () => {
    const snap = appStore.get(worldSnapshotAtom)
    const prev = prevSnapshot
    prevSnapshot = snap
    if (snap && snap !== prev && !isOwnSnapshot(snap))
      restoreWorld(world, snap, appStore.get(dayCountAtom))
  })
}
