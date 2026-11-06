import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CareToolbar } from '@/components/stage/CareToolbar'
import { ItemInspector } from '@/components/stage/ItemInspector'
import { LeftSidebar } from '@/components/layout/LeftSidebar'
import { registerWorld, unregisterWorld } from '@/engine/engineBridge'
import { addItem } from '@/engine/items'
import { configureSpriteCache } from '@/engine/sprites/spriteCache'
import { createWorld, type EngineWorld } from '@/engine/world'
import { useToastStore } from '@/store/toastStore'
import { createDefaultState, useStudioStore } from '@/store/useStudioStore'

let world: EngineWorld
const click = (el: HTMLElement) => act(() => void fireEvent.click(el))
const state = () => useStudioStore.getState()

beforeEach(() => {
  vi.useFakeTimers()
  configureSpriteCache(
    () =>
      ({
        getContext: () => null,
        toDataURL: () => 'data:image/png;base64,AAAA',
      }) as unknown as HTMLCanvasElement,
  )
  useStudioStore.setState(createDefaultState())
  useToastStore.setState({ message: '', visible: false })
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
    expect(screen.getByText('1. Glass Enclosure')).toBeInTheDocument()
    click(screen.getByRole('tab', { name: /Flora/ }))
    expect(screen.getByText('Planting Stage:')).toBeInTheDocument()
    expect(screen.queryByText('1. Glass Enclosure')).not.toBeInTheDocument()
    click(screen.getByRole('tab', { name: /Hardscape/ }))
    expect(screen.getByText(/Living Moss Wall Cliff/)).toBeInTheDocument()
    click(screen.getByRole('tab', { name: /Fauna/ }))
    expect(screen.getByText(/Cherry|Shrimp/i)).toBeInTheDocument()
    expect(state().activeTab).toBe('fauna')
  })

  it('vessel grid click sets the vessel', () => {
    render(<LeftSidebar />)
    click(screen.getByRole('button', { name: /Apothecary Jar/ }))
    expect(state().vessel).toBe('apothecary')
  })

  it('hardware toggles flip flags and aria-pressed', () => {
    render(<LeftSidebar />)
    const lamp = screen.getByRole('button', { name: /Halo LED Lamp/ })
    const fogger = screen.getByRole('button', { name: /Mist Fogger/ })
    expect(lamp).toHaveAttribute('aria-pressed', 'true')
    click(lamp)
    expect(state().hasGrowLamp).toBe(false)
    expect(lamp).toHaveAttribute('aria-pressed', 'false')
    click(fogger)
    expect(state().hasFogger).toBe(false)
    click(screen.getByRole('checkbox', { name: /Cork Lid Sealed/ }))
    expect(state().hasLid).toBe(false)
  })

  it('a recipe button sets substrates; Falls Lake also fills the world and toasts', () => {
    render(<LeftSidebar />)
    click(screen.getByRole('button', { name: /Arid Sand/ }))
    expect(state().substrates.sand).toBe(28)
    expect(state().substrates.water).toBe(0)
    expect(world.items).toHaveLength(0)
    click(screen.getByRole('button', { name: /Falls Lake/ }))
    expect(state().substrates.water).toBe(26)
    expect(world.items).toHaveLength(15)
    expect(useToastStore.getState().message).toBe('🌊 Semi-Aquatic Waterfall & Lake crafted!')
  })

  it('Level Terrain flattens the contour and clears grains', () => {
    world.terrainContour[3] = 4
    world.surfaceGrains = [{}]
    render(<LeftSidebar />)
    click(screen.getByRole('button', { name: 'Level Terrain' }))
    expect(world.terrainContour.every((v) => v === 0)).toBe(true)
    expect(world.surfaceGrains).toHaveLength(0)
  })

  it('selects and deselects a pour container', () => {
    render(<LeftSidebar />)
    const jar = screen.getByRole('button', { name: /Pebble Scoop Jar/ })
    click(jar)
    expect(state().activePourMaterial).toBe('pebbles')
    expect(state().activeTool).toBe('pour')
    expect(useToastStore.getState().message).toBe(
      '🫙 Hold & drag inside the jar to scatter Drainage Pebbles!',
    )
    click(jar)
    expect(state().activePourMaterial).toBeNull()
    expect(state().activeTool).toBe('select')
    click(screen.getByRole('button', { name: /Glass Water Pitcher/ }))
    expect(useToastStore.getState().message).toBe(
      '🫗 Hold & drag inside the jar to pour a Semi-Aquatic Lake!',
    )
  })

  it('a slider change writes mm and updates the total', () => {
    render(<LeftSidebar />)
    expect(screen.getByTestId('total-substrate-depth')).toHaveTextContent('64 mm')
    fireEvent.change(screen.getByLabelText('Rainforest Soil'), { target: { value: '30' } })
    expect(state().substrates.soil).toBe(30)
    expect(screen.getByTestId('total-substrate-depth')).toHaveTextContent('78 mm')
    expect(screen.queryByLabelText('Siphon / Scoop Out')).not.toBeInTheDocument()
  })

  it('flora card click adds an item with the current planting stage and selects it', () => {
    render(<LeftSidebar />)
    click(screen.getByRole('tab', { name: /Flora/ }))
    click(screen.getByRole('button', { name: /Blue Peacock Fern/ }))
    expect(world.items).toHaveLength(1)
    expect(world.items[0].stage).toBe('mature')
    expect(state().selectedId).toBe(world.items[0].uid)

    click(screen.getByRole('button', { name: /Sprout/ }))
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
      state().setActivePourMaterial('moss')
      state().setActiveTool('pour')
    })
    const ind = screen.getByRole('button', { name: /Scattering: Sphagnum Moss/ })
    click(ind)
    expect(state().activeTool).toBe('select')
    expect(state().activePourMaterial).toBeNull()
    act(() => {
      state().setActivePourMaterial('water')
      state().setActiveTool('pour')
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
    act(() => state().selectItem('ghost'))
    unregisterWorld()
    expect(() => render(<ItemInspector />)).not.toThrow()
    expect(screen.queryByTestId('insp-name')).not.toBeInTheDocument()
  })

  const select = () => {
    const it = addItem(world, 'peacock_fern', 'mature')!
    act(() => state().selectItem(it.uid))
    return it
  }

  it('shows name and stage, and scale up adds the prototype step', () => {
    const it = select()
    render(<ItemInspector />)
    expect(screen.getByTestId('insp-name')).toHaveTextContent('Blue Peacock Fern')
    expect(screen.getByTestId('insp-meta')).toHaveTextContent('FLORA · MATURE · 98% HEALTH')
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
    expect(screen.getByTestId('insp-meta')).toHaveTextContent('LUSH')
  })

  it('hides the grow button for non-flora', () => {
    const it = addItem(world, 'dragon_peak', 'mature')!
    act(() => state().selectItem(it.uid))
    render(<ItemInspector />)
    expect(screen.queryByRole('button', { name: 'Advance Growth Stage' })).not.toBeInTheDocument()
  })

  it('duplicate adds one item offset to the right and selects it', () => {
    const it = select()
    render(<ItemInspector />)
    click(screen.getByRole('button', { name: 'Duplicate Specimen' }))
    expect(world.items).toHaveLength(2)
    expect(world.items[1].x).toBeCloseTo(it.x + 0.05)
    expect(state().selectedId).toBe(world.items[1].uid)
  })

  it('delete removes the item and clears the selection', () => {
    select()
    render(<ItemInspector />)
    click(screen.getByRole('button', { name: 'Remove Specimen' }))
    expect(world.items).toHaveLength(0)
    expect(state().selectedId).toBeNull()
    expect(screen.queryByTestId('insp-name')).not.toBeInTheDocument()
  })
})
