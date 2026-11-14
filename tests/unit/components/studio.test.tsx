import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Toaster } from '@/components/ui/sonner'
import { RightTelemetry } from '@/components/layout/RightTelemetry'
import { TopNav } from '@/components/layout/TopNav'
import { LightingControls } from '@/components/nav/LightingControls'
import { GaugeBar } from '@/components/telemetry/GaugeBar'
import { TerrariumCanvas } from '@/components/stage/TerrariumCanvas'
import { computeVesselRect } from '@/engine/render/renderFrame'
import { DEFAULT_ROOM } from '@/engine/room'
import { registerWorld, unregisterWorld } from '@/engine/engineBridge'
import { createWorld, type EngineWorld } from '@/engine/world'
import { createLocalBackend } from '@/auth/backend'
import { MemoryStorage } from './auth/authHarness'
import type { PlacedItem } from '@/data/types'
import type { CareIssue } from '@/engine/care'
import { appStore } from '@/store/appStore'
import {
  autoLightSyncAtom,
  awayLogAtom,
  createDefaultState,
  dayCountAtom,
  hasLidAtom,
  patchStudioAtom,
  selectedIdAtom,
  studioStateAtom,
  substratesAtom,
  worldSnapshotAtom,
} from '@/store/studio'
import { awayIndexAtom, resetOverlayAtom } from '@/store/overlay'
import { showToast, toastAtom } from '@/store/toast'
import {
  createDefaultTelemetry,
  resetTelemetryAtom,
  telemetryAtom,
  type Telemetry,
} from '@/store/telemetry'
import { journalAtom, patchAccountAtom, resetAccountAtom } from '@/store/account'

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
  appStore.set(patchStudioAtom, createDefaultState())
  appStore.set(resetTelemetryAtom, createDefaultTelemetry())
  appStore.set(toastAtom, { message: '', visible: false })
  appStore.set(resetOverlayAtom)
  world = createWorld()
  registerWorld(world)
})

afterEach(() => {
  appStore.set(resetAccountAtom)
  unregisterWorld()
  vi.useRealTimers()
})

