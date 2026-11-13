import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { VesselGrid } from '@/components/catalog/VesselGrid'
import { CareToolbar } from '@/components/stage/CareToolbar'
import { ItemInspector } from '@/components/stage/ItemInspector'
import { LeftSidebar } from '@/components/layout/LeftSidebar'
import { DEFAULT_SUBSTRATES } from '@/data/substrates'
import { registerWorld, unregisterWorld } from '@/engine/engineBridge'
import { addItem } from '@/engine/items'
import { configureSpriteCache } from '@/engine/sprites/spriteCache'
import { createWorld, type EngineWorld } from '@/engine/world'
import { setSlider } from '../helpers/slider'
import { appStore } from '@/store/appStore'
import {
  createDefaultState,
  activePourMaterialAtom,
  activeToolAtom,
  cycleProgressAtom,
  patchStudioAtom,
  selectedIdAtom,
  studioStateAtom,
  type StudioState,
} from '@/store/studio'
import { toastAtom } from '@/store/toast'

const TERRAIN = { substrates: DEFAULT_SUBSTRATES, waterSplit: 0.32 }
let world: EngineWorld
const click = (el: HTMLElement) => act(() => void fireEvent.click(el))
const state = () => appStore.get(studioStateAtom)
const set = (partial: Partial<StudioState>) => act(() => appStore.set(patchStudioAtom, partial))
const toast = () => appStore.get(toastAtom).message

beforeEach(() => {
  vi.useFakeTimers()
  configureSpriteCache(
    () =>
      ({
        getContext: () => null,
        toDataURL: () => 'data:image/png;base64,AAAA',
      }) as unknown as HTMLCanvasElement,
  )
  appStore.set(patchStudioAtom, createDefaultState())
  appStore.set(toastAtom, { message: '', visible: false })
  world = createWorld()
  registerWorld(world)
})

afterEach(() => {
  unregisterWorld()
  configureSpriteCache()
  vi.useRealTimers()
})

