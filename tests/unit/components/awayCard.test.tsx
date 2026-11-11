import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AwayCard } from '@/components/stage/AwayCard'
import type { PlacedItem } from '@/data/types'
import { registerWorld, unregisterWorld } from '@/engine/engineBridge'
import { PING_MS } from '@/engine/marks'
import type { AwayReport } from '@/engine/simulation/report'
import { createWorld, type EngineWorld } from '@/engine/world'
import { useOverlayStore } from '@/store/useOverlayStore'
import { createDefaultState, useStudioStore } from '@/store/useStudioStore'

const placed = (uid: string): PlacedItem => ({
  uid,
  id: 'x',
  category: 'flora',
  x: 0.5,
  y: 0.5,
  scale: 1,
  rotation: 0,
  flipX: false,
  zIndex: 1,
})

const report = (over: Partial<AwayReport> = {}): AwayReport => ({
  from: Date.now() - 2 * 3_600_000,
  to: Date.now(),
  hours: 2,
  tankHours: 24,
  capped: false,
  mode: 'away',
  reason: 'return',
  items: [],
  more: 0,
  rest: [],
  hints: [],
  ...over,
})

const full = (): AwayReport =>
  report({
    items: [
      { kind: 'open', uid: 'a', id: 'x', text: 'The rose opened pink flowers.', count: 1 },
      { kind: 'seedling', uid: 'b', id: 'x', text: 'A fern seedling came up.', count: 2 },
    ],
    more: 1,
    hints: [{ uid: 'a', text: 'Rose: flowers fade', eta: 2 }],
  })

let world: EngineWorld
const click = (el: HTMLElement) => act(() => void fireEvent.click(el))

beforeEach(() => {
  useStudioStore.setState(createDefaultState())
  useOverlayStore.setState({ growthBoardOpen: false, awayIndex: null, tour: null })
  world = createWorld()
  world.items.push(placed('a'), placed('b'))
  registerWorld(world)
})

afterEach(() => {
  unregisterWorld()
})

const open = (reports: AwayReport[], index = 0) => {
  useStudioStore.setState({ awayLog: reports })
  useOverlayStore.setState({ awayIndex: index })
}

