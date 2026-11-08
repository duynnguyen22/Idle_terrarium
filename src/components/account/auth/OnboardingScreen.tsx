import type { FormEvent } from 'react'
import { EnvOptionList, type EnvOption } from '@/components/catalog/EnvOptionList'
import { CLEARED_ACCOUNT_FORM, type GardenStart } from '@/store/useAccountStore'
import { useAccount, useAuthEnv } from './authEnv'
import { AuthField } from './AuthField'
import { AuthHeader, FormError, LinkButton, SubmitButton } from './AuthPieces'

const START_OPTIONS: EnvOption<GardenStart>[] = [
  { id: 'current', name: 'What’s on screen now', sub: 'Keep the build you’ve been working on' },
  {
    id: 'falls',
    name: 'Falls Lake paludarium',
    sub: 'Waterfall, moss wall, pool and a cleanup crew',
  },
  { id: 'empty', name: 'An empty tank', sub: 'Start from bare substrate' },
]

const SIGNED_OUT_TEXT = 'You’re signed out. Your build stays in this browser.'

/** The first terrarium after sign-up; it must finish before the dialog can close (spec Screens.onboarding). */
export function OnboardingScreen() {
  const { store, auth, toast } = useAuthEnv()
  const first = useAccount((s) => (s.user?.name ?? '').split(' ')[0] || 'there')
  const start = useAccount((s) => s.viewData.start ?? 'current')
  const failed = useAccount((s) => !!s.viewData.error && !s.busy)

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    void store.getState().run(async () => {
      const v = store.getState().viewData
      const garden = await store
        .getState()
        .createGarden(v.start ?? 'current', v.gname || 'My terrarium')
      store.setState({ busy: false })
      store.getState().closePanel()
      toast(`${garden.name} is saved to your account`)
    })
  }

  // The dialog cannot close during onboarding, so a create that keeps failing (storage full) needs
  // a way out: signing out keeps the build on screen and offers onboarding again at the next sign in.
  const signOut = () =>
    void store.getState().run(async () => {
      const email = store.getState().user?.email
      await auth.signOut()
      // Same order as Sign out: clear busy and move to sign in before ending the session.
      store.setState({ busy: false })
      store.getState().goView('signin', {
        ...CLEARED_ACCOUNT_FORM,
        gname: '',
        start: undefined,
        email,
        password: '',
        banner: { kind: 'success', text: SIGNED_OUT_TEXT },
      })
      await store.getState().endSession('Signed out')
    })

  return (
    <div className="auth-screen">
      <AuthHeader
        title={`Welcome, ${first}`}
        sub="Your email is confirmed. Set up your first terrarium; you can add more any time."
      />
      <form className="auth-form" noValidate onSubmit={onSubmit}>
        <AuthField name="gname" label="Name your terrarium" placeholder="My terrarium" autoFocus />
        <div className="auth-field">
          <span className="auth-label">Start from</span>
          <EnvOptionList
            label="Start from"
            options={START_OPTIONS}
            value={start}
            onChange={(id) => store.getState().setViewData({ start: id })}
          />
        </div>
        <FormError />
        <SubmitButton>Start growing</SubmitButton>
      </form>
      {failed && (
        <p className="auth-foot">
          <LinkButton onClick={signOut}>Sign out for now</LinkButton>
        </p>
      )}
    </div>
  )
}