describe('LeftSidebar panels', () => {
  it('switches panels with the tab bar', () => {
    render(<LeftSidebar />)
    expect(screen.getByText('Enclosure')).toBeInTheDocument()
    click(screen.getByRole('tab', { name: /Flora/ }))
    expect(screen.getByText('Plant as')).toBeInTheDocument()
    expect(screen.queryByText('Enclosure')).not.toBeInTheDocument()
    click(screen.getByRole('tab', { name: /Hardscape/ }))
    expect(screen.getByText(/Living Moss Wall Cliff/)).toBeInTheDocument()
    click(screen.getByRole('tab', { name: /Fauna/ }))
    expect(screen.getByText('Red Cherry Shrimp')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Cleanup crew/ })).toBeInTheDocument()
    expect(state().activeTab).toBe('fauna')
  })

  it('vessel grid click sets the vessel', () => {
    render(<LeftSidebar />)
    click(screen.getByRole('button', { name: /Apothecary Jar/ }))
    expect(state().vessel).toBe('apothecary')
  })

  it('hardware switches flip flags and aria-checked', () => {
    render(<LeftSidebar />)
    const lamp = screen.getByRole('switch', { name: /Grow lamp/ })
    const fogger = screen.getByRole('switch', { name: /Mist fogger/ })
    expect(lamp).toHaveAttribute('aria-checked', 'true')
    click(lamp)
    expect(state().hasGrowLamp).toBe(false)
    expect(lamp).toHaveAttribute('aria-checked', 'false')
    click(fogger)
    expect(state().hasFogger).toBe(false)
    click(screen.getByRole('checkbox', { name: /Lid sealed/ }))
    expect(state().hasLid).toBe(false)
  })

  it('hardware copy follows lamp, fogger and pump state', () => {
    render(<LeftSidebar />)
    expect(screen.getByRole('switch', { name: /Grow lamp/ })).toBeChecked()
    expect(screen.getByText('Lit until 20:00')).toBeInTheDocument()
    set({ lighting: 'night' })
    expect(screen.getByText('Resting tonight, back on at 05:30')).toBeInTheDocument()
    set({ autoLightSync: false })
    expect(screen.getByText('Resting for the night')).toBeInTheDocument()
    set({ hasGrowLamp: false })
    expect(screen.getByText('Switched off; plants get room light only')).toBeInTheDocument()
    expect(screen.getByText('Running, about +7% humidity')).toBeInTheDocument()
    click(screen.getByRole('switch', { name: /Mist fogger/ }))
    expect(state().hasFogger).toBe(false)
    expect(screen.getByText('Off; air relies on the pool')).toBeInTheDocument()
    const pump = screen.getByRole('radiogroup', { name: 'Waterfall pump' })
    expect(within(pump).getByRole('radio', { name: 'Gentle' })).toBeChecked()
    expect(screen.getByText('Gentle cascade into the pool')).toBeInTheDocument()
    click(within(pump).getByRole('radio', { name: 'Strong' }))
    expect(state().pumpFlow).toBe('strong')
    expect(screen.getByText('Strong flow; frogs and shrimp dislike it')).toBeInTheDocument()
    click(within(pump).getByRole('radio', { name: 'Off' }))
    expect(screen.getByText('Still water; it goes stale')).toBeInTheDocument()
    set({ waterSplit: 0 })
    expect(screen.getByText('No pool in this build')).toBeInTheDocument()
    expect(within(pump).getByRole('radio', { name: 'Gentle' })).toBeDisabled()
  })

  it('pool width slider creates a pool with the cycling toast', () => {
    set({ waterSplit: 0, cycleProgress: 1, substrates: { ...DEFAULT_SUBSTRATES, water: 10 } })
    render(<LeftSidebar />)
    setSlider(screen.getByRole('slider', { name: 'Pool width' }), 30)
    expect(state().waterSplit).toBeCloseTo(0.3, 5)
    expect(state().cycleProgress).toBe(0)
    expect(world.env.cycleProgress).toBe(0)
    expect(state().substrates.water).toBe(40)
    expect(toast()).toBe('New pool: it cycles for about 3 weeks before fish and shrimp are safe')
    act(() => appStore.set(cycleProgressAtom, 0.5))
    setSlider(screen.getByRole('slider', { name: 'Pool width' }), 45)
    expect(state().cycleProgress).toBe(0.5)
  })

  it('first water into an existing pool restarts the cycle; topping up does not', () => {
    set({ cycleProgress: 1, substrates: { ...DEFAULT_SUBSTRATES, water: 0 } })
    world.env.cycleProgress = 1
    render(<LeftSidebar />)
    setSlider(screen.getByRole('slider', { name: 'Pool water' }), 10)
    expect(state().substrates.water).toBe(10)
    expect(state().cycleProgress).toBe(0)
    expect(world.env.cycleProgress).toBe(0)
    act(() => appStore.set(cycleProgressAtom, 0.5))
    world.env.cycleProgress = 0.5
    setSlider(screen.getByRole('slider', { name: 'Pool water' }), 20)
    expect(state().cycleProgress).toBe(0.5)
    expect(world.env.cycleProgress).toBe(0.5)
  })

  it('hardware switches are named by their label and described by their status', () => {
    render(<LeftSidebar />)
    const lamp = screen.getByRole('switch', { name: 'Grow lamp' })
    expect(lamp).toHaveAccessibleDescription('Lit until 20:00')
    expect(screen.getByRole('switch', { name: 'Mist fogger' })).toHaveAccessibleDescription(
      'Running, about +7% humidity',
    )
    expect(screen.getByRole('group', { name: 'Enclosure hardware' })).toBeInTheDocument()
  })

  it('sliders list land layers top-down and show the split label', () => {
    render(<LeftSidebar />)
    expect(screen.getAllByRole('slider').map((el) => el.getAttribute('aria-label'))).toEqual([
      'Leaf litter',
      'Silica sand',
      'Tropical substrate',
      'Activated charcoal',
      'Drainage layer (LECA)',
      'Pool width',
      'Pool gravel',
      'Pool water',
    ])
    expect(screen.getByText('68% land / 32% water')).toBeInTheDocument()
    expect(screen.getByText('56 mm of land')).toBeInTheDocument()
    set({ waterSplit: 0 })
    expect(screen.getByText('All land')).toBeInTheDocument()
  })

  it('adding a species with a matching care issue shows its text as a toast', () => {
    set({ waterSplit: 0 })
    render(<LeftSidebar />)
    click(screen.getByRole('tab', { name: /Fauna/ }))
    click(screen.getByRole('button', { name: /Vampire Crab/ }))
    expect(toast()).toBe('Vampire crabs need a pool to molt and drink.')
  })

  it('recipe buttons toast the preset message', () => {
    render(<LeftSidebar />)
    click(screen.getByRole('button', { name: /^Arid/ }))
    expect(toast()).toBe('Arid: open top, sand, no fogger')
  })

  it('a recipe button sets substrates; Falls Lake also fills the world and toasts', () => {
    render(<LeftSidebar />)
    click(screen.getByRole('button', { name: /^Arid/ }))
    expect(state().substrates.sand).toBe(22)
    expect(state().substrates.water).toBe(0)
    expect(world.items).toHaveLength(0)
    click(screen.getByRole('button', { name: /Falls Lake/ }))
    expect(state().substrates.water).toBe(45)
    expect(world.items).toHaveLength(17)
    expect(toast()).toBe('Falls Lake: 30% pool, waterfall and moss wall')
  })

  it('Level terrain flattens the contour and clears grains', () => {
    world.terrainContour[3] = 4
    world.surfaceGrains = [{}]
    render(<LeftSidebar />)
    click(screen.getByRole('button', { name: 'Level terrain' }))
    expect(world.terrainContour.every((v) => v === 0)).toBe(true)
    expect(world.surfaceGrains).toHaveLength(0)
  })

  it('selects and deselects a pour container', () => {
    render(<LeftSidebar />)
    const jar = screen.getByRole('button', { name: /LECA Scoop Jar/ })
    click(jar)
    expect(state().activePourMaterial).toBe('pebbles')
    expect(state().activeTool).toBe('pour')
    expect(appStore.get(toastAtom).message).toBe(
      'Hold and drag inside the tank to scatter Drainage layer (LECA)',
    )
    click(jar)
    expect(state().activePourMaterial).toBeNull()
    expect(state().activeTool).toBe('select')
    click(screen.getByRole('button', { name: /Glass Water Pitcher/ }))
    expect(appStore.get(toastAtom).message).toBe('Hold and drag inside the tank to pour water')
  })

  it('a slider change writes mm and updates the total', () => {
    render(<LeftSidebar />)
    expect(screen.getByTestId('total-substrate-depth')).toHaveTextContent('56 mm')
    setSlider(screen.getByRole('slider', { name: 'Tropical substrate' }), 30)
    expect(state().substrates.soil).toBe(30)
    expect(screen.getByTestId('total-substrate-depth')).toHaveTextContent('52 mm')
    expect(screen.queryByLabelText('Siphon / Scoop Out')).not.toBeInTheDocument()
  })

  it('flora card click adds an item with the current planting stage and selects it', () => {
    render(<LeftSidebar />)
    click(screen.getByRole('tab', { name: /Flora/ }))
    click(screen.getByRole('button', { name: /Blue Peacock Fern/ }))
    expect(world.items).toHaveLength(1)
    expect(world.items[0].stage).toBe('mature')
    expect(appStore.get(selectedIdAtom)).toBe(world.items[0].uid)

    click(screen.getByRole('radio', { name: /Sprout/ }))
    expect(screen.getByRole('radio', { name: /Sprout/ })).toHaveAttribute('aria-checked', 'true')
    expect(state().plantingStage).toBe('sprout')
    // selected flora converts immediately
    expect(world.items[0].stage).toBe('sprout')
    click(screen.getByRole('button', { name: /Pink Earth Star/ }))
    expect(world.items).toHaveLength(2)
    expect(world.items[1].stage).toBe('sprout')
    expect(world.items[1].scale).toBeCloseTo(0.95 * 0.62)
  })

  it('hardscape and fauna cards add items', () => {
    render(<LeftSidebar />)
    click(screen.getByRole('tab', { name: /Hardscape/ }))
    click(screen.getByRole('button', { name: /Living Moss Wall Cliff/ }))
    click(screen.getByRole('tab', { name: /Fauna/ }))
    const cards = within(screen.getByTestId('catalog-fauna')).getAllByRole('button')
    click(cards[0])
    expect(world.items.map((i) => i.category)).toEqual(['hardscape', 'fauna'])
    expect(world.items[1].aiState).toBe('wandering')
  })
})

