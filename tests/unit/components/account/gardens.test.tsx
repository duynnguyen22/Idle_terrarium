import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { VesselId } from '@/data/vessels'
import { AccountDialog } from '@/components/account/AccountDialog'
import { useAccount } from '@/components/account/auth/authEnv'
import { AuthScreen } from '@/components/account/auth/AuthScreen'
import {
  demoSession,
  demoUser,
  fakeAuth,
  makeEnv,
  renderIn,
  type Harness,
} from '../auth/authHarness'

function CurrentScreen() {
  const view = useAccount((s) => s.view)
  return <AuthScreen view={view} />
}

const MIN = 60_000

const seed = (
  env: Harness,
  id: string,
  name: string,
  vessel: string,
  updatedAt: number,
  counts = { day: 1, plants: 0, animals: 0 },
) =>
  env.backend.saveGarden(id, {
    name,
    createdAt: 1,
    updatedAt,
    summary: { vessel: vessel as VesselId, ...counts },
    snapshot: null,
  })

/** Signed in (phase cloud) with Alpha open and Other saved, on the account view. */
async function signedIn({ signOut }: { signOut?: () => Promise<void> } = {}) {
  const env = makeEnv('account', { auth: fakeAuth(signOut ? { signOut } : {}) })
  const now = Date.now()
  await seed(env, 'g_a', 'Alpha', 'globe', now - 2 * MIN, { day: 3, plants: 2, animals: 1 })
  await seed(env, 'g_b', 'Other', 'cylinder', now - 5 * MIN, { day: 7, plants: 4, animals: 0 })
  await env.backend.setProfile({ activeGardenId: 'g_a' })
  await act(() => env.store.getState().beginSession(demoUser, demoSession, { isNew: false }))
  renderIn(env, <CurrentScreen />)
  return env
}

const row = (name: string) => {
  const el = screen.getByText(name).closest('li')
  if (!el) throw new Error(`no row for ${name}`)
  return within(el)
}

