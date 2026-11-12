import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getWorld,
  isOwnSnapshot,
  mutateWorld,
  notifyWorldRestored,
  onWorldRestored,
  registerWorld,
  unregisterWorld,
} from '@/engine/engineBridge'
import { createWorld } from '@/engine/world'
import { appStore } from '@/store/appStore'
import { createDefaultState, patchStudioAtom, worldSnapshotAtom } from '@/store/studio'

beforeEach(() => {
  unregisterWorld()
  appStore.set(patchStudioAtom, createDefaultState())
})

describe('engineBridge', () => {
  it('onWorldRestored keeps one handler and its remover only removes its own', () => {
    const first = vi.fn()
    const second = vi.fn()
    const offFirst = onWorldRestored(first)
    const offSecond = onWorldRestored(second)
    notifyWorldRestored()
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
    offFirst()
    notifyWorldRestored()
    expect(second).toHaveBeenCalledTimes(2)
    offSecond()
    notifyWorldRestored()
    expect(second).toHaveBeenCalledTimes(2)
  })

  it('throws a clear error when no world is registered', () => {
    expect(() => mutateWorld(() => {})).toThrow(/no world registered/)
    expect(() => getWorld()).toThrow(/no world registered/)
  })

  it('mutateWorld runs fn, commits a snapshot and recognises it as its own', () => {
    const world = createWorld()
    registerWorld(world)
    mutateWorld((w) => {
      w.terrainContour[0] = 3
    })
    const snap = appStore.get(worldSnapshotAtom)
    expect(snap?.terrainContour[0]).toBe(3)
    expect(isOwnSnapshot(snap)).toBe(true)
    expect(isOwnSnapshot({ items: [], terrainContour: [] })).toBe(false)
    expect(isOwnSnapshot(null)).toBe(false)
  })
})
