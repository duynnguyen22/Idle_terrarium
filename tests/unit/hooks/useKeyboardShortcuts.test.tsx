import { fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { PlacedItem } from '@/data/types'
import { registerWorld, unregisterWorld } from '@/engine/engineBridge'
import { createWorld, type EngineWorld } from '@/engine/world'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { appStore } from '@/store/appStore'
import { patchStudioAtom, relaxModeAtom, selectedIdAtom } from '@/store/studio'

function Harness() {
  useKeyboardShortcuts()
  return <input data-testid="field" />
}

beforeEach(() => appStore.set(patchStudioAtom, { relaxMode: false, selectedId: null }))
afterEach(() => unregisterWorld())

const fern: PlacedItem = {
  uid: 'f1',
  id: 'peacock_fern',
  category: 'flora',
  x: 0.5,
  y: 0.6,
  scale: 1,
  rotation: 0,
  flipX: false,
  zIndex: 1,
  stage: 'lush',
}

/** A registered world whose camera has seen one 1000 x 800 frame. */
function sizedWorld(): EngineWorld {
  const world = createWorld()
  world.items = [{ ...fern }]
  world.view.size = { w: 1000, h: 800 }
  world.view.framedOnce = true
  registerWorld(world)
  return world
}

describe('useKeyboardShortcuts', () => {
  it('R toggles relax mode', () => {
    render(<Harness />)
    fireEvent.keyDown(window, { key: 'r' })
    expect(appStore.get(relaxModeAtom)).toBe(true)
    fireEvent.keyDown(window, { key: 'R' })
    expect(appStore.get(relaxModeAtom)).toBe(false)
  })

  it('Escape exits relax first, then clears selection', () => {
    render(<Harness />)
    appStore.set(patchStudioAtom, { relaxMode: true, selectedId: 'a' })
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(appStore.get(relaxModeAtom)).toBe(false)
    expect(appStore.get(selectedIdAtom)).toBe('a')
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(appStore.get(selectedIdAtom)).toBeNull()
  })

  it('ignores keys typed in inputs and modified keys', () => {
    const { getByTestId } = render(<Harness />)
    fireEvent.keyDown(getByTestId('field'), { key: 'r' })
    expect(appStore.get(relaxModeAtom)).toBe(false)
    fireEvent.keyDown(window, { key: 'r', metaKey: true })
    expect(appStore.get(relaxModeAtom)).toBe(false)
  })

  it('F frames the plants and 0 shows the whole tank; neither fires while typing', () => {
    const { getByTestId } = render(<Harness />)
    const world = sizedWorld()

    fireEvent.keyDown(getByTestId('field'), { key: 'f' })
    expect(world.view.camT).toEqual({ z: 1, u: 0.5, v: 0.5 })

    fireEvent.keyDown(window, { key: 'F' })
    expect(world.view.camT.z).toBeGreaterThan(1.2)
    const framed = { ...world.view.camT }

    fireEvent.keyDown(getByTestId('field'), { key: '0' })
    expect(world.view.camT).toEqual(framed)

    fireEvent.keyDown(window, { key: '0' })
    expect(world.view.camT).toEqual({ z: 1, u: 0.5, v: 0.5 })

    // With no world (or no sized canvas) the keys do nothing.
    unregisterWorld()
    expect(() => fireEvent.keyDown(window, { key: 'f' })).not.toThrow()
  })
})
