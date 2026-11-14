import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ViewControls } from '@/components/stage/ViewControls'
import { registerWorld, unregisterWorld } from '@/engine/engineBridge'
import { createWorld, type EngineWorld } from '@/engine/world'
import { appStore } from '@/store/appStore'
import { toastAtom } from '@/store/toast'
import { VIEW_STORAGE_KEY, depthOnAtom, hydrateViewPrefs, zoomPctAtom } from '@/store/view'

const click = (el: HTMLElement) => act(() => void fireEvent.click(el))

let world: EngineWorld

beforeEach(() => {
  world = createWorld()
  world.view.size = { w: 800, h: 600 }
  registerWorld(world)
  appStore.set(zoomPctAtom, 100)
  appStore.set(depthOnAtom, true)
  appStore.set(toastAtom, { message: '', visible: false })
  localStorage.clear()
})

afterEach(() => {
  unregisterWorld()
})

describe('ViewControls', () => {
  it('shows the zoom percent and disables zoom out at 100 % and zoom in at 400 %', () => {
    render(<ViewControls />)
    const out = screen.getByRole('button', { name: 'Zoom out' })
    const inn = screen.getByRole('button', { name: 'Zoom in' })
    expect(screen.getByTitle('Show the whole tank (0)').textContent).toBe('100%')
    expect(out).toBeDisabled()
    expect(inn).not.toBeDisabled()

    act(() => appStore.set(zoomPctAtom, 250))
    expect(screen.getByTitle('Show the whole tank (0)').textContent).toBe('250%')
    expect(out).not.toBeDisabled()
    expect(inn).not.toBeDisabled()

    act(() => appStore.set(zoomPctAtom, 400))
    expect(inn).toBeDisabled()
    expect(out).not.toBeDisabled()
  })

  it('the percent button returns to the whole tank', () => {
    world.view.cam.z = 2.5
    world.view.camT.z = 2.5
    world.view.camT.u = 0.7
    render(<ViewControls />)
    act(() => appStore.set(zoomPctAtom, 250))
    click(screen.getByTitle('Show the whole tank (0)'))
    expect(world.view.camT.z).toBe(1)
    expect(world.view.camT.u).toBe(0.5)
  })

  it('zoom in and out step by 1.35 about the canvas centre', () => {
    render(<ViewControls />)
    click(screen.getByRole('button', { name: 'Zoom in' }))
    expect(world.view.camT.z).toBeCloseTo(1.35, 5)
    act(() => appStore.set(zoomPctAtom, 135))
    click(screen.getByRole('button', { name: 'Zoom out' }))
    expect(world.view.camT.z).toBeCloseTo(1, 5)
  })

  it('does nothing before the canvas has a size', () => {
    world.view.size = null
    render(<ViewControls />)
    click(screen.getByRole('button', { name: 'Zoom in' }))
    expect(world.view.camT.z).toBe(1)
  })

  it('the depth toggle flips aria-pressed, saves the pref and shows the toast', () => {
    const off = hydrateViewPrefs(appStore, localStorage)
    render(<ViewControls />)
    const depth = screen.getByRole('button', { name: 'Depth effects' })
    expect(depth).toHaveAttribute('aria-pressed', 'true')

    click(depth)
    expect(depth).toHaveAttribute('aria-pressed', 'false')
    expect(appStore.get(depthOnAtom)).toBe(false)
    expect(JSON.parse(localStorage.getItem(VIEW_STORAGE_KEY)!).depth).toBe(false)
    expect(appStore.get(toastAtom).message).toBe('Depth effects off: flat view')

    click(depth)
    expect(depth).toHaveAttribute('aria-pressed', 'true')
    expect(appStore.get(toastAtom).message).toBe('Depth effects on')
    off()
  })

  it('every control has an accessible name', () => {
    render(<ViewControls />)
    expect(screen.getByRole('group', { name: 'View' })).toBeInTheDocument()
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(5)
    for (const b of buttons) expect(b).toHaveAccessibleName()
  })
})
