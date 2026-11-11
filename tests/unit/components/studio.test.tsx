import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Toast } from '@/components/stage/Toast'
import { RightTelemetry } from '@/components/layout/RightTelemetry'
import { TopNav } from '@/components/layout/TopNav'
import { LightingControls } from '@/components/nav/LightingControls'
import { GaugeBar } from '@/components/telemetry/GaugeBar'
import { DEFAULT_ROOM } from '@/engine/room'
import { registerWorld, unregisterWorld } from '@/engine/engineBridge'
import { createWorld, type EngineWorld } from '@/engine/world'
import { showToast, useToastStore } from '@/store/toastStore'
import { useOverlayStore } from '@/store/useOverlayStore'
import { createDefaultState, useStudioStore } from '@/store/useStudioStore'
import { useAccountStore } from '@/store/useAccountStore'
import { createLocalBackend } from '@/auth/backend'
import { MemoryStorage } from './auth/authHarness'
import {
  createDefaultTelemetry,
  useTelemetryStore,
  type Telemetry,
} from '@/store/useTelemetryStore'
import type { PlacedItem } from '@/data/types'
import type { CareIssue } from '@/engine/care'

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
const initialAccount = useAccountStore.getState()
const user = () => ({ click: (el: HTMLElement) => act(() => void fireEvent.click(el)) })

beforeEach(() => {
  vi.useFakeTimers()
  useStudioStore.setState(createDefaultState())
  useTelemetryStore.setState({ telemetry: createDefaultTelemetry() })
  useToastStore.setState({ message: '', visible: false })
  useOverlayStore.setState({ growthBoardOpen: false, awayIndex: null, tour: null })
  world = createWorld()
  registerWorld(world)
})

afterEach(() => {
  useAccountStore.setState(initialAccount, true)
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

  it('+1 Day advances one tank day and toasts', async () => {
    world.items = [{ ...item('f', 'flora'), scale: 1 }]
    render(<TopNav />)
    await user().click(screen.getByRole('button', { name: '+1 day' }))
    expect(useStudioStore.getState().dayCount).toBe(2)
    expect(world.ecoTime).toBeCloseTo(1, 9)
    // The flat x1.06 bump is gone; size now follows plant vitality inside the ecology step.
    expect(world.items[0].scale).toBe(1)
    expect(useToastStore.getState().message).toMatch(/^Day 2: plants grew/)
  })

  it('+1 day logs a day report and opens the away card', async () => {
    render(<TopNav />)
    await user().click(screen.getByRole('button', { name: '+1 day' }))
    expect(useOverlayStore.getState().awayIndex).toBe(0)
    expect(useStudioStore.getState().awayLog[0]).toMatchObject({
      mode: 'day',
      reason: '+1 day',
      tankHours: 24,
    })
  })

  it('+1 Day that finishes the cycle says the pool has cycled', async () => {
    world.env.cycleProgress = 0.99
    render(<TopNav />)
    await user().click(screen.getByRole('button', { name: '+1 day' }))
    expect(world.env.cycleProgress).toBe(1)
    expect(useToastStore.getState().message).toBe('Day 2: plants grew. The pool has cycled.')
  })

  it('+Day writes an automatic journal entry when signed in, and nothing when signed out', async () => {
    const backend = createLocalBackend('u_demo', new MemoryStorage())
    const addJournal = vi.spyOn(backend, 'addJournal')
    // The fresh report after the advance has a warn (dry substrate) and an info (low nutrients).
    world.env.soilMoisture = 30
    world.env.nutrients = 30
    render(<TopNav />)
    const plusDay = screen.getByRole('button', { name: '+1 day' })

    // Signed out: the backend is never touched.
    useAccountStore.setState({ phase: 'signedout', activeId: 'g_a', backend })
    await user().click(plusDay)
    await act(async () => {})
    expect(useStudioStore.getState().dayCount).toBe(2)
    expect(addJournal).not.toHaveBeenCalled()

    // Signed in with an open terrarium: one automatic entry for the new day, no extra toast.
    useAccountStore.setState({ phase: 'cloud', activeId: 'g_a', backend })
    await user().click(plusDay)
    await vi.waitFor(() => expect(useAccountStore.getState().journal).toHaveLength(1))
    const saved = await backend.listJournal('g_a')
    expect(saved).toHaveLength(1)
    expect(saved[0]).toMatchObject({ day: 3, auto: true })
    expect(saved[0].note).toMatch(/^(One day later: |A quiet stretch\.)/)
    expect(saved[0].key).toMatch(/^day:\d+:\d+$/)
    expect(saved[0].issues).toEqual(['The substrate is drying out and the moss looks pale.'])
    expect(useToastStore.getState().message).toMatch(/^Day 3: plants grew/)

    // Signed in but no terrarium open yet: nothing either.
    useAccountStore.setState({ activeId: null })
    await user().click(plusDay)
    await act(async () => {})
    expect(addJournal).toHaveBeenCalledTimes(1)
  })

  it('+Day refreshes the care report so the automatic entry records the new day', async () => {
    const backend = createLocalBackend('u_demo', new MemoryStorage())
    // The telemetry store still holds the previous day's flush.
    useTelemetryStore.setState({
      telemetry: {
        ...createDefaultTelemetry(),
        nutrients: 88,
        careIssues: [{ level: 'warn', text: 'Yesterday’s stale warning.' }],
      },
    })
    world.env.nutrients = 50
    world.env.soilMoisture = 30
    // Five plants draw nutrients down by 0.4 each per tank day: 50 -> 48.
    world.items = Array.from({ length: 5 }, (_, i) => item(`f${i}`, 'flora'))
    // Inside the throttle window: a throttled push would skip the flush.
    world.lastTelemetryPush = performance.now()
    useAccountStore.setState({ phase: 'cloud', activeId: 'g_a', backend })
    render(<TopNav />)
    await user().click(screen.getByRole('button', { name: '+1 day' }))
    await vi.waitFor(() => expect(useAccountStore.getState().journal).toHaveLength(1))
    const [saved] = await backend.listJournal('g_a')
    expect(saved.metrics.nutrients).toBe(48)
    expect(saved.issues).toEqual(['The substrate is drying out and the moss looks pale.'])
    expect(useTelemetryStore.getState().telemetry.nutrients).toBeCloseTo(48, 6)
  })
})

