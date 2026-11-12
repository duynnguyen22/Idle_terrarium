import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AwayCard } from '@/components/stage/AwayCard'
import { UtilityActions } from '@/components/nav/UtilityActions'
import { registerWorld, unregisterWorld } from '@/engine/engineBridge'
import type { AwayReport } from '@/engine/simulation/report'
import { createWorld } from '@/engine/world'
import { useAccountStore } from '@/store/useAccountStore'
import { useOverlayStore } from '@/store/useOverlayStore'
import { createDefaultState, useStudioStore } from '@/store/useStudioStore'
import { useToastStore } from '@/store/toastStore'

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
  useStudioStore.setState(createDefaultState())
  useOverlayStore.setState({ growthBoardOpen: false, awayIndex: null, tour: null })
  useToastStore.setState({ message: '', visible: false })
  registerWorld(createWorld())
})

afterEach(() => {
  unregisterWorld()
  useAccountStore.setState(useAccountStore.getInitialState(), true)
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
    expect(useToastStore.getState().message).toBe(
      'No time away recorded yet. Come back later, or preview a gap below.',
    )
    expect(useOverlayStore.getState().awayIndex).toBeNull()

    useStudioStore.setState({ awayLog: [logged()] })
    openTrigger()
    click(screen.getByRole('menuitem', { name: 'Show the last summary' }))
    expect(useOverlayStore.getState().awayIndex).toBe(0)
  })

  it('1 day previews a 24 h gap and opens its card', () => {
    openMenu()
    click(screen.getByRole('menuitem', { name: 'Preview a gap of 1 day' }))
    const s = useStudioStore.getState()
    expect(s.awayLog[0]).toMatchObject({ mode: 'preview', hours: 24 })
    expect(useOverlayStore.getState().awayIndex).toBe(0)
    expect(screen.queryByRole('menu')).toBeNull()
    expect(document.querySelector('#away-card')?.textContent).toContain('Preview · 24 h later')
  })

  it('the switch toggles catchupEnabled and toasts both strings', () => {
    openMenu()
    const sw = () => screen.getByRole('menuitemcheckbox', { name: "Grow while I'm away" })
    click(sw())
    expect(useStudioStore.getState().catchupEnabled).toBe(false)
    expect(useToastStore.getState().message).toBe(
      'Growing while away is off. The tank waits for you.',
    )
    expect(sw().getAttribute('aria-checked')).toBe('false')
    click(sw())
    expect(useStudioStore.getState().catchupEnabled).toBe(true)
    expect(useToastStore.getState().message).toBe('The tank will keep growing while you are away')
  })

  it('a preview adds no journal entry', async () => {
    const add = vi.fn().mockResolvedValue(undefined)
    useAccountStore.setState({ phase: 'cloud', activeId: 'g_a', addJournalEntry: add })
    openMenu()
    click(screen.getByRole('menuitem', { name: 'Preview a gap of 8 h' }))
    await act(async () => {})
    expect(useStudioStore.getState().awayLog).toHaveLength(1)
    expect(add).not.toHaveBeenCalled()
  })
})
