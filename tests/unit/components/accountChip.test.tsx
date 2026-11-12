import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TopNav } from '@/components/layout/TopNav'
import type { PublicUser } from '@/auth'
import { appStore } from '@/store/appStore'
import { panelOpenAtom, patchAccountAtom, resetAccountAtom } from '@/store/account'

const user: PublicUser = {
  id: 'u1',
  name: 'Dana Green',
  email: 'dana@example.com',
  verified: true,
  provider: 'password',
  createdAt: 1,
}

beforeEach(() => {
  appStore.set(resetAccountAtom)
})
afterEach(() => {
  vi.useRealTimers()
})

describe('AccountChip', () => {
  it('signed out: dark chip reads Sign in / to save your work and opens the dialog', async () => {
    appStore.set(patchAccountAtom, { phase: 'signedout' })
    const u = userEvent.setup()
    render(<TopNav />)
    const chip = screen.getByRole('button', { name: /Sign in/ })
    expect(chip).toHaveClass('is-signedout')
    expect(chip).toHaveAttribute('id', 'btn-account')
    expect(chip).toHaveAttribute('aria-haspopup', 'dialog')
    expect(chip).toHaveAttribute('aria-controls', 'acct-panel')
    expect(chip).toHaveAttribute('aria-expanded', 'false')
    expect(chip).toHaveTextContent('to save your work')
    expect(screen.getByRole('button', { name: 'Sign in to save your work' })).toBe(chip)
    await u.click(chip)
    expect(appStore.get(panelOpenAtom)).toBe(true)
    expect(chip).toHaveAttribute('aria-expanded', 'true')
  })

  it('checking: reads One moment', () => {
    render(<TopNav />)
    expect(screen.getByRole('button', { name: /One moment/ })).toHaveClass('is-signedout')
    // No status text while checking, so the name has no trailing space.
    expect(screen.getByRole('button', { name: 'One moment' })).toHaveAttribute('id', 'btn-account')
  })

  it('signed in: shows initials DG, the name and Saved just now', () => {
    appStore.set(patchAccountAtom, { phase: 'cloud', user, lastSaved: Date.now() })
    render(<TopNav />)
    const chip = screen.getByRole('button', { name: /Dana Green/ })
    expect(chip).not.toHaveClass('is-signedout')
    expect(screen.getByRole('button', { name: 'Dana Green Saved just now' })).toBe(chip)
    expect(chip).toHaveTextContent('DG')
    expect(chip).toHaveTextContent('Saved just now')
    expect(chip.querySelector('#acct-dot')).toHaveAttribute('data-q', 'ok')
    expect(chip.querySelector('#acct-avatar')).toHaveTextContent('DG')
    expect(chip.querySelector('#acct-name')).toHaveTextContent('Dana Green')
    expect(chip.querySelector('#acct-status')).toHaveTextContent('Saved just now')
  })

  it('ages the saved label every 30 s', () => {
    vi.useFakeTimers()
    const savedAt = Date.now()
    appStore.set(patchAccountAtom, { phase: 'cloud', user, lastSaved: savedAt })
    render(<TopNav />)
    expect(screen.getByRole('button', { name: /Dana Green/ })).toHaveTextContent('Saved just now')
    act(() => {
      vi.advanceTimersByTime(30_000)
    })
    expect(screen.getByRole('button', { name: /Dana Green/ })).toHaveTextContent('Saved 30 s ago')
  })
})