describe('AccountScreen', () => {
  it('shows the avatar, name, email, Verified pill, tabs and the local footer', async () => {
    await signedIn()
    expect(screen.getByRole('heading', { name: 'Demo Gardener' })).toHaveAttribute(
      'id',
      'acct-title',
    )
    expect(screen.getByText('DG')).toHaveClass('acct-big-avatar')
    expect(screen.getByText('demo@botanica.app')).toBeInTheDocument()
    expect(screen.getByText('Verified')).toHaveClass('acct-verified')
    const tabs = within(screen.getByRole('tablist')).getAllByRole('tab')
    expect(tabs.map((t) => t.textContent)).toEqual(['Terrariums', 'Journal', 'Profile & security'])
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true')
    expect(tabs[0]).toHaveAttribute('data-autofocus', '1')
    expect(tabs[1]).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByText('Saved in this browser (prototype backend)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument()
  })

  it('hides the Verified pill for an unverified account and reads the cloud footer', async () => {
    const env = makeEnv('account')
    env.backend.kind = 'cloud'
    await seed(env, 'g_a', 'Alpha', 'globe', Date.now())
    await act(() =>
      env.store
        .getState()
        .beginSession({ ...demoUser, verified: false }, demoSession, { isNew: false }),
    )
    renderIn(env, <CurrentScreen />)
    expect(screen.queryByText('Verified')).toBeNull()
    expect(screen.getByText('Saved to your account')).toBeInTheDocument()
  })

  it('switching tabs selects the tab and clears viewData', async () => {
    const env = await signedIn()
    act(() => env.store.getState().setViewData({ error: 'stale', current: 'x' }))
    await userEvent.setup().click(screen.getByRole('tab', { name: 'Journal' }))
    expect(env.store.getState().tab).toBe('journal')
    expect(env.store.getState().viewData).toEqual({})
    expect(screen.getByRole('tab', { name: 'Journal' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Terrariums' })).toHaveAttribute(
      'aria-selected',
      'false',
    )
    expect(screen.queryByText('My terrariums')).toBeNull()
  })

  it('Sign out ends the session and shows the success banner on sign in', async () => {
    const signOut = vi.fn(() => Promise.resolve())
    const env = await signedIn({ signOut })
    // Values typed on the Profile tab must not follow onto the sign-in screen.
    act(() =>
      env.store.getState().setViewData({
        name: 'Demo Gardener',
        current: 'old-secret1',
        next: 'new-secret2',
        confirmEmail: 'demo@botanica.app',
        saved: 'password',
      }),
    )
    await userEvent.setup().click(screen.getByRole('button', { name: 'Sign out' }))
    await vi.waitFor(() => expect(env.store.getState().view).toBe('signin'))
    expect(signOut).toHaveBeenCalledTimes(1)
    const s = env.store.getState()
    expect(s.phase).toBe('signedout')
    expect(s.user).toBeNull()
    expect(s.gardens).toEqual([])
    expect(s.busy).toBe(false)
    expect(s.viewData).toMatchObject({
      email: 'demo@botanica.app',
      password: '',
      name: '',
      current: '',
      next: '',
      confirmEmail: '',
    })
    expect(s.viewData.saved).toBeUndefined()
    expect(env.toast).toHaveBeenCalledWith('Signed out')
    expect(await screen.findByRole('status')).toHaveTextContent(
      'You’re signed out. Your terrariums are safe in your account.',
    )
    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
  })
})

describe('AccountScreen in the dialog', () => {
  it('Sign out lands on sign in with the banner, focus on the password and busy cleared', async () => {
    const signOut = vi.fn(() => Promise.resolve())
    const env = makeEnv('signin', { auth: fakeAuth({ signOut }) })
    await seed(env, 'g_a', 'Alpha', 'globe', Date.now())
    await act(() => env.store.getState().beginSession(demoUser, demoSession, { isNew: false }))
    renderIn(env, <AccountDialog />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Sign out' }))
    await vi.waitFor(() => expect(env.store.getState().phase).toBe('signedout'))
    await vi.waitFor(() => expect(env.store.getState().busy).toBe(false))
    expect(signOut).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Welcome back')
    expect(screen.getByRole('status')).toHaveTextContent(
      'You’re signed out. Your terrariums are safe in your account.',
    )
    expect(screen.getByLabelText('Email')).toHaveValue('demo@botanica.app')
    expect(document.activeElement).toBe(document.getElementById('auth-password'))
    expect(env.toast).toHaveBeenCalledWith('Signed out')
  })
})

describe('GardensTab', () => {
  it('gardens tab lists saved terrariums with their meta line and marks the open one', async () => {
    const env = await signedIn()
    await act(() =>
      seed(env, 'g_c', '', 'not-a-vessel', Date.now() - 10 * MIN).then(() =>
        env.store.getState().refreshGardens(),
      ),
    )
    expect(screen.getByRole('heading', { name: 'My terrariums' })).toBeInTheDocument()
    expect(screen.getByText('3 saved')).toBeInTheDocument()
    const items = within(screen.getByRole('list')).getAllByRole('listitem')
    expect(items).toHaveLength(3)

    const alpha = row('Alpha')
    expect(
      alpha.getByText('Hanging Sphere · day 3 · 2 plants, 1 animals · 2 min ago'),
    ).toBeInTheDocument()
    expect(alpha.getByText('Open')).toHaveClass('g-badge')
    expect(alpha.queryByRole('button', { name: 'Open' })).toBeNull()
    expect(alpha.getByRole('button', { name: 'Rename' })).toBeInTheDocument()
    expect(alpha.queryByRole('button', { name: 'Delete' })).toBeNull()
    expect(screen.getByText('Alpha').closest('li')).toHaveClass('garden-row', 'is-active')

    const other = row('Other')
    expect(
      other.getByText('Zen Cylinder · day 7 · 4 plants, 0 animals · 5 min ago'),
    ).toBeInTheDocument()
    expect(other.getByRole('button', { name: 'Open' })).toBeInTheDocument()
    expect(other.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
    expect(screen.getByText('Other').closest('li')).not.toHaveClass('is-active')

    const untitled = row('Untitled')
    expect(
      untitled.getByText('Terrarium · day 1 · 0 plants, 0 animals · 10 min ago'),
    ).toBeInTheDocument()
  })

  it('Open loads another garden; Delete asks Keep/Delete and toasts Terrarium deleted', async () => {
    const env = await signedIn()
    const u = userEvent.setup()

    await u.click(row('Other').getByRole('button', { name: 'Open' }))
    await vi.waitFor(() => expect(env.store.getState().activeId).toBe('g_b'))
    expect(env.toast).toHaveBeenCalledWith('Opened Other')
    expect(row('Other').getByText('Open')).toHaveClass('g-badge')
    expect(row('Alpha').getByRole('button', { name: 'Open' })).toBeInTheDocument()

    await u.click(row('Alpha').getByRole('button', { name: 'Delete' }))
    expect(env.store.getState().confirmDelete).toBe('g_a')
    expect(row('Alpha').getByRole('button', { name: 'Keep' })).toBeInTheDocument()
    expect(row('Alpha').queryByRole('button', { name: 'Rename' })).toBeNull()

    await u.click(row('Alpha').getByRole('button', { name: 'Keep' }))
    expect(env.store.getState().confirmDelete).toBeNull()
    expect(row('Alpha').queryByRole('button', { name: 'Keep' })).toBeNull()
    expect((await env.backend.listGardens()).map((g) => g.id)).toContain('g_a')

    await u.click(row('Alpha').getByRole('button', { name: 'Delete' }))
    await u.click(row('Alpha').getByRole('button', { name: 'Delete' }))
    await vi.waitFor(() => expect(env.toast).toHaveBeenCalledWith('Terrarium deleted'))
    expect(screen.queryByText('Alpha')).toBeNull()
    expect(screen.getByText('1 saved')).toBeInTheDocument()
    expect((await env.backend.listGardens()).map((g) => g.id)).toEqual(['g_b'])
  })

  it('Rename saves on Enter and cancels on Escape', async () => {
    const env = await signedIn()
    const u = userEvent.setup()

    await u.click(row('Other').getByRole('button', { name: 'Rename' }))
    const input = screen.getByRole('textbox', { name: 'Terrarium name' })
    expect(input).toHaveValue('Other')
    expect(input).toHaveFocus()
    expect(input).toHaveAttribute('maxlength', '60')
    await u.clear(input)
    await u.type(input, 'Mossy Corner{Enter}')
    await vi.waitFor(() =>
      expect(env.store.getState().gardens.find((g) => g.id === 'g_b')?.name).toBe('Mossy Corner'),
    )
    expect(screen.queryByRole('textbox', { name: 'Terrarium name' })).toBeNull()
    expect(screen.getByText('Mossy Corner')).toBeInTheDocument()
    await vi.waitFor(async () =>
      expect((await env.backend.listGardens()).find((g) => g.id === 'g_b')?.name).toBe(
        'Mossy Corner',
      ),
    )

    await u.click(row('Mossy Corner').getByRole('button', { name: 'Rename' }))
    const again = screen.getByRole('textbox', { name: 'Terrarium name' })
    await u.clear(again)
    await u.type(again, 'Nope{Escape}')
    expect(screen.queryByRole('textbox', { name: 'Terrarium name' })).toBeNull()
    expect(env.store.getState().renaming).toBeNull()
    expect(screen.getByText('Mossy Corner')).toBeInTheDocument()
    expect(env.store.getState().gardens.find((g) => g.id === 'g_b')?.name).toBe('Mossy Corner')
  })

  it('Enter then leaving the field saves the name once', async () => {
    const env = await signedIn()
    const rename = vi.spyOn(env.backend, 'renameGarden')
    const u = userEvent.setup()
    await u.click(row('Other').getByRole('button', { name: 'Rename' }))
    const input = screen.getByRole('textbox', { name: 'Terrarium name' })
    await u.clear(input)
    await u.type(input, 'Once{Enter}')
    await u.tab()
    await vi.waitFor(() =>
      expect(env.store.getState().gardens.find((g) => g.id === 'g_b')?.name).toBe('Once'),
    )
    expect(rename).toHaveBeenCalledTimes(1)
    expect(rename).toHaveBeenCalledWith('g_b', 'Once')
  })

  it('a whitespace-only name closes the editor without renaming', async () => {
    const env = await signedIn()
    const rename = vi.spyOn(env.backend, 'renameGarden')
    const u = userEvent.setup()
    await u.click(row('Other').getByRole('button', { name: 'Rename' }))
    const input = screen.getByRole('textbox', { name: 'Terrarium name' })
    await u.clear(input)
    await u.type(input, '   {Enter}')
    expect(screen.queryByRole('textbox', { name: 'Terrarium name' })).toBeNull()
    expect(env.store.getState().renaming).toBeNull()
    expect(rename).not.toHaveBeenCalled()
    expect(screen.getByText('Other')).toBeInTheDocument()
    expect(env.store.getState().gardens.find((g) => g.id === 'g_b')?.name).toBe('Other')
  })

  it('Rename saves on blur', async () => {
    const env = await signedIn()
    const u = userEvent.setup()
    await u.click(row('Alpha').getByRole('button', { name: 'Rename' }))
    const input = screen.getByRole('textbox', { name: 'Terrarium name' })
    await u.clear(input)
    await u.type(input, 'Blurred')
    await u.tab()
    await vi.waitFor(() =>
      expect(env.store.getState().gardens.find((g) => g.id === 'g_a')?.name).toBe('Blurred'),
    )
    expect(screen.queryByRole('textbox', { name: 'Terrarium name' })).toBeNull()
  })

  it('New Falls Lake build and New empty tank create numbered terrariums and toast', async () => {
    const env = await signedIn()
    const u = userEvent.setup()
    await u.click(screen.getByRole('button', { name: 'New Falls Lake build' }))
    await vi.waitFor(() => expect(env.toast).toHaveBeenCalledWith('New terrarium started'))
    expect(screen.getByText('3 saved')).toBeInTheDocument()
    expect(row('Falls Lake 3').getByText('Open')).toHaveClass('g-badge')

    await u.click(screen.getByRole('button', { name: 'New empty tank' }))
    await vi.waitFor(() => expect(screen.getByText('4 saved')).toBeInTheDocument())
    expect(row('Terrarium 4').getByText('Open')).toHaveClass('g-badge')
    expect(env.toast).toHaveBeenCalledTimes(2)
  })
})

describe('GardensTab in the dialog', () => {
  it('Escape in the rename box cancels the rename as the dialog closes (spec 4994, 6408)', async () => {
    const env = makeEnv('signin')
    await seed(env, 'g_a', 'Alpha', 'globe', Date.now())
    await act(() => env.store.getState().beginSession(demoUser, demoSession, { isNew: false }))
    renderIn(env, <AccountDialog />)
    expect(screen.getByRole('tab', { name: 'Terrariums' })).toHaveFocus()
    const u = userEvent.setup()
    await u.click(screen.getByRole('button', { name: 'Rename' }))
    expect(screen.getByRole('textbox', { name: 'Terrarium name' })).toHaveFocus()
    await u.keyboard('{Escape}')
    expect(env.store.getState().renaming).toBeNull()
    expect(env.store.getState().panelOpen).toBe(false)

    act(() => env.store.getState().openPanel())
    expect(screen.queryByRole('textbox', { name: 'Terrarium name' })).toBeNull()
    expect(screen.getByText('Alpha')).toBeInTheDocument()
  })
})