describe('TopNav speed controls', () => {
  it('updates timeSpeed/realTimeMode and the checked speed', async () => {
    render(<TopNav />)
    const u = user()
    const speed = (name: string | RegExp) => screen.getByRole('radio', { name })
    expect(speed(/real-time/i)).toHaveAttribute('aria-checked', 'true')
    await u.click(speed(/5×/))
    expect(appStore.get(studioStateAtom)).toMatchObject({ timeSpeed: 5, realTimeMode: false })
    expect(speed(/5×/)).toHaveAttribute('aria-checked', 'true')
    expect(speed(/real-time/i)).toHaveAttribute('aria-checked', 'false')
    await u.click(speed('Pause'))
    expect(appStore.get(studioStateAtom)).toMatchObject({ timeSpeed: 0, realTimeMode: false })
    expect(speed('Pause')).toHaveAttribute('aria-checked', 'true')
    await u.click(speed('Pause')) // pressing the active speed again keeps it selected
    expect(speed('Pause')).toHaveAttribute('aria-checked', 'true')
    await u.click(speed('1×'))
    expect(appStore.get(studioStateAtom)).toMatchObject({ timeSpeed: 1, realTimeMode: false })
    await u.click(speed(/real-time/i))
    expect(appStore.get(studioStateAtom)).toMatchObject({ timeSpeed: 1, realTimeMode: true })
  })

  it('shows the real date and Day N', () => {
    vi.setSystemTime(new Date(2026, 2, 9, 14, 5, 7))
    appStore.set(patchStudioAtom, { dayCount: 4 })
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
    expect(appStore.get(dayCountAtom)).toBe(2)
    expect(world.ecoTime).toBeCloseTo(1, 9)
    // The flat x1.06 bump is gone; size now follows plant vitality inside the ecology step.
    expect(world.items[0].scale).toBe(1)
    expect(appStore.get(toastAtom).message).toMatch(/^Day 2: plants grew/)
  })

  it('+1 day logs a day report and opens the away card', async () => {
    render(<TopNav />)
    await user().click(screen.getByRole('button', { name: '+1 day' }))
    expect(appStore.get(awayIndexAtom)).toBe(0)
    expect(appStore.get(awayLogAtom)[0]).toMatchObject({
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
    expect(appStore.get(toastAtom).message).toBe('Day 2: plants grew. The pool has cycled.')
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
    appStore.set(patchAccountAtom, { phase: 'signedout', activeId: 'g_a', backend })
    await user().click(plusDay)
    await act(async () => {})
    expect(appStore.get(dayCountAtom)).toBe(2)
    expect(addJournal).not.toHaveBeenCalled()

    // Signed in with an open terrarium: one automatic entry for the new day, no extra toast.
    appStore.set(patchAccountAtom, { phase: 'cloud', activeId: 'g_a', backend })
    await user().click(plusDay)
    await vi.waitFor(() => expect(appStore.get(journalAtom)).toHaveLength(1))
    const saved = await backend.listJournal('g_a')
    expect(saved).toHaveLength(1)
    expect(saved[0]).toMatchObject({ day: 3, auto: true })
    expect(saved[0].note).toMatch(/^(One day later: |A quiet stretch\.)/)
    expect(saved[0].key).toMatch(/^day:\d+:\d+$/)
    expect(saved[0].issues).toEqual(['The substrate is drying out and the moss looks pale.'])
    expect(appStore.get(toastAtom).message).toMatch(/^Day 3: plants grew/)

    // Signed in but no terrarium open yet: nothing either.
    appStore.set(patchAccountAtom, { activeId: null })
    await user().click(plusDay)
    await act(async () => {})
    expect(addJournal).toHaveBeenCalledTimes(1)
  })

  it('+Day refreshes the care report so the automatic entry records the new day', async () => {
    const backend = createLocalBackend('u_demo', new MemoryStorage())
    // The telemetry store still holds the previous day's flush.
    appStore.set(resetTelemetryAtom, {
      ...createDefaultTelemetry(),
      nutrients: 88,
      careIssues: [{ level: 'warn', text: 'Yesterday’s stale warning.' }],
    })
    world.env.nutrients = 50
    world.env.soilMoisture = 30
    // Five plants draw nutrients down by 0.4 each per tank day: 50 -> 48.
    world.items = Array.from({ length: 5 }, (_, i) => item(`f${i}`, 'flora'))
    // Inside the throttle window: a throttled push would skip the flush.
    world.lastTelemetryPush = performance.now()
    appStore.set(patchAccountAtom, { phase: 'cloud', activeId: 'g_a', backend })
    render(<TopNav />)
    await user().click(screen.getByRole('button', { name: '+1 day' }))
    await vi.waitFor(() => expect(appStore.get(journalAtom)).toHaveLength(1))
    const [saved] = await backend.listJournal('g_a')
    expect(saved.metrics.nutrients).toBe(48)
    expect(saved.issues).toEqual(['The substrate is drying out and the moss looks pale.'])
    expect(appStore.get(telemetryAtom).nutrients).toBeCloseTo(48, 6)
  })
})

describe('lighting', () => {
  it('Night sets lighting and turns Auto off; Auto turns it back on', async () => {
    render(<LightingControls />)
    const u = user()
    await u.click(screen.getByRole('radio', { name: 'Night' }))
    expect(appStore.get(studioStateAtom)).toMatchObject({ lighting: 'night', autoLightSync: false })
    await u.click(screen.getByRole('button', { name: 'Auto' }))
    expect(appStore.get(autoLightSyncAtom)).toBe(true)
  })

  it.each([
    ['dawn', 'Dawn · dew on the glass'],
    ['sunlight', 'Day · photosynthesis'],
    ['twilight', 'Dusk · lamp winding down'],
    ['night', 'Night · respiration'],
  ] as const)('cycle badge for %s', (lighting, text) => {
    appStore.set(patchStudioAtom, { lighting })
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
    world.mossTufts = [{ x: 0.4, r: 3, w: 1, seed: 1 }]
    world.breed = { springtails: 0.5 }
    render(<TopNav />)
    const u = user()
    // Radix opens the menu on pointerdown or Enter, not on a bare click event.
    act(
      () =>
        void fireEvent.keyDown(screen.getByRole('button', { name: 'More actions' }), {
          key: 'Enter',
        }),
    )
    await u.click(screen.getByRole('menuitem', { name: 'Clear all specimens' }))
    expect(world.items).toEqual([])
    expect(world.mossTufts).toEqual([])
    expect(world.breed).toEqual({})
    expect(appStore.get(worldSnapshotAtom)?.items).toEqual([])
    expect(appStore.get(toastAtom).message).toBe('Cleared all specimens')
  })

  it('Rebuild applies Falls Lake to the world and store', async () => {
    render(<TopNav />)
    const u = user()
    // Radix opens the menu on pointerdown or Enter, not on a bare click event.
    act(
      () =>
        void fireEvent.keyDown(screen.getByRole('button', { name: 'More actions' }), {
          key: 'Enter',
        }),
    )
    await u.click(screen.getByRole('menuitem', { name: 'Rebuild the Falls Lake paludarium' }))
    expect(world.items.length).toBeGreaterThan(5)
    const fauna = world.items.find((i) => i.category === 'fauna')
    expect(fauna).toMatchObject({ aiState: 'wandering', aiTimer: 120 })
    expect(world.items.find((i) => i.category === 'flora')).toMatchObject({
      stage: 'mature',
      growthProgress: 0.85,
      vitality: 98,
    })
    expect(appStore.get(substratesAtom).water).toBe(45)
    expect(appStore.get(worldSnapshotAtom)?.items.length).toBe(world.items.length)
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
  appStore.set(resetTelemetryAtom, { ...createDefaultTelemetry(), ...partial })

const warn = (text: string): CareIssue => ({ level: 'warn', text })

describe('RightTelemetry', () => {
  it('renders water and air gauges from the room model', () => {
    appStore.set(patchStudioAtom, { room: { ...DEFAULT_ROOM, water: 'tap' } })
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
    appStore.set(patchStudioAtom, { room: { ...DEFAULT_ROOM, air: 'traffic', purifier: true } })
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
    appStore.set(patchStudioAtom, {
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
    appStore.set(patchStudioAtom, {
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
    appStore.set(patchStudioAtom, { lighting: 'night' })
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
    expect(appStore.get(hasLidAtom)).toBe(false)
    expect(appStore.get(toastAtom).message).toBe('Lid cracked open to vent moisture')
    expect(world.careIssues).not.toContainEqual(expect.objectContaining({ text: 'x' }))
  })

  it('tolerates care issues naming species that are no longer in the world', () => {
    withTelemetry({ careIssues: [{ level: 'warn', species: ['ghost'], text: 'Gone plant' }] })
    render(<RightTelemetry />)
    expect(screen.getAllByText('Gone plant').length).toBeGreaterThan(0)
  })

  it('eco stats copy', () => {
    withTelemetry({ condensation: 0.6, moldCount: 1, cleanupCrewCount: 0 })
    appStore.set(patchStudioAtom, { waterSplit: 0.32, cycleProgress: 0.3 })
    const first = render(<RightTelemetry />)
    expect(screen.getByText('Heavy fog')).toBeInTheDocument()
    expect(screen.getByText('Cycling, day 7 of ~21 · NH₃ 3.5 · NO₂ 0.0 ppm')).toBeInTheDocument()
    expect(screen.getByTestId('cycle-bar')).toHaveStyle({ width: '30%' })
    expect(screen.getByText('1 patch')).toBeInTheDocument()
    expect(screen.getByText('None yet')).toBeInTheDocument()
    first.unmount()

    appStore.set(patchStudioAtom, { cycleProgress: 1, pumpFlow: 'gentle' })
    const second = render(<RightTelemetry />)
    expect(screen.getByText('Cycled · ammonia 0 ppm · pump gentle')).toBeInTheDocument()
    second.unmount()

    appStore.set(patchStudioAtom, { waterSplit: 0 })
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
  it('shows the message in the shadcn Toaster and tracks visibility in the atom', () => {
    render(<Toaster />)
    act(() => {
      showToast('Hello')
      vi.advanceTimersByTime(0) // sonner delivers on a timer
    })
    expect(screen.getByText('Hello')).toBeInTheDocument()
    expect(appStore.get(toastAtom)).toEqual({ message: 'Hello', visible: true })
    act(() => {
      vi.advanceTimersByTime(2201)
    })
    expect(appStore.get(toastAtom).visible).toBe(false)
  })
})

describe('TerrariumCanvas gestures', () => {
  const W = 1000
  const H = 800

  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      right: W,
      bottom: H,
      width: W,
      height: H,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect)
    world.view.size = { w: W, h: H }
    world.view.framedOnce = true
  })

  afterEach(() => vi.restoreAllMocks())

  const canvas = () => screen.getByRole('application', { name: 'Terrarium canvas' })

  it('a press on empty space at 200 % pans instead of only clearing the selection', () => {
    world.view.cam = { z: 2, u: 0.5, v: 0.5 }
    world.view.camT = { z: 2, u: 0.5, v: 0.5 }
    appStore.set(selectedIdAtom, 'someone')
    render(<TerrariumCanvas />)

    act(() => void fireEvent.pointerDown(canvas(), { pointerId: 1, clientX: 300, clientY: 300 }))
    expect(appStore.get(selectedIdAtom)).toBeNull()
    expect(canvas().dataset.cursor).toBe('grabbing')
    expect(world.view.gesture).toBe(true)

    act(() => void fireEvent.pointerMove(window, { pointerId: 1, clientX: 400, clientY: 340 }))
    expect(world.view.camT.u).toBeCloseTo(0.5 - 100 / 2 / W)
    expect(world.view.camT.v).toBeCloseTo(0.5 - 40 / 2 / H)
    expect(world.view.cam).toEqual(world.view.camT)

    act(() => void fireEvent.pointerUp(window, { pointerId: 1, clientX: 400, clientY: 340 }))
    expect(world.view.gesture).toBe(false)
    expect(canvas().dataset.cursor).toBe('grab')
    // Released: further moves leave the camera alone.
    act(() => void fireEvent.pointerMove(window, { pointerId: 1, clientX: 600, clientY: 600 }))
    expect(world.view.camT.u).toBeCloseTo(0.45)
  })

  it('a second pointer ends the drag and starts a pinch', () => {
    const fern: PlacedItem = {
      ...item('f1', 'flora'),
      id: 'peacock_fern',
      x: 0.5,
      y: 0.6,
      stage: 'lush',
    }
    world.items = [fern]
    const R = computeVesselRect(W, H)
    const sx = R.x + 0.5 * R.w
    const sy = R.y + 0.6 * R.h
    render(<TerrariumCanvas />)

    act(() => void fireEvent.pointerDown(canvas(), { pointerId: 1, clientX: sx, clientY: sy }))
    expect(world.draggingId).toBe('f1')

    act(
      () => void fireEvent.pointerDown(canvas(), { pointerId: 2, clientX: sx + 100, clientY: sy }),
    )
    expect(world.draggingId).toBeNull()
    expect(world.isMisting).toBe(false)
    expect(world.isPouring).toBe(false)
    expect(world.view.gesture).toBe(true)

    // Spreading the fingers to twice the distance doubles the zoom; the plant stays put.
    act(() => void fireEvent.pointerMove(window, { pointerId: 2, clientX: sx + 200, clientY: sy }))
    expect(world.view.cam.z).toBeCloseTo(2)
    expect(fern.x).toBe(0.5)
    expect(fern.y).toBe(0.6)

    // Lifting one finger: no pan, no drag, no selection change from the finger left down.
    act(() => void fireEvent.pointerUp(window, { pointerId: 2, clientX: sx + 200, clientY: sy }))
    expect(world.view.gesture).toBe(false)
    const cam = { ...world.view.camT }
    act(
      () =>
        void fireEvent.pointerMove(window, { pointerId: 1, clientX: sx - 80, clientY: sy + 40 }),
    )
    expect(world.view.camT).toEqual(cam)
    expect(world.draggingId).toBeNull()
    expect(fern.x).toBe(0.5)
  })
})
