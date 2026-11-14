import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AwayCard } from '@/components/stage/AwayCard'
import { UtilityActions } from '@/components/nav/UtilityActions'
import { registerWorld, unregisterWorld } from '@/engine/engineBridge'
import type { AwayReport } from '@/engine/simulation/report'
import { createWorld } from '@/engine/world'
import { appStore } from '@/store/appStore'
import {
  awayLogAtom,
  catchupEnabledAtom,
  createDefaultState,
  patchStudioAtom,
  studioStateAtom,
} from '@/store/studio'
import { awayIndexAtom, resetOverlayAtom } from '@/store/overlay'
import { toastAtom } from '@/store/toast'
import { perfHudAtom, smoothDrawingAtom } from '@/store/view'
import { account, patchAccountAtom, resetAccountAtom } from '@/store/account'

const click = (el: HTMLElement) => act(() => void fireEvent.click(el))
/** Radix opens its menu on pointerdown or Enter, not on click. */
const openTrigger = () =>
  act(
    () =>
      void fireEvent.keyDown(screen.getByRole('button', { name: 'More actions' }), {
        key: 'Enter',
      }),
  )

const openMenu = () => {
  render(
    <>
      <UtilityActions />
      <AwayCard />
    </>,
  )
  openTrigger()
}

const logged = (): AwayReport => ({
  from: 1,
  to: 2,
  hours: 5,
  tankHours: 5,
  capped: false,
  mode: 'away',
  reason: 'return',
  items: [],
  more: 0,
  rest: [],
  hints: [],
})

beforeEach(() => {
  appStore.set(patchStudioAtom, createDefaultState())
  appStore.set(resetOverlayAtom)
  appStore.set(toastAtom, { message: '', visible: false })
  registerWorld(createWorld())
})

afterEach(() => {
  unregisterWorld()
  appStore.set(resetAccountAtom)
  vi.restoreAllMocks()
})

describe('MoreMenu time away', () => {
  it('renders the group, summary item, gap buttons and switch', () => {
    openMenu()
    expect(screen.getByText('Time away')).toBeTruthy()
    expect(screen.getByRole('menuitem', { name: 'Show the last summary' })).toBeTruthy()
    expect(screen.getByText('Preview a gap')).toBeTruthy()
    expect(screen.getByRole('group', { name: 'Time away' })).toBeTruthy()
    expect(screen.getByRole('group', { name: 'Preview a gap' })).toBeTruthy()
    for (const l of ['8 h', '1 day', '3 days', '1 week'])
      expect(screen.getByRole('menuitem', { name: `Preview a gap of ${l}` }).textContent).toBe(l)
    expect(
      screen
        .getByRole('menuitemcheckbox', { name: "Grow while I'm away" })
        .getAttribute('aria-checked'),
    ).toBe('true')
  })

  it('toasts when no time away is recorded, otherwise opens the last summary', () => {
    openMenu()
    click(screen.getByRole('menuitem', { name: 'Show the last summary' }))
    expect(appStore.get(toastAtom).message).toBe(
      'No time away recorded yet. Come back later, or preview a gap below.',
    )
    expect(appStore.get(awayIndexAtom)).toBeNull()

    appStore.set(patchStudioAtom, { awayLog: [logged()] })
    openTrigger()
    click(screen.getByRole('menuitem', { name: 'Show the last summary' }))
    expect(appStore.get(awayIndexAtom)).toBe(0)
  })

  it('1 day previews a 24 h gap and opens its card', () => {
    openMenu()
    click(screen.getByRole('menuitem', { name: 'Preview a gap of 1 day' }))
    const s = appStore.get(studioStateAtom)
    expect(s.awayLog[0]).toMatchObject({ mode: 'preview', hours: 24 })
    expect(appStore.get(awayIndexAtom)).toBe(0)
    expect(screen.queryByRole('menu')).toBeNull()
    expect(document.querySelector('#away-card')?.textContent).toContain('Preview · 24 h later')
  })

  it('the switch toggles catchupEnabled and toasts both strings', () => {
    openMenu()
    const sw = () => screen.getByRole('menuitemcheckbox', { name: "Grow while I'm away" })
    click(sw())
    expect(appStore.get(catchupEnabledAtom)).toBe(false)
    expect(appStore.get(toastAtom).message).toBe(
      'Growing while away is off. The tank waits for you.',
    )
    expect(sw().getAttribute('aria-checked')).toBe('false')
    click(sw())
    expect(appStore.get(catchupEnabledAtom)).toBe(true)
    expect(appStore.get(toastAtom).message).toBe('The tank will keep growing while you are away')
  })

  it('Drawing group toggles Smooth drawing and Show frame rate and keeps the menu open', () => {
    appStore.set(smoothDrawingAtom, true)
    appStore.set(perfHudAtom, false)
    openMenu()
    expect(screen.getByRole('group', { name: 'Drawing' })).toBeTruthy()
    // The group sits above Time away.
    const labels = screen.getAllByText(/^(Drawing|Time away)$/).map((e) => e.textContent)
    expect(labels).toEqual(['Drawing', 'Time away'])

    const smooth = () => screen.getByRole('menuitemcheckbox', { name: 'Smooth drawing' })
    expect(smooth().getAttribute('aria-checked')).toBe('true')
    click(smooth())
    expect(appStore.get(smoothDrawingAtom)).toBe(false)
    expect(appStore.get(toastAtom).message).toBe('Smooth drawing off: full detail every frame')
    expect(screen.queryByRole('menu')).toBeTruthy()
    expect(smooth().getAttribute('aria-checked')).toBe('false')
    click(smooth())
    expect(appStore.get(smoothDrawingAtom)).toBe(true)
    expect(appStore.get(toastAtom).message).toBe('Smooth drawing on')

    const hud = () => screen.getByRole('menuitemcheckbox', { name: 'Show frame rate' })
    expect(hud().getAttribute('aria-checked')).toBe('false')
    click(hud())
    expect(appStore.get(perfHudAtom)).toBe(true)
    expect(screen.queryByRole('menu')).toBeTruthy()
    expect(hud().getAttribute('aria-checked')).toBe('true')
    click(hud())
    expect(appStore.get(perfHudAtom)).toBe(false)
  })

  it('a preview adds no journal entry', async () => {
    const add = vi.spyOn(account, 'addJournalEntry').mockResolvedValue(true)
    appStore.set(patchAccountAtom, { phase: 'cloud', activeId: 'g_a' })
    openMenu()
    click(screen.getByRole('menuitem', { name: 'Preview a gap of 8 h' }))
    await act(async () => {})
    expect(appStore.get(awayLogAtom)).toHaveLength(1)
    expect(add).not.toHaveBeenCalled()
  })
})
