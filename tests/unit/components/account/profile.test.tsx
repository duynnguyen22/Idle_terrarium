import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useAtomValue } from 'jotai'
import { viewAtom } from '@/store/account'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthError, type AuthService, type PublicUser } from '@/auth'
import { AccountChip } from '@/components/account/AccountChip'
import { AccountDialog } from '@/components/account/AccountDialog'
import { AuthScreen } from '@/components/account/auth/AuthScreen'
import { demoSession, demoUser, fakeAuth, makeEnv, renderIn } from '../auth/authHarness'

function CurrentScreen() {
  const view = useAtomValue(viewAtom)
  return <AuthScreen view={view} />
}

const MIN = 60_000

afterEach(() => vi.restoreAllMocks())

/** Signed in (phase cloud) with one terrarium open, on the Profile & security tab. */
async function signedIn({
  auth = {},
  user = demoUser,
  remember = true,
  dialog = false,
}: {
  auth?: Partial<AuthService>
  user?: PublicUser
  remember?: boolean
  dialog?: boolean
} = {}) {
  const env = makeEnv(dialog ? 'signin' : 'account', { auth: fakeAuth(auth) })
  await env.backend.saveGarden('g_a', {
    name: 'Alpha',
    createdAt: 1,
    updatedAt: Date.now(),
    summary: { vessel: 'globe', day: 1, plants: 0, animals: 0 },
    snapshot: null,
  })
  await env.backend.setProfile({ activeGardenId: 'g_a' })
  const session = { ...demoSession, remember, createdAt: Date.now() - 5 * MIN }
  await act(() => env.account.beginSession(user, session, { isNew: false }))
  act(() => env.account.setTab('profile'))
  renderIn(
    env,
    <>
      <AccountChip />
      {dialog ? <AccountDialog /> : <CurrentScreen />}
    </>,
  )
  return env
}

const card = (heading: string) => {
  const el = screen.getByRole('heading', { name: heading }).closest('.acct-card')
  if (!(el instanceof HTMLElement)) throw new Error(`no card for ${heading}`)
  return within(el)
}

