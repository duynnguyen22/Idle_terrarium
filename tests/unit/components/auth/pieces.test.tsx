import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AuthField } from '@/components/account/auth/AuthField'
import { OtpInput } from '@/components/account/auth/OtpInput'
import { makeEnv, renderIn } from './authHarness'

const boxes = () =>
  within(screen.getByRole('group', { name: 'Verification code' })).getAllByRole(
    'textbox',
  ) as HTMLInputElement[]

describe('auth pieces', () => {
  it('OtpInput: pasting 123456 fills every box and calls onComplete', async () => {
    const env = makeEnv('verify')
    const onComplete = vi.fn()
    renderIn(env, <OtpInput name="code" onComplete={onComplete} />)
    const u = userEvent.setup()
    expect(boxes()).toHaveLength(6)
    expect(boxes()[0]).toHaveAttribute('inputmode', 'numeric')
    expect(boxes()[0]).toHaveAccessibleName('Digit 1')
    await u.click(screen.getByLabelText('Digit 1'))
    await u.paste('123456')
    expect(boxes().map((b) => b.value)).toEqual(['1', '2', '3', '4', '5', '6'])
    expect(boxes()[5]).toHaveFocus()
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(onComplete).toHaveBeenCalledWith('123456')
    expect(env.state().viewData.code).toBe('123456')
  })

  it('OtpInput: Backspace on an empty box focuses and clears the previous one', async () => {
    const env = makeEnv('verify')
    renderIn(env, <OtpInput name="code" />)
    const u = userEvent.setup()
    await u.click(screen.getByLabelText('Digit 1'))
    await u.keyboard('12')
    expect(boxes()[2]).toHaveFocus()
    expect(boxes().map((b) => b.value)).toEqual(['1', '2', '', '', '', ''])
    await u.keyboard('{Backspace}')
    expect(boxes()[1]).toHaveFocus()
    expect(boxes().map((b) => b.value)).toEqual(['1', '', '', '', '', ''])
    await u.keyboard('{ArrowLeft}')
    expect(boxes()[0]).toHaveFocus()
    await u.keyboard('{ArrowRight}')
    expect(boxes()[1]).toHaveFocus()
  })

  it('password field eye toggles type and label', async () => {
    const env = makeEnv('signin')
    renderIn(
      env,
      <AuthField
        name="password"
        label="Password"
        type="password"
        autoComplete="current-password"
      />,
    )
    const u = userEvent.setup()
    const input = screen.getByLabelText('Password')
    expect(input).toHaveAttribute('type', 'password')
    expect(input).toHaveAttribute('id', 'auth-password')
    await u.click(screen.getByRole('button', { name: 'Show password' }))
    expect(input).toHaveAttribute('type', 'text')
    await u.click(screen.getByRole('button', { name: 'Hide password' }))
    expect(input).toHaveAttribute('type', 'password')
    expect(screen.getByRole('button', { name: 'Show password' })).toBeInTheDocument()
  })
})
