import { findCatalogDef } from '@/data/catalog'
import type { PlacedItem } from '@/data/types'
import type { EngineWorld } from './world'

/** Hit radius in normalized units at scale 1 (prototype 3195). */
export const HIT_RADIUS = 0.085
/** Magnetic snap radius around a host mount point, in normalized units. */
export const SNAP_RADIUS = 0.045
/** Hardscape mount points are expressed in units of this size times the host's scale. */
export const MOUNT_HOST_SIZE = 0.18

/** Every cue name the prototype's playTactileASMR (1611-1665) defines. */
export type AsmrCue = 'mist' | 'chime' | 'repot' | 'prune' | 'scatter' | 'pour_water'

export interface ToolEffect {
  sound?: AsmrCue
  toast?: string
  /** The press starts a hold (mist): the caller captures the pointer and ends it on release. */
  hold?: boolean
}

export type CareTool = 'mist' | 'prune' | 'boost' | 'scrub'

/** Topmost (highest zIndex) item within `0.085 * scale` of (nx, ny). Distance-based, as in the prototype. */
export function hitTest(world: EngineWorld, nx: number, ny: number): PlacedItem | null {
  const sorted = [...world.items].sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0))
  return (
    sorted.find((item) => Math.hypot(item.x - nx, item.y - ny) < HIT_RADIUS * (item.scale || 1)) ??
    null
  )
}

export function beginDrag(world: EngineWorld, item: PlacedItem, nx: number, ny: number): void {
  world.draggingId = item.uid
  world.dragOffset = { x: item.x - nx, y: item.y - ny }
}

const clampTo = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

/**
 * Moves the dragged item to the pointer (plus grab offset), clamped to the play area, snapping to a hardscape
 * mount point within SNAP_RADIUS when the item can mount (flora with canMountOnRock, or any fauna). The item is
 * unmounted first on every move, so dragging away beyond the radius detaches it. Returns the item, or null.
 * Children of the dragged item follow via syncChildren in the tick.
 */
export function updateDrag(world: EngineWorld, nx: number, ny: number): PlacedItem | null {
  if (!world.draggingId) return null
  const item = world.items.find((i) => i.uid === world.draggingId)
  if (!item) return null

  let targetX = clampTo(nx + world.dragOffset.x, 0.18, 0.82)
  let targetY = clampTo(ny + world.dragOffset.y, 0.18, 0.86)

  const def = findCatalogDef(item.id)
  item.parentUid = null
  world.hoveredSnapTarget = null
  if (def && ((def.category === 'flora' && def.canMountOnRock) || item.category === 'fauna')) {
    snap: for (const host of world.items) {
      if (host.uid === item.uid || host.category !== 'hardscape') continue
      const hostDef = findCatalogDef(host.id)
      if (!hostDef || hostDef.category !== 'hardscape' || !hostDef.mountPoints) continue
      const hostSize = MOUNT_HOST_SIZE * (host.scale || 1)
      for (const mp of hostDef.mountPoints) {
        const mpx = host.x + mp.ox * hostSize
        const mpy = host.y + mp.oy * hostSize
        if (Math.hypot(targetX - mpx, targetY - mpy) < SNAP_RADIUS) {
          targetX = mpx
          targetY = mpy
          item.parentUid = host.uid
          item.offsetX = targetX - host.x
          item.offsetY = targetY - host.y
          world.hoveredSnapTarget = host.uid
          break snap
        }
      }
    }
  }
  item.x = targetX
  item.y = targetY
  return item
}

export function endDrag(world: EngineWorld): void {
  world.draggingId = null
  world.hoveredSnapTarget = null
}

/**
 * Applies a care tool at a pointer-down (prototype-v6 canvas pointerdown). Returns null when the tool does not
 * consume the press (select; prune with no flora under the pointer), so the caller falls through to select/drag.
 * Mist starts a hold-to-spray stroke (the tick sprays while `world.isMisting`; release via endMist).
 * Boost acts directly on `world.env.nutrients`. Scrub removes the most recent
 * mold patch wherever the pointer is, exactly like the prototype.
 */
export function applyTool(
  world: EngineWorld,
  tool: string,
  nx: number,
  ny: number,
): ToolEffect | null {
  switch (tool) {
    case 'mist':
      world.isMisting = true
      world.mistStartHumidity = world.env.humidity
      return { hold: true }
    case 'boost':
      world.env.nutrients = Math.min(100, world.env.nutrients + 8)
      return { sound: 'chime' }
    case 'scrub':
      if (world.moldPatches.length > 0) {
        world.moldPatches.pop()
        return { sound: 'repot', toast: '🧽 Scrubbed away fungal mold spores!' }
      }
      return { toast: '✨ Substrate is already spotless and mold-free!' }
    case 'prune': {
      const hit = hitTest(world, nx, ny)
      if (hit && hit.category === 'flora') {
        hit.scale = Math.max(0.55, (hit.scale || 1) * 0.88)
        return { sound: 'prune', toast: '✂️ Pruned foliage neatly' }
      }
      return null
    }
    default:
      return null
  }
}
