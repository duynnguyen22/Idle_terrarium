import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { AccountDialog } from '@/components/account/AccountDialog'
import { TopNav } from '@/components/layout/TopNav'
import type { PublicUser } from '@/auth'
import { useAccountStore } from '@/store/useAccountStore'

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
  useAccountStore.setState(useAccountStore.getInitialState(), true)
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
    useAccountStore.setState({ phase: 'signedout' })
    const u = userEvent.setup()
    render(<Harness />)
    const chip = screen.getByRole('button', { name: /Sign in/ })
    await u.click(chip)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await u.keyboard('{Escape}')
    expect(useAccountStore.getState().panelOpen).toBe(false)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(chip).toHaveFocus()

    await u.click(chip)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await u.click(document.getElementById('acct-scrim') as HTMLElement)
    expect(useAccountStore.getState().panelOpen).toBe(false)
    expect(chip).toHaveFocus()
  })

  it('the close button closes it', async () => {
    useAccountStore.setState({ phase: 'signedout' })
    const u = userEvent.setup()
    render(<Harness />)
    await u.click(screen.getByRole('button', { name: /Sign in/ }))
    await u.click(screen.getByRole('button', { name: 'Close' }))
    expect(useAccountStore.getState().panelOpen).toBe(false)
  })

  it('cannot be closed during onboarding and hides the close button', async () => {
    useAccountStore.setState({
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
    expect(useAccountStore.getState().panelOpen).toBe(true)
    await u.click(document.getElementById('acct-scrim') as HTMLElement)
    expect(useAccountStore.getState().panelOpen).toBe(true)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('is wide for the signed-in account view only', () => {
    useAccountStore.setState({ phase: 'cloud', user, view: 'account', panelOpen: true })
    const { unmount } = render(<AccountDialog />)
    expect(screen.getByRole('dialog')).toHaveClass('wide')
    unmount()
    useAccountStore.setState({ phase: 'signedout', user: null, view: 'account', panelOpen: true })
    render(<AccountDialog />)
    expect(screen.getByRole('dialog')).not.toHaveClass('wide')
  })

  it('same-view updates leave focus alone; a different screen moves it into the panel', async () => {
    useAccountStore.setState({ phase: 'signedout' })
    const u = userEvent.setup()
    render(<Harness />)
    const chip = screen.getByRole('button', { name: /Sign in/ })
    await u.click(chip)
    const panel = screen.getByRole('dialog')
    expect(panel).toHaveFocus()

    chip.focus()
    act(() => useAccountStore.getState().setViewData({ email: 'a@b.co' }))
    expect(chip).toHaveFocus()

    act(() => useAccountStore.getState().goView('signup'))
    expect(panel).toHaveFocus()
  })
})