describe('lighting', () => {
  it('Night sets lighting and turns Auto off; Auto turns it back on', async () => {
    render(<LightingControls />)
    const u = user()
    await u.click(screen.getByRole('button', { name: 'Night' }))
    expect(useStudioStore.getState()).toMatchObject({ lighting: 'night', autoLightSync: false })
    await u.click(screen.getByRole('button', { name: 'Auto' }))
    expect(useStudioStore.getState().autoLightSync).toBe(true)
  })

  it.each([
    ['dawn', 'Dawn · dew on the glass'],
    ['sunlight', 'Day · photosynthesis'],
    ['twilight', 'Dusk · lamp winding down'],
    ['night', 'Night · respiration'],
  ] as const)('cycle badge for %s', (lighting, text) => {
    useStudioStore.setState({ lighting })
    render(<TopNav />)
    expect(screen.getByText(text)).toBeInTheDocument()
  })
})

describe('utility actions', () => {
  it('renders Relax, Audio and Snapshot buttons', () => {
    render(<TopNav />)
    expect(screen.getByRole('button', { name: /Relax/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ambient sound' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Snapshot/ })).toBeInTheDocument()
  })

  it('Clear empties world items and the stored snapshot', async () => {
    world.items = [item('a', 'flora'), item('b', 'fauna')]
    render(<TopNav />)
    const u = user()
    await u.click(screen.getByRole('button', { name: 'More actions' }))
    await u.click(screen.getByRole('menuitem', { name: 'Clear all specimens' }))
    expect(world.items).toEqual([])
    expect(useStudioStore.getState().worldSnapshot?.items).toEqual([])
    expect(useToastStore.getState().message).toBe('Cleared all specimens')
  })

  it('Rebuild applies Falls Lake to the world and store', async () => {
    render(<TopNav />)
    const u = user()
    await u.click(screen.getByRole('button', { name: 'More actions' }))
    await u.click(screen.getByRole('menuitem', { name: 'Rebuild the Falls Lake paludarium' }))
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
  it('marker position spans value within min..max and shows the text', () => {
    render(
      <GaugeBar gaugeKey="humidity" label="Humidity" value={78} min={0} max={100} text="78%" />,
    )
    expect(screen.getByTestId('gauge-mark')).toHaveStyle({ left: '78%' })
    expect(screen.getByText('78%')).toBeInTheDocument()
  })

  it('maps the value and band into a non-zero range', () => {
    render(
      <GaugeBar
        gaugeKey="temperature"
        label="Temperature"
        value={25}
        min={15}
        max={35}
        text="25.0 °C"
        band={{ lo: 20, hi: 30, tol: 1 }}
      />,
    )
    expect(screen.getByTestId('gauge-mark')).toHaveStyle({ left: '50%' })
    expect(screen.getByTestId('gauge-band-temperature')).toHaveStyle({ left: '25%', width: '50%' })
    expect(screen.getByTestId('gauge-temperature')).toHaveAttribute('data-in-band', 'true')
  })
})

const withTelemetry = (partial: Partial<Telemetry>) =>
  useTelemetryStore.setState({ telemetry: { ...createDefaultTelemetry(), ...partial } })

const warn = (text: string): CareIssue => ({ level: 'warn', text })

describe('RightTelemetry', () => {
  it('renders water and air gauges from the room model', () => {
    useStudioStore.setState({ room: { ...DEFAULT_ROOM, water: 'tap' } })
    render(<RightTelemetry />)
    expect(screen.getByTestId('gauge-water')).toHaveAttribute('data-in-band', 'false')
    expect(screen.getByText('55 · Poor')).toBeInTheDocument()
    expect(screen.getByText('Tap water · 180 ppm · pH 7.2')).toBeInTheDocument()
    expect(screen.getByTestId('gauge-air')).toHaveAttribute('data-in-band', 'true')
    expect(screen.getByText('100 · Good')).toBeInTheDocument()
    expect(screen.getByText('Clean indoor air')).toBeInTheDocument()
  })

  it('orders the gauges nutrients, water, air, O2 as in the prototype', () => {
    render(<RightTelemetry />)
    const ids = [...document.querySelectorAll('[data-testid^="gauge-"]')]
      .map((el) => el.getAttribute('data-testid'))
      .filter((id) =>
        ['gauge-nutrients', 'gauge-water', 'gauge-air', 'gauge-o2'].includes(id ?? ''),
      )
    expect(ids).toEqual(['gauge-nutrients', 'gauge-water', 'gauge-air', 'gauge-o2'])
  })

  it('notes an active purifier on the air gauge', () => {
    useStudioStore.setState({ room: { ...DEFAULT_ROOM, air: 'traffic', purifier: true } })
    render(<RightTelemetry />)
    expect(screen.getByText('Near a busy road · purifier on')).toBeInTheDocument()
  })

  it('+Spore adds a mold patch to the world', async () => {
    render(<RightTelemetry />)
    await user().click(screen.getByRole('button', { name: /Spore/ }))
    expect(world.moldPatches).toHaveLength(1)
  })

  it('shows telemetry values, the top warning, the care list and the specimen count', () => {
    withTelemetry({
      humidity: 61,
      moldCount: 2,
      cleanupCrewCount: 2,
      careIssues: [
        { level: 'info', text: 'Info note' },
        { level: 'warn', text: 'Hello note' },
      ],
    })
    useStudioStore.setState({
      worldSnapshot: {
        items: [item('a', 'fauna'), item('b', 'fauna'), item('c', 'flora')],
        terrainContour: [],
      },
    })
    render(<RightTelemetry />)
    expect(screen.getByText('61%')).toBeInTheDocument()
    expect(screen.getAllByText('Hello note')).toHaveLength(2)
    expect(screen.getByText('Info note')).toBeInTheDocument()
    expect(screen.getByText('2 patches')).toBeInTheDocument()
    expect(screen.getByText('2 at work')).toBeInTheDocument()
    expect(screen.getByText('3 specimens')).toBeInTheDocument()
  })

  it('with no issues shows the condensation note and the all-clear list item', () => {
    withTelemetry({ condensation: 0.3, careIssues: [] })
    render(<RightTelemetry />)
    expect(
      screen.getByText(
        'Everything is in range. A light fog that forms and clears on its own means the water balance is right.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('Every plant and animal is in its range.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Crack the lid open' })).not.toBeInTheDocument()
  })

  it('temperature gauge shows °C text, °F hint and band state', () => {
    withTelemetry({ temperature: 24.5 })
    const { unmount } = render(<RightTelemetry />)
    expect(screen.getByText('24.5 °C')).toBeInTheDocument()
    expect(screen.getByText('Ideal 20–28 °C · 76.1 °F now')).toBeInTheDocument()
    expect(screen.getByTestId('gauge-temperature')).toHaveAttribute('data-in-band', 'true')
    unmount()
    withTelemetry({ temperature: 31 })
    render(<RightTelemetry />)
    expect(screen.getByTestId('gauge-temperature')).toHaveAttribute('data-in-band', 'false')
  })

  it('a non-finite temperature shows a dash and no hint', () => {
    withTelemetry({ temperature: NaN })
    render(<RightTelemetry />)
    const gauge = screen.getByTestId('gauge-temperature')
    expect(gauge).toHaveTextContent('— °C')
    expect(gauge).not.toHaveTextContent('NaN')
    expect(gauge).not.toHaveTextContent('Ideal')
  })

  it('conflicting ranges hide the band and leave the gauge on', () => {
    withTelemetry({ humidity: 70 })
    useStudioStore.setState({
      worldSnapshot: {
        items: [
          { ...item('e', 'flora'), id: 'echeveria' },
          { ...item('p', 'flora'), id: 'peacock_fern' },
        ],
        terrainContour: [],
      },
    })
    render(<RightTelemetry />)
    const gauge = screen.getByTestId('gauge-humidity')
    expect(gauge).toHaveAttribute('data-in-band', 'true')
    expect(screen.queryByTestId('gauge-band-humidity')).not.toBeInTheDocument()
    expect(screen.getByText('70%')).toBeInTheDocument()
    expect(
      screen.getByText('No humidity suits both Blue Peacock Fern and Rosette Succulent'),
    ).toBeInTheDocument()
  })

  it('o2 band follows the lamp', () => {
    withTelemetry({ o2Balance: 70 })
    const { unmount } = render(<RightTelemetry />)
    expect(screen.getByTestId('gauge-o2')).toHaveAttribute('data-in-band', 'false')
    unmount()
    useStudioStore.setState({ lighting: 'night' })
    render(<RightTelemetry />)
    expect(screen.getByTestId('gauge-o2')).toHaveAttribute('data-in-band', 'true')
  })

  it('badge reflects warning count', () => {
    withTelemetry({ careIssues: [{ level: 'info', text: 'i' }] })
    const { unmount } = render(<RightTelemetry />)
    expect(screen.getByText('Thriving')).toBeInTheDocument()
    unmount()
    withTelemetry({ careIssues: [warn('a'), warn('b')] })
    const second = render(<RightTelemetry />)
    expect(screen.getByText('Adjusting')).toBeInTheDocument()
    second.unmount()
    withTelemetry({ careIssues: [warn('a'), warn('b'), warn('c')] })
    render(<RightTelemetry />)
    expect(screen.getByText('Needs care')).toBeInTheDocument()
  })

  it('next-step button runs the care action and toasts', async () => {
    withTelemetry({
      careIssues: [
        { level: 'warn', text: 'x', action: { id: 'openLid', label: 'Crack the lid open' } },
      ],
    })
    render(<RightTelemetry />)
    await user().click(screen.getByRole('button', { name: 'Crack the lid open' }))
    expect(useStudioStore.getState().hasLid).toBe(false)
    expect(useToastStore.getState().message).toBe('Lid cracked open to vent moisture')
    expect(world.careIssues).not.toContainEqual(expect.objectContaining({ text: 'x' }))
  })

  it('tolerates care issues naming species that are no longer in the world', () => {
    withTelemetry({ careIssues: [{ level: 'warn', species: ['ghost'], text: 'Gone plant' }] })
    render(<RightTelemetry />)
    expect(screen.getAllByText('Gone plant').length).toBeGreaterThan(0)
  })

  it('eco stats copy', () => {
    withTelemetry({ condensation: 0.6, moldCount: 1, cleanupCrewCount: 0 })
    useStudioStore.setState({ waterSplit: 0.32, cycleProgress: 0.3 })
    const first = render(<RightTelemetry />)
    expect(screen.getByText('Heavy fog')).toBeInTheDocument()
    expect(screen.getByText('Cycling, day 7 of ~21 · NH₃ 3.5 · NO₂ 0.0 ppm')).toBeInTheDocument()
    expect(screen.getByTestId('cycle-bar')).toHaveStyle({ width: '30%' })
    expect(screen.getByText('1 patch')).toBeInTheDocument()
    expect(screen.getByText('None yet')).toBeInTheDocument()
    first.unmount()

    useStudioStore.setState({ cycleProgress: 1, pumpFlow: 'gentle' })
    const second = render(<RightTelemetry />)
    expect(screen.getByText('Cycled · ammonia 0 ppm · pump gentle')).toBeInTheDocument()
    second.unmount()

    useStudioStore.setState({ waterSplit: 0 })
    withTelemetry({ condensation: 0, moldCount: 0, cleanupCrewCount: 3 })
    render(<RightTelemetry />)
    expect(screen.getByText('No pool in this build')).toBeInTheDocument()
    expect(screen.queryByTestId('cycle-bar')).not.toBeInTheDocument()
    expect(screen.getByText('Clear')).toBeInTheDocument()
    expect(screen.getByText('None')).toBeInTheDocument()
    expect(screen.getByText('3 at work')).toBeInTheDocument()
  })

  it('glass copy covers light fog and fogged over', () => {
    withTelemetry({ condensation: 0.2 })
    const first = render(<RightTelemetry />)
    expect(screen.getByText('Light fog, clears on its own')).toBeInTheDocument()
    first.unmount()
    withTelemetry({ condensation: 0.9 })
    render(<RightTelemetry />)
    expect(screen.getByText('Fogged over by condensation')).toBeInTheDocument()
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