describe('CareToolbar', () => {
  it('marks the active tool with aria-pressed and switches tools', () => {
    render(<CareToolbar />)
    expect(screen.getByRole('button', { name: /Move \/ Mount/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    click(screen.getByRole('button', { name: /Mist Spray/ }))
    expect(state().activeTool).toBe('mist')
    expect(screen.getByRole('button', { name: /Mist Spray/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: /Move \/ Mount/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    for (const name of [/Prune/, /Bio-Feed/, /Scrub Mold/]) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument()
    }
  })

  it('shows the pour indicator only while pouring and clears it on click', () => {
    render(<CareToolbar />)
    expect(screen.queryByText(/Scattering|Pouring/)).not.toBeInTheDocument()
    act(() => {
      appStore.set(activePourMaterialAtom, 'leaflitter')
      appStore.set(activeToolAtom, 'pour')
    })
    const ind = screen.getByRole('button', { name: /Scattering: Leaf litter/ })
    click(ind)
    expect(state().activeTool).toBe('select')
    expect(state().activePourMaterial).toBeNull()
    act(() => {
      appStore.set(activePourMaterialAtom, 'water')
      appStore.set(activeToolAtom, 'pour')
    })
    expect(screen.getByRole('button', { name: /Pouring: Lake Water/ })).toBeInTheDocument()
    click(screen.getByRole('button', { name: /Prune/ }))
    expect(state().activePourMaterial).toBeNull()
  })
})

describe('ItemInspector', () => {
  it('is hidden without a selection', () => {
    render(<ItemInspector />)
    expect(screen.queryByTestId('insp-name')).not.toBeInTheDocument()
  })

  it('renders nothing (no throw) when an item is selected but no world is registered', () => {
    act(() => appStore.set(selectedIdAtom, 'ghost'))
    unregisterWorld()
    expect(() => render(<ItemInspector />)).not.toThrow()
    expect(screen.queryByTestId('insp-name')).not.toBeInTheDocument()
  })

  const select = () => {
    const it = addItem(world, 'peacock_fern', 'mature', { terrain: TERRAIN })!
    act(() => appStore.set(selectedIdAtom, it.uid))
    return it
  }

  it('shows name and stage, and scale up adds the prototype step', () => {
    const it = select()
    render(<ItemInspector />)
    expect(screen.getByTestId('insp-name')).toHaveTextContent('Blue Peacock Fern')
    expect(screen.getByTestId('insp-meta')).toHaveTextContent('Plant · mature · 98% health')
    click(screen.getByRole('button', { name: 'Larger' }))
    expect(it.scale).toBeCloseTo(1.15)
    click(screen.getByRole('button', { name: 'Smaller' }))
    expect(it.scale).toBeCloseTo(1.05)
    click(screen.getByRole('button', { name: 'Rotate Clockwise' }))
    expect(it.rotation).toBe(15)
    click(screen.getByRole('button', { name: 'Bring Forward' }))
    expect(it.zIndex).toBe(2)
  })

  it('grow re-reads the stage from the live world', () => {
    select()
    render(<ItemInspector />)
    click(screen.getByRole('button', { name: 'Advance Growth Stage' }))
    expect(screen.getByTestId('insp-meta')).toHaveTextContent('lush')
  })

  it('inspector meta copy names plant, animal habitat and hardscape', () => {
    const terrain = { substrates: state().substrates, waterSplit: state().waterSplit }
    const cases: [string, string][] = [
      ['peacock_fern', 'Plant · mature · 98% health'],
      ['cherry_shrimp', 'Animal · in the pool · wandering'],
      ['vampire_crab', 'Animal · pool and shore · wandering'],
      ['isopod', 'Animal · on land · wandering'],
      ['moss_wall_cliff', 'Hardscape'],
    ]
    for (const [id, meta] of cases) {
      const item = addItem(world, id, 'mature', { terrain })!
      act(() => appStore.set(selectedIdAtom, item.uid))
      const { unmount } = render(<ItemInspector />)
      expect(screen.getByTestId('insp-meta')).toHaveTextContent(meta)
      unmount()
    }
  })

  it('hides the grow button for non-flora', () => {
    const it = addItem(world, 'dragon_peak', 'mature', { terrain: TERRAIN })!
    act(() => appStore.set(selectedIdAtom, it.uid))
    render(<ItemInspector />)
    expect(screen.queryByRole('button', { name: 'Advance Growth Stage' })).not.toBeInTheDocument()
  })

  it('duplicate adds one item offset to the right and selects it', () => {
    const it = select()
    render(<ItemInspector />)
    click(screen.getByRole('button', { name: 'Duplicate Specimen' }))
    expect(world.items).toHaveLength(2)
    expect(world.items[1].x).toBeCloseTo(it.x + 0.05)
    expect(appStore.get(selectedIdAtom)).toBe(world.items[1].uid)
  })

  it('delete removes the item and clears the selection', () => {
    select()
    render(<ItemInspector />)
    click(screen.getByRole('button', { name: 'Remove Specimen' }))
    expect(world.items).toHaveLength(0)
    expect(appStore.get(selectedIdAtom)).toBeNull()
    expect(screen.queryByTestId('insp-name')).not.toBeInTheDocument()
  })
})

describe('vessel grid', () => {
  it('shows the nine vessels in picker order and selects a rectangular tank', () => {
    render(<VesselGrid />)
    const names = screen.getAllByRole('button').map((b) => b.textContent)
    expect(names[0]).toContain('Paludarium Tank')
    expect(names[1]).toContain('Front-Opening Vivarium')
    expect(names[3]).toContain('Long Riparium')
    expect(names).toHaveLength(9)
    click(screen.getByRole('button', { name: /Long Riparium/ }))
    expect(state().vessel).toBe('riparium_long')
  })
})
