import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { useAccount } from '@/components/account/auth/authEnv'
import { AuthScreen } from '@/components/account/auth/AuthScreen'
import { demoSession, demoUser, makeEnv, renderIn } from '../auth/authHarness'

function CurrentScreen() {
  const view = useAccount((s) => s.view)
  return <AuthScreen view={view} />
}

/** A brand-new account straight after email verification: phase onboarding, panel open. */
async function onboard(user = demoUser) {
  const env = makeEnv('signin')
  await act(() => env.store.getState().beginSession(user, demoSession, { isNew: true }))
  renderIn(env, <CurrentScreen />)
  const createGarden = vi.spyOn(env.store.getState(), 'createGarden')
  return { env, createGarden }
}

describe('OnboardingScreen', () => {
  it('greets by first name and renders its copy, name field and Start from options', async () => {
    await onboard()
    expect(screen.getByRole('heading', { name: 'Welcome, Demo' })).toHaveAttribute(
      'id',
      'acct-title',
    )
    expect(
      screen.getByText(
        'Your email is confirmed. Set up your first terrarium; you can add more any time.',
      ),
    ).toBeInTheDocument()
    const name = screen.getByLabelText('Name your terrarium')
    expect(name).toHaveAttribute('placeholder', 'My terrarium')
    expect(name).toHaveAttribute('data-autofocus', '1')
    const group = screen.getByRole('radiogroup', { name: 'Start from' })
    expect(group).toBeInTheDocument()
    const radios = screen.getAllByRole('radio')
    expect(radios.map((r) => r.textContent)).toEqual([
      'What’s on screen nowKeep the build you’ve been working on',
      'Falls Lake paludariumWaterfall, moss wall, pool and a cleanup crew',
      'An empty tankStart from bare substrate',
    ])
    expect(screen.getByRole('button', { name: 'Start growing' })).toHaveAttribute('type', 'submit')
  })

  it('says "Welcome, there" when the account has no name', async () => {
    await onboard({ ...demoUser, name: '' })
    expect(screen.getByRole('heading', { name: 'Welcome, there' })).toBeInTheDocument()
  })

  it('onboarding defaults to "What’s on screen now" and saves with the typed name', async () => {
    const { env, createGarden } = await onboard()
    expect(screen.getByRole('radio', { name: /What’s on screen now/ })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect(screen.getByRole('radio', { name: /Falls Lake paludarium/ })).toHaveAttribute(
      'aria-checked',
      'false',
    )
    const u = userEvent.setup()
    await u.type(screen.getByLabelText('Name your terrarium'), 'Fern Hollow')
    await u.click(screen.getByRole('button', { name: 'Start growing' }))
    await vi.waitFor(() => expect(env.store.getState().phase).toBe('cloud'))
    expect(createGarden).toHaveBeenCalledWith('current', 'Fern Hollow')
    expect(env.store.getState().panelOpen).toBe(false)
    expect(env.store.getState().busy).toBe(false)
    expect(env.toast).toHaveBeenCalledWith('Fern Hollow is saved to your account')
    const saved = await env.backend.listGardens()
    expect(saved.map((g) => g.name)).toEqual(['Fern Hollow'])
    expect(env.store.getState().activeId).toBe(saved[0]?.id)
  })

  it('onboarding with an empty name saves "My terrarium" and toasts the saved message', async () => {
    const { env, createGarden } = await onboard()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Start growing' }))
    await vi.waitFor(() => expect(env.store.getState().phase).toBe('cloud'))
    expect(createGarden).toHaveBeenCalledWith('current', 'My terrarium')
    expect(env.toast).toHaveBeenCalledWith('My terrarium is saved to your account')
    expect((await env.backend.listGardens()).map((g) => g.name)).toEqual(['My terrarium'])
  })

  it('choosing another start passes it to createGarden', async () => {
    const { env, createGarden } = await onboard()
    const u = userEvent.setup()
    await u.click(screen.getByRole('radio', { name: /An empty tank/ }))
    expect(screen.getByRole('radio', { name: /An empty tank/ })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect(screen.getByRole('radio', { name: /What’s on screen now/ })).toHaveAttribute(
      'aria-checked',
      'false',
    )
    await u.type(screen.getByLabelText('Name your terrarium'), 'Bare')
    await u.click(screen.getByRole('button', { name: 'Start growing' }))
    await vi.waitFor(() => expect(env.store.getState().phase).toBe('cloud'))
    expect(createGarden).toHaveBeenCalledWith('empty', 'Bare')
  })
})
