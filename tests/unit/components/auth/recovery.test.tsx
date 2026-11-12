import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { createLocalAuthService } from '@/auth'
import { AccountDialog } from '@/components/account/AccountDialog'
import {
  demoSession,
  demoUser,
  fakeAuth,
  MemoryStorage,
  makeEnv,
  renderAuth,
  renderIn,
  type Harness,
} from './authHarness'

/** The real prototype service, so error text is the service's own. */
const localAuth = () =>
  createLocalAuthService({
    local: new MemoryStorage(),
    session: new MemoryStorage(),
    latency: () => Promise.resolve(),
  })

/** A saved terrarium, so a returning session lands in the cloud phase rather than onboarding. */
const seedGarden = (env: Harness) =>
  env.backend.saveGarden('g_1', {
    name: 'My terrarium',
    createdAt: 1,
    updatedAt: 2,
    summary: { vessel: 'globe', day: 1, plants: 0, animals: 0 },
    snapshot: null,
  })

const paragraph = (text: string) =>
  screen.getByText((_, el) => el?.tagName === 'P' && el.textContent === text)

describe('ForgotScreen', () => {
  it('renders its title, copy, email field and Send reset code', () => {
    renderAuth('forgot', { viewData: { email: 'linh@example.com' } })
    expect(screen.getByRole('heading', { name: 'Reset your password' })).toHaveAttribute(
      'id',
      'acct-title',
    )
    expect(
      screen.getByText(
        'Enter the email you signed up with. We’ll send a code to set a new password.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveValue('linh@example.com')
    expect(screen.getByLabelText('Email')).toHaveAttribute('data-autofocus', '1')
    expect(screen.getByRole('button', { name: 'Send reset code' })).toBeInTheDocument()
  })

  it('sends the reset code and moves to the reset view with a fresh code and resend window', async () => {
    const requestPasswordReset = vi.fn(() => Promise.resolve())
    const env = renderAuth('forgot', { auth: fakeAuth({ requestPasswordReset }) })
    const u = userEvent.setup()
    await u.type(screen.getByLabelText('Email'), 'linh@example.com')
    const before = Date.now()
    await u.click(screen.getByRole('button', { name: 'Send reset code' }))
    await vi.waitFor(() => expect(env.state().view).toBe('reset'))
    expect(requestPasswordReset).toHaveBeenCalledWith('linh@example.com')
    const v = env.state().viewData
    expect(v).toMatchObject({ email: 'linh@example.com', code: '', password: '' })
    expect(v.resendAt).toBeGreaterThanOrEqual(before + 30_000)
    expect(env.state().busy).toBe(false)
  })

  it('an invalid email shows the service’s message under the field', async () => {
    renderAuth('forgot', { auth: localAuth(), viewData: { email: 'nope' } })
    await userEvent.setup().click(screen.getByRole('button', { name: 'Send reset code' }))
    const err = await screen.findByText('Enter a valid email address.')
    expect(err).toHaveAttribute('id', 'auth-email-err')
  })

  it('Back to sign in returns to the sign-in view', async () => {
    const env = renderAuth('forgot')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Back to sign in' }))
    expect(env.state().view).toBe('signin')
  })
})

describe('ResetScreen', () => {
  const viewData = {
    email: 'linh@example.com',
    code: '',
    password: '',
    resendAt: Date.now() + 30_000,
  }

  it('renders its title, copy, inbox code, code boxes, new password and Update password', () => {
    renderAuth('reset', {
      auth: fakeAuth({ devCode: () => '482913' }),
      viewData,
    })
    expect(screen.getByRole('heading', { name: 'Set a new password' })).toHaveAttribute(
      'id',
      'acct-title',
    )
    expect(
      paragraph('If an account exists for linh@example.com, a code is on its way.'),
    ).toBeInTheDocument()
    expect(screen.getByText('482913').tagName).toBe('B')
    expect(screen.getByText('Code from the email')).toBeInTheDocument()
    expect(screen.getByLabelText('Digit 1')).toHaveAttribute('data-autofocus', '1')
    expect(screen.getByLabelText('New password')).toHaveAttribute('autocomplete', 'new-password')
    expect(screen.getByText('At least 8 characters')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Update password' })).toBeInTheDocument()
    expect(screen.getByText(/Didn’t get it\?/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Back to sign in' })).toBeInTheDocument()
  })

  it('updates the password and moves to Password updated', async () => {
    const resetPassword = vi.fn(() => Promise.resolve())
    const env = renderAuth('reset', { auth: fakeAuth({ resetPassword }), viewData })
    const u = userEvent.setup()
    await u.click(screen.getByLabelText('Digit 1'))
    await u.keyboard('482913')
    await u.type(screen.getByLabelText('New password'), 'newgarden9')
    await u.click(screen.getByRole('button', { name: 'Update password' }))
    await vi.waitFor(() => expect(env.state().view).toBe('resetDone'))
    expect(resetPassword).toHaveBeenCalledWith({
      email: 'linh@example.com',
      code: '482913',
      password: 'newgarden9',
    })
    expect(env.state().viewData.password).toBe('')
  })

  it('a bad code shows the service’s message on the code field', async () => {
    const env = renderAuth('reset', {
      auth: localAuth(),
      viewData: { ...viewData, code: '000000', password: 'newgarden9' },
    })
    await userEvent.setup().click(screen.getByRole('button', { name: 'Update password' }))
    const err = await screen.findByText('That code doesn’t match. Check the email and try again.')
    expect(err).toHaveAttribute('id', 'auth-code-err')
    expect(screen.getByRole('group', { name: 'Verification code' })).toHaveAttribute(
      'aria-describedby',
      'auth-code-err',
    )
    expect(env.state().view).toBe('reset')
  })

  it('a too-weak password shows the service’s message on the password field', async () => {
    const auth = localAuth()
    auth.getSession() // seeds the demo account
    await auth.requestPasswordReset('demo@botanica.app')
    renderAuth('reset', {
      auth,
      viewData: {
        ...viewData,
        email: 'demo@botanica.app',
        code: auth.devCode('demo@botanica.app') ?? '',
        password: 'short',
      },
    })
    await userEvent.setup().click(screen.getByRole('button', { name: 'Update password' }))
    const err = await screen.findByText('Use at least 8 characters with a letter and a number.')
    expect(err).toHaveAttribute('id', 'auth-password-err')
  })

  it('sends a partial code without the empty-box placeholders', async () => {
    const resetPassword = vi.fn(() => Promise.resolve())
    renderAuth('reset', {
      auth: fakeAuth({ resetPassword }),
      viewData: { ...viewData, code: '48 91', password: 'newgarden9' },
    })
    await userEvent.setup().click(screen.getByRole('button', { name: 'Update password' }))
    await vi.waitFor(() => expect(resetPassword).toHaveBeenCalled())
    expect(resetPassword).toHaveBeenCalledWith({
      email: 'linh@example.com',
      code: '4891',
      password: 'newgarden9',
    })
  })
})

describe('ResetDoneScreen', () => {
  it('renders Password updated and Sign in goes back to sign-in with the password cleared', async () => {
    const env = renderAuth('resetDone', {
      viewData: { email: 'linh@example.com', password: 'newgarden9' },
    })
    expect(screen.getByRole('heading', { name: 'Password updated' })).toHaveAttribute(
      'id',
      'acct-title',
    )
    expect(
      screen.getByText(
        'For your security we signed you out on every device. Sign in with your new password.',
      ),
    ).toBeInTheDocument()
    const btn = screen.getByRole('button', { name: 'Sign in' })
    expect(btn).toHaveAttribute('data-autofocus', '1')
    await userEvent.setup().click(btn)
    expect(env.state().view).toBe('signin')
    expect(env.state().viewData).toMatchObject({ email: 'linh@example.com', password: '' })
  })
})

describe('MagicSentScreen', () => {
  it('renders Check your inbox with the prototype inbox card', () => {
    renderAuth('magicSent', {
      viewData: { email: 'demo@botanica.app', resendAt: Date.now() + 30_000 },
    })
    expect(screen.getByRole('heading', { name: 'Check your inbox' })).toHaveAttribute(
      'id',
      'acct-title',
    )
    expect(
      paragraph(
        'We sent a sign-in link to demo@botanica.app. It works once and expires in 10 minutes.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('Prototype inbox')).toBeInTheDocument()
    expect(screen.getByText('Botanica: Your sign-in link')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open the link' })).toHaveAttribute(
      'data-autofocus',
      '1',
    )
    expect(screen.getByText(/Didn’t get it\?/)).toBeInTheDocument()
  })

  it('Open the link completes the link, closes the dialog and toasts Signed in as', async () => {
    const completeMagicLink = vi.fn(() =>
      Promise.resolve({ session: demoSession, user: demoUser, isNew: false }),
    )
    const env = renderAuth('magicSent', {
      auth: fakeAuth({ completeMagicLink }),
      viewData: { email: 'demo@botanica.app', resendAt: Date.now() + 30_000 },
    })
    await seedGarden(env)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Open the link' }))
    await vi.waitFor(() => expect(env.state().panelOpen).toBe(false))
    expect(completeMagicLink).toHaveBeenCalledWith('demo@botanica.app')
    expect(env.state().phase).toBe('cloud')
    expect(env.toast).toHaveBeenCalledWith('Signed in as demo@botanica.app')
  })

  it('a new account from the link goes to onboarding', async () => {
    const completeMagicLink = vi.fn(() =>
      Promise.resolve({ session: demoSession, user: demoUser, isNew: true }),
    )
    const env = renderAuth('magicSent', {
      auth: fakeAuth({ completeMagicLink }),
      viewData: { email: 'demo@botanica.app' },
    })
    await userEvent.setup().click(screen.getByRole('button', { name: 'Open the link' }))
    await vi.waitFor(() => expect(env.state().phase).toBe('onboarding'))
    expect(env.toast).not.toHaveBeenCalled()
  })

  it('an expired link shows the service’s message', async () => {
    const env = renderAuth('magicSent', {
      auth: localAuth(),
      viewData: { email: 'demo@botanica.app' },
    })
    await userEvent.setup().click(screen.getByRole('button', { name: 'Open the link' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This link has expired. Send a new one.',
    )
    expect(env.state().phase).toBe('signedout')
  })

  it('Open the link is disabled while the link is being opened', async () => {
    let finish: () => void = () => {}
    const completeMagicLink = vi.fn(
      () =>
        new Promise<never>((_, reject) => {
          finish = () => reject(new Error('stop'))
        }),
    )
    const env = renderAuth('magicSent', {
      auth: fakeAuth({ completeMagicLink }),
      viewData: { email: 'demo@botanica.app' },
    })
    const btn = screen.getByRole('button', { name: 'Open the link' })
    await userEvent.setup().click(btn)
    expect(btn).toBeDisabled()
    finish()
    await vi.waitFor(() => expect(env.state().busy).toBe(false))
    expect(btn).toBeEnabled()
  })

  it('arriving from sign-in, the dialog focuses Open the link', async () => {
    const sendMagicLink = vi.fn(() => Promise.resolve())
    const env = makeEnv('signin', {
      auth: fakeAuth({ sendMagicLink }),
      viewData: { email: 'demo@botanica.app' },
    })
    renderIn(env, <AccountDialog />)
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: 'Email me a sign-in link instead' }))
    const btn = await screen.findByRole('button', { name: 'Open the link' })
    expect(sendMagicLink).toHaveBeenCalledWith('demo@botanica.app')
    expect(btn).toBeEnabled()
    expect(document.activeElement).toBe(btn)
  })
})

describe('ProviderScreen', () => {
  it('renders Continue with the provider, its note, fields and button', () => {
    renderAuth('provider', { viewData: { provider: 'Apple', email: '' } })
    expect(screen.getByRole('heading', { name: 'Continue with Apple' })).toHaveAttribute(
      'id',
      'acct-title',
    )
    expect(
      screen.getByText(
        'In the real app this opens Apple’s own sign-in window. The prototype stands in for it here: enter the account to use.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Apple account email')).toHaveAttribute('data-autofocus', '1')
    expect(screen.getByLabelText('Name on that account')).toHaveAccessibleDescription(
      'Used only when this creates a new Botanica account.',
    )
    expect(screen.getByRole('button', { name: 'Continue with Apple' })).toBeInTheDocument()
  })

  it('defaults to Google, signs in, closes the dialog and toasts Signed in with Google', async () => {
    const signInWithProvider = vi.fn(() =>
      Promise.resolve({ session: demoSession, user: demoUser, isNew: false }),
    )
    const env = renderAuth('provider', { auth: fakeAuth({ signInWithProvider }) })
    await seedGarden(env)
    const u = userEvent.setup()
    await u.type(screen.getByLabelText('Google account email'), 'demo@botanica.app')
    await u.type(screen.getByLabelText('Name on that account'), 'Demo Gardener')
    await u.click(screen.getByRole('button', { name: 'Continue with Google' }))
    await vi.waitFor(() => expect(env.state().panelOpen).toBe(false))
    expect(signInWithProvider).toHaveBeenCalledWith('Google', {
      email: 'demo@botanica.app',
      name: 'Demo Gardener',
    })
    expect(env.state().phase).toBe('cloud')
    expect(env.toast).toHaveBeenCalledWith('Signed in with Google')
  })

  it('a new account from the provider goes to onboarding without a toast', async () => {
    const signInWithProvider = vi.fn(() =>
      Promise.resolve({ session: demoSession, user: demoUser, isNew: true }),
    )
    const env = renderAuth('provider', {
      auth: fakeAuth({ signInWithProvider }),
      viewData: { provider: 'Apple', email: 'demo@botanica.app', name: 'Demo Gardener' },
    })
    await userEvent.setup().click(screen.getByRole('button', { name: 'Continue with Apple' }))
    await vi.waitFor(() => expect(env.state().phase).toBe('onboarding'))
    expect(signInWithProvider).toHaveBeenCalledWith('Apple', {
      email: 'demo@botanica.app',
      name: 'Demo Gardener',
    })
    expect(env.toast).not.toHaveBeenCalled()
  })

  it('an invalid email shows the service’s message under the field', async () => {
    renderAuth('provider', { auth: localAuth(), viewData: { provider: 'Google', email: 'x' } })
    await userEvent.setup().click(screen.getByRole('button', { name: 'Continue with Google' }))
    const err = await screen.findByText('Enter a valid email address.')
    expect(err).toHaveAttribute('id', 'auth-email-err')
  })

  it('Back returns to the sign-in view', async () => {
    const env = renderAuth('provider', { viewData: { provider: 'Google' } })
    await userEvent.setup().click(screen.getByRole('button', { name: 'Back' }))
    expect(env.state().view).toBe('signin')
  })
})
