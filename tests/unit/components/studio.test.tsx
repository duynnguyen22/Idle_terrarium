import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Toast } from '@/components/stage/Toast'
import { RightTelemetry } from '@/components/layout/RightTelemetry'
import { TopNav } from '@/components/layout/TopNav'
import { GaugeBar } from '@/components/telemetry/GaugeBar'
import { registerWorld, unregisterWorld } from '@/engine/engineBridge'
import { createWorld, type EngineWorld } from '@/engine/world'
import { showToast, useToastStore } from '@/store/toastStore'
import { createDefaultState, useStudioStore } from '@/store/useStudioStore'
import type { PlacedItem } from '@/data/types'

const item = (uid: string, category: PlacedItem['category']): PlacedItem => ({
  uid,
  id: 'x',
  category,
  x: 0.5,
  y: 0.5,
  scale: 1,
  rotation: 0,
  flipX: false,
  zIndex: 1,
})

let world: EngineWorld
const user = () => ({ click: (el: HTMLElement) => act(() => void fireEvent.click(el)) })

beforeEach(() => {
  vi.useFakeTimers()
  useStudioStore.setState(createDefaultState())
  useToastStore.setState({ message: '', visible: false })
  world = createWorld()
  registerWorld(world)
})

afterEach(() => {
  unregisterWorld()
  vi.useRealTimers()
})