describe('ProfileTab', () => {
  it('renders the profile, password, sessions and danger-zone cards', async () => {
    await signedIn()
    expect(screen.getByRole('tab', { name: 'Profile & security' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    const profile = card('Profile')
    expect(profile.getByLabelText('Display name')).toHaveValue('Demo Gardener')
    expect(profile.getByText('demo@botanica.app').closest('.acct-static')).not.toBeNull()
    expect(profile.getByText('Verified')).toHaveClass('acct-verified')
    expect(profile.getByRole('button', { name: 'Save profile' })).toHaveClass('g-btn', 'primary')

    const password = card('Password')
    expect(password.getByLabelText('Current password')).toHaveAttribute('type', 'password')
    expect(password.getByLabelText('New password')).toHaveAttribute('autocomplete', 'new-password')
    expect(password.getByText('Password strength')).toBeInTheDocument()
    expect(password.getByRole('button', { name: 'Change password' })).toBeInTheDocument()

    const sessions = card('Where you’re signed in')
    expect(sessions.getByText('Test on jsdom')).toBeInTheDocument()
    expect(
      sessions.getByText('This device · signed in 5 min ago · stays signed in for 30 days'),
    ).toBeInTheDocument()
    expect(sessions.getByText('Current')).toHaveClass('g-badge')
    expect(sessions.getByRole('button', { name: 'Sign out of all devices' })).toBeInTheDocument()

    const danger = card('Delete account')
    expect(
      danger.getByText(
        'This removes your account, every terrarium and every journal entry. It can’t be undone.',
      ),
    ).toBeInTheDocument()
    expect(danger.getByRole('button', { name: 'Delete account…' })).toHaveClass(
      'g-btn',
      'danger-outline',
    )
  })

  it('a provider account has no password form and a session that ends with the browser', async () => {
    await signedIn({ user: { ...demoUser, provider: 'google', verified: false }, remember: false })
    const password = card('Password')
    expect(
      password.getByText('You sign in with google, so there’s no Botanica password to manage.'),
    ).toHaveClass('acct-note')
    expect(screen.queryByLabelText('Current password')).toBeNull()
    expect(screen.queryByText('Verified')).toBeNull()
    expect(
      screen.getByText('This device · signed in 5 min ago · until you close the browser'),
    ).toBeInTheDocument()
  })

  it('save profile updates the name everywhere, including the chip, and shows Saved', async () => {
    const updateProfile = vi.fn((_id: string, { name }: { name: string }) =>
      Promise.resolve({ ...demoUser, name: name.trim() }),
    )
    const env = await signedIn({ auth: { updateProfile } })
    expect(document.getElementById('acct-name')).toHaveTextContent('Demo Gardener')
    const user = userEvent.setup()
    const name = screen.getByLabelText('Display name')
    await user.clear(name)
    await user.type(name, 'Fern Keeper ')
    await user.click(screen.getByRole('button', { name: 'Save profile' }))
    expect(await screen.findByText('Saved')).toHaveClass('acct-ok')
    expect(updateProfile).toHaveBeenCalledWith('u_demo', { name: 'Fern Keeper ' })
    expect(env.state().user?.name).toBe('Fern Keeper')
    expect(document.getElementById('acct-name')).toHaveTextContent('Fern Keeper')
    expect(screen.getByRole('heading', { name: 'Fern Keeper' })).toHaveAttribute('id', 'acct-title')
    expect(env.state().busy).toBe(false)
  })

  it('a profile reply that arrives after the session ended changes nothing', async () => {
    let reply!: (u: PublicUser) => void
    const updateProfile = vi.fn(() => new Promise<PublicUser>((r) => (reply = r)))
    const env = await signedIn({ auth: { updateProfile } })
    await userEvent.setup().click(screen.getByRole('button', { name: 'Save profile' }))
    expect(updateProfile).toHaveBeenCalledTimes(1)
    await act(async () => {
      env.account.goView('signin')
      await env.account.endSession()
    })
    await act(async () => reply({ ...demoUser, name: 'Too Late' }))
    await vi.waitFor(() => expect(env.state().busy).toBe(false))
    expect(env.state().user).toBeNull()
    expect(env.state().viewData.saved).toBeUndefined()
  })

  it('an empty name shows the service field error under Display name', async () => {
    const updateProfile = vi.fn(() =>
      Promise.reject(new AuthError('invalid_name', 'Enter your name.', { field: 'name' })),
    )
    await signedIn({ auth: { updateProfile } })
    const user = userEvent.setup()
    await user.clear(screen.getByLabelText('Display name'))
    await user.click(screen.getByRole('button', { name: 'Save profile' }))
    expect(await screen.findByText('Enter your name.')).toHaveAttribute('id', 'auth-name-err')
    expect(screen.queryByText('Saved')).toBeNull()
  })

  it('wrong current password shows the error on the current field', async () => {
    const changePassword = vi.fn(() =>
      Promise.reject(
        new AuthError('wrong_password', 'Your current password isn’t right.', { field: 'current' }),
      ),
    )
    await signedIn({ auth: { changePassword } })
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Current password'), 'nope1234')
    await user.type(screen.getByLabelText('New password'), 'better5678')
    await user.click(screen.getByRole('button', { name: 'Change password' }))
    const err = await screen.findByText('Your current password isn’t right.')
    expect(err).toHaveAttribute('id', 'auth-current-err')
    expect(screen.getByLabelText('Current password')).toHaveAttribute('aria-invalid', 'true')
    expect(changePassword).toHaveBeenCalledWith('u_demo', {
      current: 'nope1234',
      next: 'better5678',
    })
    expect(screen.queryByText('Password changed')).toBeNull()
  })

  it('a changed password clears both fields and shows Password changed', async () => {
    const changePassword = vi.fn(() => Promise.resolve())
    const env = await signedIn({ auth: { changePassword } })
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Current password'), 'demo1234')
    await user.type(screen.getByLabelText('New password'), 'Better-5678')
    expect(screen.getByText('Strong')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Change password' }))
    expect(await screen.findByText('Password changed')).toHaveClass('acct-ok')
    expect(screen.getByLabelText('Current password')).toHaveValue('')
    expect(screen.getByLabelText('New password')).toHaveValue('')
    expect(env.state().viewData.saved).toBe('password')
  })

  it('delete requires the exact email, case-insensitive', async () => {
    const deleteAccount = vi.fn(() => Promise.resolve())
    const env = await signedIn({ auth: { deleteAccount } })
    const deleteAll = vi.spyOn(env.backend, 'deleteAll')
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Delete account…' }))
    const confirm = screen.getByLabelText('Type demo@botanica.app to confirm')
    expect(confirm).toHaveAttribute('type', 'email')
    expect(document.activeElement).toBe(confirm)

    await user.type(confirm, 'demo@botanica.ap')
    await user.click(screen.getByRole('button', { name: 'Delete my account' }))
    expect(screen.getByText('That doesn’t match your email.')).toHaveAttribute(
      'id',
      'auth-confirmEmail-err',
    )
    expect(deleteAccount).not.toHaveBeenCalled()
    expect(deleteAll).not.toHaveBeenCalled()

    await user.clear(confirm)
    await user.type(confirm, '  DEMO@Botanica.app ')
    await user.click(screen.getByRole('button', { name: 'Delete my account' }))
    await vi.waitFor(() => expect(env.state().view).toBe('signup'))
    expect(deleteAll).toHaveBeenCalledTimes(1)
    expect(deleteAccount).toHaveBeenCalledWith('u_demo')
    expect(deleteAll.mock.invocationCallOrder[0]).toBeLessThan(
      deleteAccount.mock.invocationCallOrder[0] ?? 0,
    )
    expect(await env.backend.listGardens()).toEqual([])
    const s = env.state()
    expect(s.phase).toBe('signedout')
    expect(s.user).toBeNull()
    expect(s.busy).toBe(false)
    expect(s.viewData.banner).toEqual({
      kind: 'info',
      text: 'Your account and its data were deleted.',
    })
    expect(s.viewData).toMatchObject({ name: '', current: '', next: '', confirmEmail: '' })
    expect(s.viewData.saved).toBeUndefined()
    expect(env.toast).toHaveBeenCalledWith('Account deleted')
  })

  it('a failed account deletion keeps the session, reopens the terrarium and shows the error', async () => {
    const deleteAccount = vi.fn(() =>
      Promise.reject(new AuthError('no_account', 'We couldn’t find that account.')),
    )
    const env = await signedIn({ auth: { deleteAccount } })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Delete account…' }))
    await user.type(screen.getByLabelText('Type demo@botanica.app to confirm'), 'demo@botanica.app')
    await user.click(screen.getByRole('button', { name: 'Delete my account' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('We couldn’t find that account.')
    const s = env.state()
    expect(s).toMatchObject({ phase: 'cloud', activeId: 'g_a', busy: false })
    expect(s.user?.id).toBe('u_demo')
    // The open terrarium is written back under its own name and the list matches the storage.
    expect((await env.backend.listGardens()).map((g) => g.name)).toEqual(['Alpha'])
    expect(s.gardens.map((g) => g.name)).toEqual(['Alpha'])
    expect(env.toast).not.toHaveBeenCalledWith('Account deleted')
  })

  it('Cancel closes the delete confirmation without deleting', async () => {
    const env = await signedIn()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Delete account…' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByLabelText('Type demo@botanica.app to confirm')).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Delete account…' }))
    expect(env.state().phase).toBe('cloud')
  })

  it('sign out everywhere ends the session and shows the banner on sign in', async () => {
    const signOutEverywhere = vi.fn(() => Promise.resolve())
    const env = await signedIn({ auth: { signOutEverywhere } })
    await userEvent.setup().click(screen.getByRole('button', { name: 'Sign out of all devices' }))
    await vi.waitFor(() => expect(env.state().view).toBe('signin'))
    expect(signOutEverywhere).toHaveBeenCalledWith('u_demo')
    const s = env.state()
    expect(s.phase).toBe('signedout')
    expect(s.user).toBeNull()
    expect(s.busy).toBe(false)
    expect(s.viewData).toMatchObject({ email: 'demo@botanica.app', password: '', name: '' })
    expect(env.toast).toHaveBeenCalledWith('Signed out of every device')
    expect(await screen.findByRole('status')).toHaveTextContent(
      'You’re signed out everywhere. Sign in again on the devices you use.',
    )
    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
  })

  it('in the dialog, sign out everywhere lands on sign in with focus on the password', async () => {
    const signOutEverywhere = vi.fn(() => Promise.resolve())
    const env = await signedIn({ auth: { signOutEverywhere }, dialog: true })
    await userEvent.setup().click(screen.getByRole('button', { name: 'Sign out of all devices' }))
    await vi.waitFor(() => expect(env.state().phase).toBe('signedout'))
    await vi.waitFor(() => expect(env.state().busy).toBe(false))
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Welcome back')
    expect(screen.queryByText('Please wait…')).toBeNull()
    expect(screen.getByLabelText('Email')).toHaveValue('demo@botanica.app')
    expect(document.activeElement).toBe(document.getElementById('auth-password'))
  })

  it('a failed sign out everywhere keeps the session and shows the error', async () => {
    const signOutEverywhere = vi.fn(() => Promise.reject(new Error('offline')))
    const env = await signedIn({ auth: { signOutEverywhere } })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await userEvent.setup().click(screen.getByRole('button', { name: 'Sign out of all devices' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong. Try again.')
    expect(env.state().phase).toBe('cloud')
    expect(env.state().busy).toBe(false)
  })
})
