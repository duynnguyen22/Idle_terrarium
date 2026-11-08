import type { FormEvent } from 'react'
import { useAccount, useAuthEnv } from './authEnv'
import { AuthField } from './AuthField'
import { AuthHeader, FormError, LinkButton, SubmitButton } from './AuthPieces'

/** Stands in for Google's or Apple's own sign-in window (spec Screens.provider). */
export function ProviderScreen() {
  const { store, auth, toast } = useAuthEnv()
  const p = useAccount((s) => s.viewData.provider || 'Google')

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    void store.getState().run(async () => {
      const v = store.getState().viewData
      const r = await auth.signInWithProvider(p, { email: v.email ?? '', name: v.name ?? '' })
      // The form is done: the button should not read "Please wait…" while the session loads.
      store.setState({ busy: false })
      await store.getState().beginSession(r.user, r.session, { isNew: r.isNew })
      if (store.getState().phase === 'cloud') {
        store.getState().closePanel()
        toast(`Signed in with ${p}`)
      }
    })
  }

  return (
    <div className="auth-screen">
      <AuthHeader title={`Continue with ${p}`} />
      <p className="auth-proto">
        {`In the real app this opens ${p}’s own sign-in window. The prototype stands in for it here: enter the account to use.`}
      </p>
      <form className="auth-form" noValidate onSubmit={onSubmit}>
        <AuthField
          name="email"
          label={`${p} account email`}
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          autoFocus
        />
        <AuthField
          name="name"
          label="Name on that account"
          autoComplete="name"
          hint="Used only when this creates a new Botanica account."
        />
        <FormError />
        <SubmitButton>{`Continue with ${p}`}</SubmitButton>
      </form>
      <p className="auth-foot">
        <LinkButton onClick={() => store.getState().goView('signin')}>Back</LinkButton>
      </p>
    </div>
  )
}
