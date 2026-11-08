import { act, fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthError } from '@/auth'
import { demoSession, demoUser, fakeAuth, renderAuth } from './authHarness'

afterEach(() => {
  vi.useRealTimers()
})

describe('SignInScreen', () => {
  it('sign in with demo credentials closes the dialog and toasts Welcome back, Demo', async () => {
    const signIn = vi.fn(() => Promise.resolve({ session: demoSession, user: demoUser }))
    const auth = fakeAuth({ signIn })
    const env = renderAuth('signin', { auth })
    await env.backend.saveGarden('g_1', {
      name: 'My terrarium',
      createdAt: 1,
      updatedAt: 2,
      summary: { vessel: 'globe', day: 1, plants: 0, animals: 0 },
      snapshot: null,
    })
    // The button stops reading "Please wait…" before the session starts loading.
    const busyAtLoad: boolean[] = []
    const getProfile = env.backend.getProfile.bind(env.backend)
    vi.spyOn(env.backend, 'getProfile').mockImplementation(() => {
      busyAtLoad.push(env.store.getState().busy)
      return getProfile()
    })
    const u = userEvent.setup()
    expect(screen.getByRole('heading', { name: 'Welcome back' })).toHaveAttribute(
      'id',
      'acct-title',
    )
    expect(screen.getByLabelText('Email')).toHaveAttribute('placeholder', 'you@example.com')
    expect(screen.getByLabelText('Keep me signed in')).toBeChecked()
    await u.type(screen.getByLabelText('Email'), 'demo@botanica.app')
    await u.type(screen.getByLabelText('Password'), 'terrarium1')
    await u.click(screen.getByRole('button', { name: 'Sign in' }))
    await vi.waitFor(() => expect(env.store.getState().panelOpen).toBe(false))
    expect(signIn).toHaveBeenCalledWith({
      email: 'demo@botanica.app',
      password: 'terrarium1',
      remember: true,
    })
    expect(env.store.getState().phase).toBe('cloud')
    expect(env.toast).toHaveBeenCalledWith('Welcome back, Demo')
    expect(busyAtLoad).toEqual([false])
  })

  it('sign in error on the email field shows under the input and marks it invalid', async () => {
    const auth = fakeAuth({
      signIn: vi.fn(() =>
        Promise.reject(
          new AuthError('no_account', 'There’s no account with this email.', { field: 'email' }),
        ),
      ),
    })
    renderAuth('signin', { auth })
    const u = userEvent.setup()
    await u.type(screen.getByLabelText('Email'), 'nobody@example.com')
    await u.type(screen.getByLabelText('Password'), 'whatever1')
    await u.click(screen.getByRole('button', { name: 'Sign in' }))
    const err = await screen.findByText('There’s no account with this email.')
    expect(err).toHaveAttribute('id', 'auth-email-err')
    const input = screen.getByLabelText('Email')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAttribute('aria-describedby', 'auth-email-err')
  })

  it('lockout shows the countdown alert', async () => {
    vi.useFakeTimers()
    const auth = fakeAuth({
      signIn: vi.fn(() =>
        Promise.reject(
          new AuthError('locked', 'Too many attempts.', { until: Date.now() + 60_000 }),
        ),
      ),
    })
    const env = renderAuth('signin', {
      auth,
      viewData: { email: 'demo@botanica.app', password: 'x' },
    })
    // user-event's async wrapper waits on a real timeout, so fake-timer tests use fireEvent.
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    await act(() => vi.advanceTimersByTimeAsync(0))
    expect(screen.getByRole('alert').textContent).toMatch(/Too many attempts. Try again in 60 s\./)
    await act(() => vi.advanceTimersByTimeAsync(1000))
    expect(screen.getByRole('alert')).toHaveTextContent('Too many attempts. Try again in 59 s.')
    await act(() => vi.advanceTimersByTimeAsync(59_000))
    expect(screen.queryByRole('alert')).toBeNull()
    expect(env.store.getState().viewData.lockedUntil).toBe(0)
  })
})
