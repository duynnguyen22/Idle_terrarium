import { beforeEach, describe, expect, it } from 'vitest'
import { registerWorld, unregisterWorld } from '@/engine/engineBridge'
import { seedInitialScene } from '@/engine/presets'
import { createWorld } from '@/engine/world'
import { createDefaultState, useStudioStore } from '@/store/useStudioStore'

beforeEach(() => {
  unregisterWorld()
  useStudioStore.setState(createDefaultState())
})

describe('seedInitialScene', () => {
  it('seeds Falls Lake and commits when the world has no items (no snapshot / zero-item snapshot)', () => {
    const world = createWorld()
    registerWorld(world)
    expect(seedInitialScene(world)).toBe(true)
    expect(world.items).toHaveLength(15)
    expect(useStudioStore.getState().worldSnapshot?.items).toHaveLength(15)
  })

  it('leaves a populated world untouched', () => {
    const world = createWorld()
    registerWorld(world)
    seedInitialScene(world)
    const snap = useStudioStore.getState().worldSnapshot
    expect(seedInitialScene(world)).toBe(false)
    expect(useStudioStore.getState().worldSnapshot).toBe(snap)
  })
})
