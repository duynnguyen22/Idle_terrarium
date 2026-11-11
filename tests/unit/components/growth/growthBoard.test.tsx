import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GrowthBoard } from '@/components/growth/GrowthBoard'
import { TopNav } from '@/components/layout/TopNav'
import { findCatalogDef } from '@/data/catalog'
import type { PlacedItem } from '@/data/types'
import { registerWorld, unregisterWorld } from '@/engine/engineBridge'
import { PING_MS } from '@/engine/marks'
import { createWorld, type EngineWorld } from '@/engine/world'
import { useToastStore } from '@/store/toastStore'
import { useOverlayStore } from '@/store/useOverlayStore'
import { createDefaultState, useStudioStore } from '@/store/useStudioStore'

const item = (uid: string, id: string, over: Partial<PlacedItem> = {}): PlacedItem => ({
  uid,
  id,
  category: findCatalogDef(id)?.category === 'fauna' ? 'fauna' : 'flora',
  x: 0.5,
  y: 0.5,
  scale: findCatalogDef(id)?.baseScale ?? 1,
  rotation: 0,
  flipX: false,
  zIndex: 1,
  ...over,
})

let world: EngineWorld
const click = (el: HTMLElement) => act(() => void fireEvent.click(el))

beforeEach(() => {
  vi.useFakeTimers()
  useStudioStore.setState(createDefaultState())
  useToastStore.setState({ message: '', visible: false })
  useOverlayStore.setState({ growthBoardOpen: false, awayIndex: null, tour: null })
  world = createWorld()
  registerWorld(world)
})

afterEach(() => {
  unregisterWorld()
  vi.useRealTimers()
})

const renderBoth = () =>
  render(
    <>
      <TopNav />
      <GrowthBoard />
    </>,
  )

