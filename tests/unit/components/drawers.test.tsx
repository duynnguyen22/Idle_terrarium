import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { StudioLayout } from '@/components/layout/StudioLayout'
import { appStore } from '@/store/appStore'
import { createDefaultState, patchStudioAtom, selectedIdAtom } from '@/store/studio'
import { WELCOME_KEY } from '@/store/account'

beforeEach(() => {
  appStore.set(patchStudioAtom, createDefaultState())
  // Skip the first-visit sign-up prompt: Radix's modal dialog hides the page behind it.
  localStorage.setItem(WELCOME_KEY, '1')
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
})

afterEach(() => vi.unstubAllGlobals())

describe('responsive drawers', () => {
  it('toggles each sidebar from the top nav with aria-expanded / aria-controls', () => {
    render(<StudioLayout>{null}</StudioLayout>)
    const left = screen.getByRole('button', { name: 'Toggle catalog panel' })
    const right = screen.getByRole('button', { name: 'Toggle telemetry panel' })
    expect(left).toHaveAttribute('aria-controls', 'left-sidebar')
    expect(right).toHaveAttribute('aria-controls', 'right-sidebar')
    expect(left).toHaveAttribute('aria-expanded', 'false')
    expect(document.getElementById('left-sidebar')).toHaveAttribute('data-drawer-open', 'false')

    act(() => void fireEvent.click(left))
    expect(left).toHaveAttribute('aria-expanded', 'true')
    expect(document.getElementById('left-sidebar')).toHaveAttribute('data-drawer-open', 'true')

    // Opening the other drawer closes the first.
    act(() => void fireEvent.click(right))
    expect(left).toHaveAttribute('aria-expanded', 'false')
    expect(document.getElementById('right-sidebar')).toHaveAttribute('data-drawer-open', 'true')

    act(() => void fireEvent.click(screen.getByTestId('drawer-scrim')))
    expect(right).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByTestId('drawer-scrim')).toBeNull()
  })

  it('closes the open drawer on Escape', () => {
    render(<StudioLayout>{null}</StudioLayout>)
    act(() => void fireEvent.click(screen.getByRole('button', { name: 'Toggle catalog panel' })))
    act(() => void fireEvent.keyDown(window, { key: 'Escape' }))
    expect(document.getElementById('left-sidebar')).toHaveAttribute('data-drawer-open', 'false')
  })

  it('Escape closes the drawer only (selection kept) and returns focus to the toggle', () => {
    appStore.set(selectedIdAtom, 'some-item')
    render(<StudioLayout>{null}</StudioLayout>)
    const left = screen.getByRole('button', { name: 'Toggle catalog panel' })
    act(() => void fireEvent.click(left))
    // Focus moved into the drawer.
    expect(document.getElementById('left-sidebar')).toContainElement(
      document.activeElement as HTMLElement,
    )
    act(() => void fireEvent.keyDown(document.body, { key: 'Escape' }))
    expect(document.getElementById('left-sidebar')).toHaveAttribute('data-drawer-open', 'false')
    expect(appStore.get(selectedIdAtom)).toBe('some-item')
    expect(left).toHaveFocus()

    // With no drawer open, Escape still clears the selection.
    act(() => void fireEvent.keyDown(document.body, { key: 'Escape' }))
    expect(appStore.get(selectedIdAtom)).toBeNull()
  })

  it('moves focus into the right drawer on open', () => {
    render(<StudioLayout>{null}</StudioLayout>)
    act(() => void fireEvent.click(screen.getByRole('button', { name: 'Toggle telemetry panel' })))
    expect(document.getElementById('right-sidebar')).toContainElement(
      document.activeElement as HTMLElement,
    )
  })
})
