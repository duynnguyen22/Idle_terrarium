import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CatalogGrid } from '@/components/catalog/CatalogGrid'
import { LampColorControl } from '@/components/catalog/LampColorControl'
import { StudioLayout } from '@/components/layout/StudioLayout'
import { enterRelax } from '@/components/nav/studioActions'
import { registerWorld, unregisterWorld } from '@/engine/engineBridge'
import { configureSpriteCache } from '@/engine/sprites/spriteCache'
import { createWorld } from '@/engine/world'
import { WELCOME_KEY } from '@/services/account'
import { appStore } from '@/store/appStore'
import { layoutModeAtom, openSheetAtom, sheetLevelAtom } from '@/store/layout'
import { awayIndexAtom, drawerAtom, resetOverlayAtom } from '@/store/overlay'
import { createDefaultState, patchStudioAtom, relaxModeAtom, selectedIdAtom } from '@/store/studio'

// Relax starts the ambient audio; keep the real module but stub the gesture start.
vi.mock('@/services/audio', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/audio')>()),
  startAudioFromGesture: vi.fn(),
}))

const PHONE = '(max-width: 640px)'

function stubMedia(phone: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: phone && query === PHONE,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}

const click = (el: HTMLElement) => act(() => void fireEvent.click(el))
const nav = () => screen.queryByRole('navigation', { name: 'Sections' })
const tab = (name: string) => within(nav() as HTMLElement).getByRole('button', { name })
const left = () => document.getElementById('left-sidebar')
const right = () => document.getElementById('right-sidebar')

beforeEach(() => {
  appStore.set(patchStudioAtom, createDefaultState())
  localStorage.setItem(WELCOME_KEY, '1')
  stubMedia(true)
})

afterEach(() => {
  appStore.set(resetOverlayAtom)
  appStore.set(relaxModeAtom, false)
  appStore.set(layoutModeAtom, 'desktop')
  appStore.set(sheetLevelAtom, 'half')
  vi.unstubAllGlobals()
})

describe('phone tab bar', () => {
  it('renders no tab bar on desktop', () => {
    stubMedia(false)
    render(<StudioLayout>{null}</StudioLayout>)
    expect(nav()).toBeNull()
  })

  it('Build opens the left sidebar as a sheet and a second press closes it', () => {
    render(<StudioLayout>{null}</StudioLayout>)
    expect(tab('Build')).toHaveAttribute('aria-pressed', 'false')
    click(tab('Build'))
    expect(tab('Build')).toHaveAttribute('aria-pressed', 'true')
    expect(left()).toHaveAttribute('data-drawer-open', 'true')
    click(tab('Build'))
    expect(tab('Build')).toHaveAttribute('aria-pressed', 'false')
    expect(left()).toHaveAttribute('data-drawer-open', 'false')
  })

  it('Health replaces Build', () => {
    render(<StudioLayout>{null}</StudioLayout>)
    click(tab('Build'))
    click(tab('Health'))
    expect(tab('Build')).toHaveAttribute('aria-pressed', 'false')
    expect(tab('Health')).toHaveAttribute('aria-pressed', 'true')
    expect(left()).toHaveAttribute('data-drawer-open', 'false')
    expect(right()).toHaveAttribute('data-drawer-open', 'true')
  })

  it('Growth opens the growth board and closes the away card', () => {
    appStore.set(awayIndexAtom, 0)
    render(<StudioLayout>{null}</StudioLayout>)
    click(tab('Growth'))
    expect(tab('Growth')).toHaveAttribute('aria-pressed', 'true')
    expect(document.getElementById('growth-board')).toBeInTheDocument()
    expect(appStore.get(awayIndexAtom)).toBeNull()
  })

  it('Escape closes the sheet but keeps the selection', () => {
    appStore.set(selectedIdAtom, 'some-item')
    render(<StudioLayout>{null}</StudioLayout>)
    click(tab('Build'))
    act(() => void fireEvent.keyDown(document.body, { key: 'Escape' }))
    expect(left()).toHaveAttribute('data-drawer-open', 'false')
    expect(tab('Build')).toHaveAttribute('aria-pressed', 'false')
    expect(appStore.get(selectedIdAtom)).toBe('some-item')
  })

  it('Relax closes the sheet and hides the tab bar', () => {
    render(<StudioLayout>{null}</StudioLayout>)
    click(tab('Build'))
    click(tab('Relax'))
    expect(appStore.get(relaxModeAtom)).toBe(true)
    expect(appStore.get(drawerAtom)).toBeNull()
    expect(nav()).toBeNull()
  })

  it('entering relax drops the stage bottom margin', () => {
    render(<StudioLayout>{null}</StudioLayout>)
    const stage = document.getElementById('canvas-stage') as HTMLElement
    const margin = 'mb-[calc(58px+env(safe-area-inset-bottom)+var(--stage-pad))]'
    expect(stage).toHaveClass(margin)
    act(() => enterRelax())
    expect(stage).not.toHaveClass(margin)
  })

  it('writes the sheet height to #studio-root', () => {
    vi.stubGlobal('innerHeight', 800)
    render(<StudioLayout>{null}</StudioLayout>)
    click(tab('Build'))
    const root = document.getElementById('studio-root') as HTMLElement
    expect(root.style.getPropertyValue('--sheet-h')).toBe('432px')
  })
})

describe('phone touch sizes', () => {
  it('gives the lamp colour buttons a 36 px height on a phone only', () => {
    const { unmount } = render(<LampColorControl />)
    const white = () => screen.getByRole('radio', { name: /White/ })
    expect(white()).toHaveClass('h-[26px]')
    expect(white()).not.toHaveClass('h-9')
    unmount()
    appStore.set(layoutModeAtom, 'phone')
    render(<LampColorControl />)
    expect(white()).toHaveClass('h-9')
    expect(white()).not.toHaveClass('h-[26px]')
  })
})

describe('catalog peek', () => {
  beforeEach(() => {
    configureSpriteCache(
      () =>
        ({
          getContext: () => null,
          toDataURL: () => 'data:image/png;base64,AAAA',
        }) as unknown as HTMLCanvasElement,
    )
    registerWorld(createWorld())
  })

  afterEach(() => {
    unregisterWorld()
    configureSpriteCache()
  })

  it('placing a catalog card drops the Build sheet to peek', () => {
    appStore.set(layoutModeAtom, 'phone')
    appStore.set(openSheetAtom, 'build')
    render(<CatalogGrid category="flora" />)
    const first = within(screen.getByTestId('catalog-flora')).getAllByRole('button')[0]
    click(first as HTMLElement)
    expect(appStore.get(sheetLevelAtom)).toBe('peek')
  })
})