describe('GrowthBoard', () => {
  it('Growth button opens the board with heading, pace group and footer; Escape closes', () => {
    renderBoth()
    expect(screen.queryByRole('dialog')).toBeNull()
    const button = screen.getByRole('button', { name: /growth/i })
    expect(button).toHaveAttribute('aria-controls', 'growth-board')
    click(button)
    const board = screen.getByRole('dialog')
    expect(board).toHaveAttribute('id', 'growth-board')
    expect(board.tagName).toBe('ASIDE')
    expect(board).toHaveAccessibleName('How your tank is growing')
    expect(screen.getByText('Growth board')).toBeInTheDocument()
    const group = screen.getByRole('radiogroup')
    expect(
      within(group)
        .getAllByRole('radio')
        .map((r) => r.textContent),
    ).toEqual(['Brisk', 'Garden', 'Calm', 'Real life'])
    expect(screen.getByRole('radio', { name: 'Garden' })).toBeChecked()
    expect(
      screen.getByText(/^Times are estimates at 1× speed and assume conditions stay the same\./),
    ).toBeInTheDocument()
    expect(screen.getByText('Tank age')).toBeInTheDocument()
    expect(screen.getByText('Day 1')).toBeInTheDocument()
    expect(screen.getByText('Moss cover')).toBeInTheDocument()
    expect(screen.getByText('Pool cycle')).toBeInTheDocument()
    act(() => useStudioStore.setState({ waterSplit: 0 }))
    expect(screen.queryByText('Pool cycle')).toBeNull()

    useStudioStore.setState({ selectedId: 'a' })
    const other = vi.fn()
    window.addEventListener('keydown', other)
    act(() => void fireEvent.keyDown(document.body, { key: 'Escape' }))
    window.removeEventListener('keydown', other)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(other).not.toHaveBeenCalled()
    expect(useStudioStore.getState().selectedId).toBe('a')
  })

  it('leaves Escape to relax mode while relax hides the board', () => {
    act(() => useOverlayStore.getState().openGrowthBoard())
    useStudioStore.setState({ relaxMode: true })
    const other = vi.fn()
    window.addEventListener('keydown', other)
    try {
      render(<GrowthBoard />)
      act(() => void fireEvent.keyDown(document.body, { key: 'Escape' }))
      expect(useOverlayStore.getState().growthBoardOpen).toBe(true)
      expect(other).toHaveBeenCalledTimes(1)
    } finally {
      window.removeEventListener('keydown', other)
      useStudioStore.setState({ relaxMode: false })
    }
  })

  it('shows both empty states', () => {
    act(() => useOverlayStore.getState().openGrowthBoard())
    render(<GrowthBoard />)
    expect(screen.getByText('No plants yet. Add some from the Flora tab.')).toBeInTheDocument()
    expect(
      screen.getByText('No animals yet. Add a cleanup crew from the Fauna tab.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Nothing is due. Healthy plants keep cycling.')).toBeInTheDocument()
  })

  it('subtitle reflects paused / 5× / closed-app copy', () => {
    act(() => useOverlayStore.getState().openGrowthBoard())
    render(<GrowthBoard />)
    expect(
      screen.getByText('1 tank day = 2 h. Growth continues while the app is closed.'),
    ).toBeInTheDocument()
    act(() => useStudioStore.setState({ timeSpeed: 0 }))
    expect(screen.getByText('1 tank day = 2 h. Paused while you watch.')).toBeInTheDocument()
    act(() => useStudioStore.setState({ timeSpeed: 5 }))
    expect(screen.getByText('1 tank day = 2 h. Running 5× while you watch.')).toBeInTheDocument()
  })

  it('pace radios set the pace and toast the subtitle', () => {
    act(() => useOverlayStore.getState().openGrowthBoard())
    render(<GrowthBoard />)
    click(screen.getByRole('radio', { name: 'Brisk' }))
    expect(useStudioStore.getState().pace).toBe('brisk')
    expect(useToastStore.getState().message).toBe('Tank pace: 1 tank day = 30 min')
    expect(screen.getByRole('radio', { name: 'Brisk' })).toBeChecked()
  })

  it('lists plants and animals, picks the soonest up-next, and refreshes every second', () => {
    world.items.push(
      item('p1', 'cryptanthus_pink', {
        stage: 'mature',
        vitality: 100,
        life: { cyc: 0.6, n: 0, tendrils: 0 },
      }),
      item('f1', 'springtails'),
      item('f2', 'springtails', { baby: 0.5 }),
    )
    world.mossTufts.push({ x: 0.2, r: 3, w: 0.05, seed: 0.1 })
    act(() => useOverlayStore.getState().openGrowthBoard())
    render(<GrowthBoard />)
    const plant = findCatalogDef('cryptanthus_pink')!.name
    expect(screen.getByText('In bud')).toBeInTheDocument()
    expect(screen.getByText('Buds open in about 1.4 h')).toBeInTheDocument()
    expect(screen.getByText('Thriving')).toBeInTheDocument()
    expect(screen.getByText(`${findCatalogDef('springtails')!.name} ×2`)).toBeInTheDocument()
    expect(screen.getByText('Young growing up: 50%')).toBeInTheDocument()
    expect(screen.getByText('Breeding · 2 of 6')).toBeInTheDocument()
    expect(screen.getByText('1 patch')).toBeInTheDocument()
    const up = screen.getByText('Up next').parentElement!
    expect(up).toHaveTextContent(`${plant}: buds open in about 1.4 h`)
    expect(within(up).getByText(plant).tagName).toBe('B')

    act(() => {
      world.items[0]!.life!.cyc = 0.75
      vi.advanceTimersByTime(1000)
    })
    expect(screen.getByText('Flowering')).toBeInTheDocument()
  })

  it('hover pings every uid of the row; click selects the first', () => {
    const spy = vi.spyOn(performance, 'now').mockReturnValue(500)
    world.items.push(
      item('f1', 'springtails'),
      item('f2', 'springtails'),
      item('p1', 'cryptanthus_pink', { stage: 'mature', life: { cyc: 0.2, n: 0, tendrils: 0 } }),
    )
    act(() => useOverlayStore.getState().openGrowthBoard())
    render(<GrowthBoard />)
    const faunaRow = screen
      .getByText(`${findCatalogDef('springtails')!.name} ×2`)
      .closest('button')!
    act(() => void fireEvent.mouseEnter(faunaRow))
    expect(world.marks.pings.get('f1')).toBe(500 + PING_MS)
    expect(world.marks.pings.get('f2')).toBe(500 + PING_MS)
    expect(world.marks.pings.has('p1')).toBe(false)
    click(faunaRow)
    expect(useStudioStore.getState().selectedId).toBe('f1')
    const plantRow = screen.getByText('Leafy growth').closest('button')!
    click(plantRow)
    expect(useStudioStore.getState().selectedId).toBe('p1')
    spy.mockRestore()
  })

  it('opening the board closes the away card', () => {
    useOverlayStore.setState({ awayIndex: 0 })
    act(() => useOverlayStore.getState().openGrowthBoard())
    expect(useOverlayStore.getState().awayIndex).toBeNull()
  })

  it('works with no world registered', () => {
    unregisterWorld()
    act(() => useOverlayStore.getState().openGrowthBoard())
    render(<GrowthBoard />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('No plants yet. Add some from the Flora tab.')).toBeInTheDocument()
  })
})
