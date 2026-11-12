import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { AccountDialog } from '@/components/account/AccountDialog'
import { TopNav } from '@/components/layout/TopNav'
import type { PublicUser } from '@/auth'
import { makeEnv, renderIn } from './auth/authHarness'
import { appStore } from '@/store/appStore'
import { account, panelOpenAtom, patchAccountAtom, resetAccountAtom } from '@/store/account'

const user: PublicUser = {
  id: 'u1',
  name: 'Dana Green',
  email: 'dana@example.com',
  verified: true,
  provider: 'password',
  createdAt: 1,
}

const Harness = () => (
  <>
    <TopNav />
    <AccountDialog />
  </>
)

beforeEach(() => {
  appStore.set(resetAccountAtom)
})

describe('AccountDialog', () => {
  it('renders nothing while closed', () => {
    render(<Harness />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('shows the checking card while the session is being read', async () => {
    const u = userEvent.setup()
    render(<Harness />)
    await u.click(screen.getByRole('button', { name: /One moment/ }))
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAccessibleName('One moment')
    expect(dialog).toHaveTextContent('Checking your session…')
  })

  it('Escape and the scrim close it and return focus to the chip', async () => {
    appStore.set(patchAccountAtom, { phase: 'signedout' })
    const u = userEvent.setup()
    render(<Harness />)
    const chip = screen.getByRole('button', { name: /Sign in/ })
    await u.click(chip)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await u.keyboard('{Escape}')
    expect(appStore.get(panelOpenAtom)).toBe(false)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(chip).toHaveFocus()

    await u.click(chip)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await u.click(document.getElementById('acct-scrim') as HTMLElement)
    expect(appStore.get(panelOpenAtom)).toBe(false)
    expect(chip).toHaveFocus()
  })

  it('the close button closes it', async () => {
    appStore.set(patchAccountAtom, { phase: 'signedout' })
    const u = userEvent.setup()
    render(<Harness />)
    await u.click(screen.getByRole('button', { name: /Sign in/ }))
    await u.click(screen.getByRole('button', { name: 'Close' }))
    expect(appStore.get(panelOpenAtom)).toBe(false)
  })

  it('cannot be closed during onboarding and hides the close button', async () => {
    appStore.set(patchAccountAtom, {
      phase: 'onboarding',
      user,
      view: 'onboarding',
      panelOpen: true,
    })
    const u = userEvent.setup()
    render(<Harness />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull()
    await u.keyboard('{Escape}')
    expect(appStore.get(panelOpenAtom)).toBe(true)
    await u.click(document.getElementById('acct-scrim') as HTMLElement)
    expect(appStore.get(panelOpenAtom)).toBe(true)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('is wide for the signed-in account view only', () => {
    appStore.set(patchAccountAtom, { phase: 'cloud', user, view: 'account', panelOpen: true })
    const { unmount } = render(<AccountDialog />)
    expect(screen.getByRole('dialog')).toHaveClass('wide')
    unmount()
    appStore.set(patchAccountAtom, {
      phase: 'signedout',
      user: null,
      view: 'account',
      panelOpen: true,
    })
    render(<AccountDialog />)
    expect(screen.getByRole('dialog')).not.toHaveClass('wide')
  })

  it('same-view updates leave focus alone; a different screen moves it to its first field', async () => {
    appStore.set(patchAccountAtom, { phase: 'signedout' })
    const u = userEvent.setup()
    render(<Harness />)
    const chip = screen.getByRole('button', { name: /Sign in/ })
    await u.click(chip)
    // Each screen's first field carries data-autofocus.
    expect(screen.getByLabelText('Email')).toHaveFocus()

    // Focus is trapped in the dialog, so move it to another field there.
    const password = screen.getByLabelText('Password')
    password.focus()
    act(() => account.setViewData({ email: 'a@b.co' }))
    expect(password).toHaveFocus()

    act(() => account.goView('signup'))
    expect(screen.getByLabelText('Your name')).toHaveFocus()
  })

  it('reads an injected AuthEnv store, not the module store', async () => {
    const env = makeEnv('signin')
    const u = userEvent.setup()
    renderIn(env, <AccountDialog />)
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Welcome back')
    expect(appStore.get(panelOpenAtom)).toBe(false)

    act(() => env.account.goView('signup'))
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Create your account')
    expect(screen.getByLabelText('Your name')).toHaveFocus()

    await u.keyboard('{Escape}')
    expect(env.state().panelOpen).toBe(false)
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