describe('TopNav speed controls', () => {
  it('updates timeSpeed/realTimeMode and aria-pressed', async () => {
    render(<TopNav />)
    const u = user()
    expect(screen.getByRole('button', { name: /real-time/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await u.click(screen.getByRole('button', { name: /5×/ }))
    expect(useStudioStore.getState()).toMatchObject({ timeSpeed: 5, realTimeMode: false })
    expect(screen.getByRole('button', { name: /5×/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /real-time/i })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    await u.click(screen.getByRole('button', { name: 'Pause' }))
    expect(useStudioStore.getState()).toMatchObject({ timeSpeed: 0, realTimeMode: false })
    expect(screen.getByRole('button', { name: 'Pause' })).toHaveAttribute('aria-pressed', 'true')
    await u.click(screen.getByRole('button', { name: '1×' }))
    expect(useStudioStore.getState()).toMatchObject({ timeSpeed: 1, realTimeMode: false })
    await u.click(screen.getByRole('button', { name: /real-time/i }))
    expect(useStudioStore.getState()).toMatchObject({ timeSpeed: 1, realTimeMode: true })
  })

  it('shows the real date and Day N', () => {
    vi.setSystemTime(new Date(2026, 2, 9, 14, 5, 7))
    useStudioStore.setState({ dayCount: 4 })
    render(<TopNav />)
    expect(screen.getByText('Mar 9 · Day 4')).toBeInTheDocument()
    expect(screen.getByText('14:05:07')).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(screen.getByText('14:05:08')).toBeInTheDocument()
  })

  it('+1 Day advances the day, grows flora and toasts', async () => {
    world.items = [{ ...item('f', 'flora'), scale: 1 }]
    render(<TopNav />)
    await user().click(screen.getByRole('button', { name: '+1 Day' }))
    expect(useStudioStore.getState().dayCount).toBe(2)
    expect(world.items[0].scale).toBeCloseTo(1.06)
    expect(useToastStore.getState().message).toBe('🌱 Advanced +24 Hours — plants grew lushly!')
  })
})

describe('lighting', () => {
  it('Night sets lighting and turns Auto Sync off; Auto Sync turns it back on', async () => {
    render(<TopNav />)
    const u = user()
    await u.click(screen.getByRole('button', { name: /Night/ }))
    expect(useStudioStore.getState()).toMatchObject({ lighting: 'night', autoLightSync: false })
    await u.click(screen.getByRole('button', { name: /Auto Sync/ }))
    expect(useStudioStore.getState().autoLightSync).toBe(true)
  })

  it.each([
    ['dawn', 'DAWN · DEW CONDENSATION'],
    ['sunlight', 'DAY · PHOTOSYNTHESIS'],
    ['twilight', 'DUSK · GOLDEN HOUR'],
    ['night', 'NIGHT · RESPIRATION'],
  ] as const)('cycle badge for %s', (lighting, text) => {
    useStudioStore.setState({ lighting })
    render(<TopNav />)
    expect(screen.getByText(text)).toBeInTheDocument()
  })
})

describe('utility actions', () => {
  it('renders Relax, Audio and Snapshot buttons', () => {
    render(<TopNav />)
    expect(screen.getByRole('button', { name: /Relax Mode/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Toggle Ambient Soundscape/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Snapshot/ })).toBeInTheDocument()
  })

  it('Clear empties world items and the stored snapshot', async () => {
    world.items = [item('a', 'flora'), item('b', 'fauna')]
    render(<TopNav />)
    await user().click(screen.getByRole('button', { name: 'Clear Placed Specimens' }))
    expect(world.items).toEqual([])
    expect(useStudioStore.getState().worldSnapshot?.items).toEqual([])
    expect(useToastStore.getState().message).toBe('Cleared all specimens')
  })

  it('Biome applies Falls Lake to the world and store', async () => {
    render(<TopNav />)
    await user().click(screen.getByRole('button', { name: /Biome/ }))
    expect(world.items.length).toBeGreaterThan(5)
    const fauna = world.items.find((i) => i.category === 'fauna')
    expect(fauna).toMatchObject({ aiState: 'wandering', aiTimer: 120 })
    expect(world.items.find((i) => i.category === 'flora')).toMatchObject({
      stage: 'mature',
      growthProgress: 0.85,
      vitality: 98,
    })
    expect(useStudioStore.getState().substrates.water).toBe(45)
    expect(useStudioStore.getState().worldSnapshot?.items.length).toBe(world.items.length)
  })
})

describe('GaugeBar', () => {
  it('fill width equals the value %', () => {
    render(<GaugeBar label="Humidity" value={78} fillClass="bg-sky-500" />)
    expect(screen.getByTestId('gauge-fill')).toHaveStyle({ width: '78%' })
    expect(screen.getByText('78%')).toBeInTheDocument()
  })
})

describe('RightTelemetry', () => {
  it('+Spore adds a mold patch to the world', async () => {
    render(<RightTelemetry />)
    await user().click(screen.getByRole('button', { name: '+Spore' }))
    expect(world.moldPatches).toHaveLength(1)
  })

  it('shows telemetry values, the note, and counts all fauna', () => {
    useStudioStore.setState({
      telemetry: {
        ...createDefaultState().telemetry,
        humidity: 61,
        moldCount: 2,
        cleanupCrewCount: 0,
        note: 'Hello note',
      },
      worldSnapshot: {
        items: [item('a', 'fauna'), item('b', 'fauna'), item('c', 'flora')],
        terrainContour: [],
      },
    })
    render(<RightTelemetry />)
    expect(screen.getByText('61%')).toBeInTheDocument()
    expect(screen.getByText('Hello note')).toBeInTheDocument()
    expect(screen.getAllByText('2 Active')).toHaveLength(2)
    expect(screen.getByText('3 Specimens')).toBeInTheDocument()
  })
})

describe('Toast', () => {
  it('appears and disappears after the timeout', () => {
    render(<Toast />)
    expect(screen.getByRole('status')).toHaveAttribute('data-visible', 'false')
    act(() => showToast('Hello'))
    expect(screen.getByRole('status')).toHaveTextContent('Hello')
    expect(screen.getByRole('status')).toHaveAttribute('data-visible', 'true')
    act(() => {
      vi.advanceTimersByTime(2199)
    })
    expect(screen.getByRole('status')).toHaveAttribute('data-visible', 'true')
    act(() => {
      vi.advanceTimersByTime(2)
    })
    expect(screen.getByRole('status')).toHaveAttribute('data-visible', 'false')
  })
})
