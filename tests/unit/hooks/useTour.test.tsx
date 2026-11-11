import { act, fireEvent, render, renderHook, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TourCaption } from '@/components/stage/TourCaption'
import type { PlacedItem } from '@/data/types'
import { registerWorld, unregisterWorld } from '@/engine/engineBridge'
import { TOUR_PING_MS } from '@/engine/marks'
import { createWorld, type EngineWorld } from '@/engine/world'
import { useRelaxMode } from '@/hooks/useRelaxMode'
import { isEvening, useTour } from '@/hooks/useTour'
import { useOverlayStore } from '@/store/useOverlayStore'
import { createDefaultState, useStudioStore } from '@/store/useStudioStore'
import * as marks from '@/engine/marks'

vi.mock('@/engine/marks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/engine/marks')>()
  return { ...actual, pingItem: vi.fn(actual.pingItem) }
})

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

const steps = [
  { uid: 'a', text: 'The rose opened.' },
  { uid: 'b', text: 'A fern came up.' },
  { uid: 'c', text: 'The moss spread.' },
]

let world: EngineWorld

function Harness() {
  useRelaxMode()
  useTour()
  return <TourCaption />
}

const tour = () => useOverlayStore.getState().tour

beforeEach(() => {
  vi.useFakeTimers()
  vi.mocked(marks.pingItem).mockClear()
  useStudioStore.setState(createDefaultState())
  useOverlayStore.setState({ growthBoardOpen: false, awayIndex: null, tour: null })
  world = createWorld()
  world.items.push(placed('a'), placed('b'), placed('c'))
  registerWorld(world)
})

afterEach(() => {
  unregisterWorld()
  vi.useRealTimers()
})

describe('isEvening', () => {
  it('is true from 17:00 until 05:00 and false by day', () => {
    expect(isEvening(new Date(2026, 10, 11, 17, 0))).toBe(true)
    expect(isEvening(new Date(2026, 10, 11, 4, 0))).toBe(true)
    expect(isEvening(new Date(2026, 10, 11, 12, 0))).toBe(false)
    expect(isEvening(new Date(2026, 10, 11, 5, 0))).toBe(false)
  })
})

describe('useTour', () => {
  it('pings each step in order every 4200 ms, then ends', () => {
    render(<Harness />)
    act(() => useOverlayStore.getState().startTour(steps))
    const calls = vi.mocked(marks.pingItem)
    expect(calls).toHaveBeenCalledTimes(1)
    expect(calls).toHaveBeenLastCalledWith(world, 'a', TOUR_PING_MS)
    act(() => void vi.advanceTimersByTime(TOUR_PING_MS - 1))
    expect(calls).toHaveBeenCalledTimes(1)
    act(() => void vi.advanceTimersByTime(1))
    expect(calls).toHaveBeenLastCalledWith(world, 'b', TOUR_PING_MS)
    expect(tour()?.i).toBe(1)
    act(() => void vi.advanceTimersByTime(TOUR_PING_MS))
    expect(calls).toHaveBeenLastCalledWith(world, 'c', TOUR_PING_MS)
    expect(calls).toHaveBeenCalledTimes(3)
    act(() => void vi.advanceTimersByTime(TOUR_PING_MS))
    expect(tour()).toBeNull()
    expect(calls).toHaveBeenCalledTimes(3)
  })

  it('shows the quiet caption for an empty tour and ends it after 3200 ms', () => {
    render(<Harness />)
    act(() => useOverlayStore.getState().startTour([]))
    expect(screen.getByText('Nothing new to look at yet. Enjoy the quiet.')).toBeInTheDocument()
    expect(marks.pingItem).not.toHaveBeenCalled()
    act(() => void vi.advanceTimersByTime(3199))
    expect(tour()).not.toBeNull()
    act(() => void vi.advanceTimersByTime(1))
    expect(tour()).toBeNull()
    expect(document.getElementById('tour-caption')).toBeNull()
  })

  it('clears its timer when the tour is ended or the hook unmounts', () => {
    const { unmount } = renderHook(() => useTour())
    act(() => useOverlayStore.getState().startTour(steps))
    act(() => useOverlayStore.getState().endTour())
    act(() => void vi.advanceTimersByTime(TOUR_PING_MS * 2))
    expect(marks.pingItem).toHaveBeenCalledTimes(1)
    act(() => useOverlayStore.getState().startTour(steps))
    unmount()
    act(() => void vi.advanceTimersByTime(TOUR_PING_MS * 2))
    expect(tour()?.i).toBe(0)
  })

  it('captions each step with its position and text, and Skip ends the tour', () => {
    vi.setSystemTime(new Date(2026, 10, 11, 12, 0))
    render(<Harness />)
    expect(document.getElementById('tour-caption')).toBeNull()
    act(() => useOverlayStore.getState().startTour(steps))
    const caption = document.getElementById('tour-caption')
    expect(caption?.querySelector('.tour-pos')).toHaveTextContent('Since last time · 1 of 3')
    expect(caption?.querySelector('.tour-text')).toHaveTextContent('The rose opened.')
    act(() => void vi.advanceTimersByTime(TOUR_PING_MS))
    expect(caption?.querySelector('.tour-pos')).toHaveTextContent('Since last time · 2 of 3')
    act(() => void fireEvent.click(screen.getByRole('button', { name: 'Skip' })))
    expect(tour()).toBeNull()
  })

  it('says Tonight in the evening', () => {
    vi.setSystemTime(new Date(2026, 10, 11, 20, 0))
    render(<Harness />)
    act(() => useOverlayStore.getState().startTour(steps))
    expect(document.querySelector('.tour-pos')).toHaveTextContent('Tonight · 1 of 3')
  })

  it('ends the tour when relax mode is left', () => {
    render(<Harness />)
    act(() => useStudioStore.getState().setRelaxMode(true))
    act(() => useOverlayStore.getState().startTour(steps))
    expect(tour()).not.toBeNull()
    act(() => useStudioStore.getState().setRelaxMode(false))
    expect(tour()).toBeNull()
  })
})
