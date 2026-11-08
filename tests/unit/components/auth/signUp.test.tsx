import { act, fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fakeAuth, renderAuth } from './authHarness'

afterEach(() => {
  vi.useRealTimers()
})

describe('SignUpScreen', () => {
  it('sign up without accepting the terms does not call the service', async () => {
    const auth = fakeAuth()
    renderAuth('signup', { auth })
    const u = userEvent.setup()
    expect(screen.getByRole('heading', { name: 'Create your account' })).toBeInTheDocument()
    expect(screen.getByText('Password strength')).toBeInTheDocument()
    await u.type(screen.getByLabelText('Your name'), 'Linh Tran')
    await u.type(screen.getByLabelText('Email'), 'linh@example.com')
    await u.type(screen.getByLabelText('Password'), 'garden123')
    expect(screen.queryByText('Password strength')).toBeNull()
    expect(screen.getByText('At least 8 characters').closest('li')).toHaveClass('ok')
    await u.click(screen.getByRole('button', { name: 'Create account' }))
    expect(screen.getByText('Accept the terms to continue.')).toBeInTheDocument()
    expect(auth.signUp).not.toHaveBeenCalled()
  })

  it('sign up moves to verify with the email and a resend countdown', async () => {
    vi.useFakeTimers({ now: Date.UTC(2026, 10, 8, 12) })
    const signUp = vi.fn(() => Promise.resolve({ email: 'linh@example.com' }))
    const env = renderAuth('signup', { auth: fakeAuth({ signUp }) })
    // user-event's async wrapper waits on a real timeout, so fake-timer tests use fireEvent.
    const type = (label: string, value: string) =>
      fireEvent.change(screen.getByLabelText(label), { target: { value } })
    type('Your name', 'Linh Tran')
    type('Email', 'linh@example.com')
    type('Password', 'garden123')
    fireEvent.click(screen.getByLabelText('I agree to the Terms of Service and Privacy Policy'))
    const at = Date.now()
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
    await act(() => vi.advanceTimersByTimeAsync(0))
    expect(signUp).toHaveBeenCalledWith({
      name: 'Linh Tran',
      email: 'linh@example.com',
      password: 'garden123',
    })
    const s = env.store.getState()
    expect(s.view).toBe('verify')
    expect(s.viewData.email).toBe('linh@example.com')
    expect(s.viewData.code).toBe('')
    expect(s.viewData.resendAt).toBeGreaterThanOrEqual(at + 30_000)
    expect(s.viewData.resendAt).toBeLessThan(at + 31_000)
    expect(screen.getByRole('heading', { name: 'Check your email' })).toBeInTheDocument()
    expect(screen.getByText(/You can send another in/)).toHaveTextContent(
      'Didn’t get it? You can send another in 30 s.',
    )
  })
})
