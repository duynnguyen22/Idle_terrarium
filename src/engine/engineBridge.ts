import { snapshotWorld, type WorldSnapshot } from '@/engine/persistence'
import type { EngineWorld } from '@/engine/world'
import { useStudioStore } from '@/store/useStudioStore'

let current: EngineWorld | null = null
let lastCommitted: WorldSnapshot | null = null

/** Called by the engine hook once it has created its world. */
export function registerWorld(world: EngineWorld): void {
  current = world
  lastCommitted = null
}

export function unregisterWorld(): void {
  current = null
  lastCommitted = null
}

export function getWorld(): EngineWorld {
  if (!current) {
    throw new Error(
      'engineBridge: no world registered. The terrarium engine must be mounted first.',
    )
  }
  return current
}

/** Like getWorld but returns null instead of throwing; safe to call during render. */
export function tryGetWorld(): EngineWorld | null {
  return current
}

/** True when `snap` is the exact object this bridge last wrote to the store (the engine skips re-reading it). */
export function isOwnSnapshot(snap: WorldSnapshot | null): boolean {
  return snap !== null && snap === lastCommitted
}

/** Snapshots the world into the store and remembers the snapshot as ours. */
export function commitWorld(): void {
  const snap = snapshotWorld(getWorld())
  lastCommitted = snap
  useStudioStore.getState().setWorldSnapshot(snap)
}

/** Runs a UI-driven mutation against the live world, then publishes a snapshot to the store. */
export function mutateWorld(fn: (world: EngineWorld) => void): void {
  fn(getWorld())
  commitWorld()
}
