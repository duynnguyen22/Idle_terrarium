import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { StudioLayout } from '@/components/layout/StudioLayout'
import { UtilityActions } from '@/components/nav/UtilityActions'
import { WELCOME_KEY, panelOpenAtom, patchAccountAtom, resetAccountAtom } from '@/services/account'
import { appStore } from '@/store/appStore'
import { layoutModeAtom, sheetLevelAtom } from '@/store/layout'
import { resetOverlayAtom } from '@/store/overlay'
import {
  audioEnabledAtom,
  createDefaultState,
  patchStudioAtom,
  relaxModeAtom,
  timeSpeedAtom,
} from '@/store/studio'

// Never build an AudioContext in jsdom: the gesture start only flips the flag.
vi.mock('@/services/audio', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/services/audio')>()
  const { appStore: store } = await import('@/store/appStore')
  const { audioEnabledAtom: enabled } = await import('@/store/studio')
  return {
    ...real,
    startAudioFromGesture: vi.fn(() => store.set(enabled, true)),
    stopAudio: vi.fn(() => store.set(enabled, false)),
  }
})

const PHONE = '(max-width: 640px)'
const LAND = '(max-height: 480px) and (orientation: landscape) and (max-width: 960px)'

function stubMedia(mode: 'phone' | 'land' | 'desktop') {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: (mode !== 'desktop' && query === PHONE) || (mode === 'land' && query === LAND),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}

const click = (el: HTMLElement) => act(() => void fireEvent.click(el))
/** Radix opens its menu on pointerdown or Enter, not on click. */
const openMenu = () =>
  act(
    () =>
      void fireEvent.keyDown(screen.getByRole('button', { name: 'More actions' }), {
        key: 'Enter',
      }),
  )
const menu = () => within(screen.getByRole('menu'))

beforeEach(() => {
  appStore.set(patchStudioAtom, createDefaultState())
  appStore.set(resetAccountAtom)
  localStorage.setItem(WELCOME_KEY, '1')
  stubMedia('phone')
})

afterEach(() => {
  appStore.set(resetOverlayAtom)
  appStore.set(relaxModeAtom, false)
  appStore.set(layoutModeAtom, 'desktop')
  appStore.set(sheetLevelAtom, 'half')
  appStore.set(resetAccountAtom)
  vi.unstubAllGlobals()
})

describe('phone top bar and More menu', () => {
  it('phone top bar keeps only the clock and More', () => {
    render(<StudioLayout>{null}</StudioLayout>)
    const bar = within(document.getElementById('top-nav') as HTMLElement)
    for (const name of ['Relax', 'Growth', 'Snapshot', '+1 day', 'Toggle catalog panel'])
      expect(bar.queryByRole('button', { name })).toBeNull()
    expect(bar.getByRole('button', { name: 'More actions' })).toBeTruthy()
    expect(bar.getByText('Botanica')).toBeTruthy()
  })

  it('menu Time row reflects and sets the speed', () => {
    render(<StudioLayout>{null}</StudioLayout>)
    openMenu()
    expect(menu().getByText('Time')).toBeTruthy()
    click(menu().getByRole('menuitemradio', { name: '5×' }))
    expect(appStore.get(timeSpeedAtom)).toBe(5)
    expect(menu().getByRole('menuitemradio', { name: '5×' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect(menu().getByRole('menuitemradio', { name: 'Pause' })).toHaveAttribute(
      'aria-checked',
      'false',
    )
  })

  it('Ambient sound row shows Off then On', () => {
    appStore.set(audioEnabledAtom, false)
    render(<StudioLayout>{null}</StudioLayout>)
    openMenu()
    const row = menu().getByRole('menuitem', { name: /Ambient sound/ })
    expect(row.querySelector('small')).toHaveTextContent('Off')
    click(row)
    expect(appStore.get(audioEnabledAtom)).toBe(true)
    // The menu stays open so the new state shows in place.
    expect(
      menu()
        .getByRole('menuitem', { name: /Ambient sound/ })
        .querySelector('small'),
    ).toHaveTextContent('On')
  })

  it('signed-out account row opens the account panel', () => {
    appStore.set(patchAccountAtom, { phase: 'signedout' })
    render(<StudioLayout>{null}</StudioLayout>)
    openMenu()
    click(menu().getByRole('menuitem', { name: 'Sign in to save your work' }))
    expect(appStore.get(panelOpenAtom)).toBe(true)
  })

  it('landscape renders no header and a More tab in the rail', () => {
    stubMedia('land')
    render(<StudioLayout>{null}</StudioLayout>)
    expect(document.getElementById('top-nav')).toBeNull()
    const rail = within(screen.getByRole('navigation', { name: 'Sections' }))
    expect(rail.getByRole('button', { name: 'More' })).toBeTruthy()
  })

  it('desktop menu has no phone rows', () => {
    stubMedia('desktop')
    render(<UtilityActions />)
    openMenu()
    expect(menu().queryByText('Skip ahead one tank day')).toBeNull()
  })

  it('closing Build returns focus to the Build tab', () => {
    render(<StudioLayout>{null}</StudioLayout>)
    const build = () =>
      within(screen.getByRole('navigation', { name: 'Sections' })).getByRole('button', {
        name: 'Build',
      })
    expect(build()).toHaveAttribute('aria-controls', 'left-sidebar')
    click(build())
    expect(build()).toHaveAttribute('aria-expanded', 'true')
    act(() => void fireEvent.keyDown(window, { key: 'Escape' }))
    expect(build()).toHaveAttribute('aria-expanded', 'false')
    expect(document.activeElement).toBe(build())
  })
})