describe('AwayCard', () => {
  it('renders nothing when closed or when the log is empty', () => {
    const { container, rerender } = render(<AwayCard />)
    expect(container).toBeEmptyDOMElement()
    useOverlayStore.setState({ awayIndex: 0 })
    rerender(<AwayCard />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders eyebrow, title, lines, the more line, hints and Got it for an away report', () => {
    open([full()])
    render(<AwayCard />)
    const card = screen.getByRole('dialog')
    expect(card).toHaveAttribute('id', 'away-card')
    expect(card).toHaveAccessibleName(/^3 changes since today at \d\d:\d\d$/)
    expect(screen.getByText('While you were away · 2 h · 1 tank day')).toBeInTheDocument()
    expect(screen.getByText('The rose opened pink flowers.')).toBeInTheDocument()
    expect(screen.getByText('A fern seedling came up.')).toBeInTheDocument()
    expect(screen.getByText('And 1 smaller change.')).toBeInTheDocument()
    expect(screen.getByText('Coming up, if it stays healthy')).toBeInTheDocument()
    expect(screen.getByText(/^Rose: flowers fade in about/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Got it' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Earlier/ })).toBeNull()
  })

  it('counts the more line into the title and pluralises', () => {
    open([report({ items: [full().items[0]!], more: 0 })])
    const { unmount } = render(<AwayCard />)
    expect(screen.getByRole('dialog')).toHaveAccessibleName(/^1 change since /)
    unmount()
    open([report({ items: [full().items[0]!], more: 1 })])
    render(<AwayCard />)
    expect(screen.getByRole('dialog')).toHaveAccessibleName(/^2 changes since /)
  })

  it('says "A quiet night" and the rested line when empty', () => {
    open([report()])
    render(<AwayCard />)
    expect(screen.getByText('A quiet night')).toBeInTheDocument()
    expect(
      screen.getByText('The tank rested while you were away. Nothing needs doing.'),
    ).toBeInTheDocument()
  })

  it('shows "Resting since …" with only a rest line', () => {
    open([report({ rest: ['fern'] })])
    render(<AwayCard />)
    expect(screen.getByRole('dialog')).toHaveAccessibleName(/^Resting since today at \d\d:\d\d$/)
    expect(screen.getByText(/The fern slowed down to rest/)).toBeInTheDocument()
    expect(screen.queryByText(/Nothing needs doing/)).toBeNull()
  })

  it('pager appears with 2 entries and walks Earlier/Later', () => {
    open([full(), report({ rest: ['fern'] })])
    render(<AwayCard />)
    const earlier = screen.getByRole('button', { name: /Earlier/ })
    const later = screen.getByRole('button', { name: /Later/ })
    expect(screen.getByText('Latest')).toBeInTheDocument()
    expect(later).toBeDisabled()
    expect(earlier).toBeEnabled()
    click(earlier)
    expect(useOverlayStore.getState().awayIndex).toBe(1)
    expect(screen.getByText('2 of 2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Earlier/ })).toBeDisabled()
    expect(screen.getByRole('dialog')).toHaveAccessibleName(/^Resting since /)
    click(screen.getByRole('button', { name: /Later/ }))
    expect(useOverlayStore.getState().awayIndex).toBe(0)
    expect(screen.getByText('Latest')).toBeInTheDocument()
  })

  it('Got it and Escape close the card and clear rings', () => {
    open([full()])
    const { unmount } = render(<AwayCard />)
    expect(world.marks.rings).toEqual(['a', 'b'])
    click(screen.getByRole('button', { name: 'Got it' }))
    expect(useOverlayStore.getState().awayIndex).toBeNull()
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(world.marks.rings).toEqual([])

    act(() => useOverlayStore.getState().openAway(0))
    expect(world.marks.rings).toEqual(['a', 'b'])
    act(() => void fireEvent.keyDown(document, { key: 'Escape' }))
    expect(useOverlayStore.getState().awayIndex).toBeNull()
    expect(world.marks.rings).toEqual([])

    act(() => useOverlayStore.getState().openAway(0))
    expect(world.marks.rings).toEqual(['a', 'b'])
    unmount()
    expect(world.marks.rings).toEqual([])
  })

  it('Escape closes the card without touching the selection or other Escape handlers', () => {
    const other = vi.fn()
    window.addEventListener('keydown', other)
    useStudioStore.setState({ selectedId: 'a' })
    open([full()])
    render(<AwayCard />)
    act(() => void fireEvent.keyDown(document.body, { key: 'Escape' }))
    window.removeEventListener('keydown', other)
    expect(useOverlayStore.getState().awayIndex).toBeNull()
    expect(useStudioStore.getState().selectedId).toBe('a')
    expect(other).not.toHaveBeenCalled()
  })

  it('rings only uids that still exist and follow the page', () => {
    const gone = report({
      items: [{ kind: 'open', uid: 'zz', id: 'x', text: 'Gone.', count: 1 }],
      hints: [{ uid: 'b', text: 'Fern: grows', eta: 1 }],
    })
    open([full(), gone])
    render(<AwayCard />)
    expect(world.marks.rings).toEqual(['a', 'b'])
    click(screen.getByRole('button', { name: /Earlier/ }))
    expect(world.marks.rings).toEqual(['b'])
  })

  it('hover pings, click selects the item', () => {
    const spy = vi.spyOn(performance, 'now').mockReturnValue(1000)
    open([full()])
    render(<AwayCard />)
    const line = screen.getByText('The rose opened pink flowers.')
    act(() => void fireEvent.mouseEnter(line))
    expect(world.marks.pings.get('a')).toBe(1000 + PING_MS)
    click(line)
    expect(useStudioStore.getState().selectedId).toBe('a')
    spy.mockRestore()
  })

  it('works with no world registered', () => {
    unregisterWorld()
    open([full()])
    render(<AwayCard />)
    const line = screen.getByText('The rose opened pink flowers.')
    act(() => void fireEvent.mouseEnter(line))
    click(line)
    expect(useStudioStore.getState().selectedId).toBe('a')
  })

  it('marks (capped) and the preview/day eyebrows', () => {
    open([report({ capped: true, hours: 100, tankHours: 720 })])
    const { unmount } = render(<AwayCard />)
    expect(
      screen.getByText('While you were away · 4 days · 30 tank days (capped)'),
    ).toBeInTheDocument()
    unmount()
    open([report({ mode: 'preview', hours: 5 })])
    const second = render(<AwayCard />)
    expect(screen.getByText('Preview · 5 h later')).toBeInTheDocument()
    second.unmount()
    open([report({ mode: 'day', hours: 0.5 })])
    render(<AwayCard />)
    expect(screen.getByText('One tank day later')).toBeInTheDocument()
  })

  it('uses tank hours when under a day', () => {
    open([report({ tankHours: 6 })])
    render(<AwayCard />)
    expect(screen.getByText('While you were away · 2 h · 6 tank hours')).toBeInTheDocument()
  })

  it('offers the evening visit only when a reported item is still in the tank', () => {
    open([report()])
    const { unmount } = render(<AwayCard />)
    expect(screen.queryByRole('button', { name: 'Start the evening visit' })).toBeNull()
    unmount()
    open([
      report({
        items: [{ kind: 'open', uid: 'gone', id: 'x', text: 'The rose opened.', count: 1 }],
      }),
    ])
    const second = render(<AwayCard />)
    expect(screen.queryByRole('button', { name: 'Start the evening visit' })).toBeNull()
    second.unmount()
    open([full()])
    render(<AwayCard />)
    expect(screen.getByRole('button', { name: 'Start the evening visit' })).toBeInTheDocument()
  })

  it('starts the visit: closes the card, enters relax and tours the live items', () => {
    open([
      report({
        items: [
          { kind: 'open', uid: 'a', id: 'x', text: 'The rose opened.', count: 1 },
          { kind: 'open', uid: 'gone', id: 'x', text: 'Something removed.', count: 1 },
          { kind: 'seedling', uid: 'b', id: 'x', text: 'A fern seedling came up.', count: 1 },
        ],
      }),
    ])
    render(<AwayCard />)
    click(screen.getByRole('button', { name: 'Start the evening visit' }))
    const o = useOverlayStore.getState()
    expect(o.awayIndex).toBeNull()
    expect(o.tour).toEqual({
      steps: [
        { uid: 'a', text: 'The rose opened.' },
        { uid: 'b', text: 'A fern seedling came up.' },
      ],
      i: 0,
    })
    expect(useStudioStore.getState().relaxMode).toBe(true)
  })
})
