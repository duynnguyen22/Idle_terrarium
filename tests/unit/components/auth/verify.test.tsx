import { act, fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { demoSession, demoUser, fakeAuth, renderAuth } from './authHarness'

afterEach(() => {
  vi.useRealTimers()
})

describe('VerifyScreen', () => {
  it('verify shows the prototype inbox code and auto-submits when complete', async () => {
    const verifyEmail = vi.fn(() =>
      Promise.resolve({ session: demoSession, user: demoUser, isNew: true as const }),
    )
    const auth = fakeAuth({
      verifyEmail,
      devCode: (email) => (email === 'demo@botanica.app' ? '482913' : null),
    })
    const env = renderAuth('verify', {
      auth,
      viewData: { email: 'demo@botanica.app', code: '', resendAt: Date.now() + 30_000 },
    })
    const u = userEvent.setup()
    expect(screen.getByRole('heading', { name: 'Check your email' })).toHaveAttribute(
      'id',
      'acct-title',
    )
    expect(
      screen.getByText(
        (_, el) =>
          el?.tagName === 'P' &&
          el.textContent ===
            'Enter the 6-digit code we sent to demo@botanica.app. It expires in 10 minutes.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('Prototype inbox')).toBeInTheDocument()
    expect(screen.getByText('482913').tagName).toBe('B')
    await u.click(screen.getByLabelText('Digit 1'))
    await u.keyboard('482913')
    await vi.waitFor(() => expect(env.state().phase).toBe('onboarding'))
    expect(verifyEmail).toHaveBeenCalledTimes(1)
    expect(verifyEmail).toHaveBeenCalledWith({ email: 'demo@botanica.app', code: '482913' })
  })

  it('resend before 30 s shows the countdown text, after it the Send it again link', async () => {
    vi.useFakeTimers({ now: Date.UTC(2026, 10, 8, 12) })
    const resendCode = vi.fn(() => Promise.resolve())
    renderAuth('verify', {
      auth: fakeAuth({ resendCode }),
      viewData: { email: 'linh@example.com', code: '', resendAt: Date.now() + 30_000 },
    })
    const row = () => screen.getByText(/Didn’t get it\?/)
    expect(row()).toHaveTextContent('Didn’t get it? You can send another in 30 s.')
    expect(screen.queryByRole('button', { name: 'Send it again' })).toBeNull()
    await act(() => vi.advanceTimersByTimeAsync(10_000))
    expect(row()).toHaveTextContent('Didn’t get it? You can send another in 20 s.')
    await act(() => vi.advanceTimersByTimeAsync(20_000))
    expect(row()).toHaveTextContent(/^Didn’t get it\? Send it again$/)
    // user-event's async wrapper waits on a real timeout, so fake-timer tests use fireEvent.
    fireEvent.click(screen.getByRole('button', { name: 'Send it again' }))
    await act(() => vi.advanceTimersByTimeAsync(0))
    expect(resendCode).toHaveBeenCalledWith('linh@example.com', 'verify')
    expect(screen.getByRole('status')).toHaveTextContent('We sent a new code to linh@example.com.')
    expect(row()).toHaveTextContent('Didn’t get it? You can send another in 30 s.')
  })
})
