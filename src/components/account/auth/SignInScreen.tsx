import type { FormEvent } from 'react'
import { RESEND_WINDOW_MS, useAccount, useAuthEnv } from './authEnv'
import { AuthField } from './AuthField'
import {
  AuthHeader,
  Banner,
  Divider,
  FormError,
  LinkButton,
  ProtoNote,
  Providers,
  SubmitButton,
} from './AuthPieces'

/** Email and password sign-in (spec Screens.signin). */
export function SignInScreen() {
  const { store, auth, toast } = useAuthEnv()
  const hasEmail = useAccount((s) => !!s.viewData.email)
  const remember = useAccount((s) => s.viewData.remember ?? true)

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    void store.getState().run(async () => {
      const v = store.getState().viewData
      const r = await auth.signIn({
        email: v.email ?? '',
        password: v.password ?? '',
        remember: v.remember ?? true,
      })
      // The form is done: the button should not read "Please wait…" while the session loads.
      store.setState({ busy: false })
      await store.getState().beginSession(r.user, r.session, { isNew: false })
      if (store.getState().phase === 'cloud') {
        store.getState().closePanel()
        toast(`Welcome back, ${r.user.name.split(' ')[0]}`)
      }
    })
  }

  const sendLink = () =>
    void store.getState().run(async () => {
      await auth.sendMagicLink(store.getState().viewData.email ?? '')
      store.getState().goView('magicSent', { resendAt: Date.now() + RESEND_WINDOW_MS })
    })

  const go = store.getState().goView

  return (
    <div className="auth-screen">
      <AuthHeader title="Welcome back" sub="Sign in to keep your terrariums in sync." />
      <Banner />
      <Providers mode="signin" />
      <Divider>or sign in with email</Divider>
      <form className="auth-form" noValidate onSubmit={onSubmit}>
        <AuthField
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          autoFocus={!hasEmail}
        />
        <AuthField
          name="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          autoFocus={hasEmail}
        />
        <div className="auth-row">
          <label className="auth-check">
            <input
              type="checkbox"
              id="auth-remember"
              checked={remember}
              onChange={(e) => store.getState().setViewData({ remember: e.target.checked })}
            />
            Keep me signed in
          </label>
          <LinkButton onClick={() => go('forgot', { email: store.getState().viewData.email })}>
            Forgot password?
          </LinkButton>
        </div>
        <FormError />
        <SubmitButton>Sign in</SubmitButton>
        <LinkButton className="center" onClick={sendLink}>
          Email me a sign-in link instead
        </LinkButton>
      </form>
      <p className="auth-foot">
        {'New to Botanica? '}
        <LinkButton onClick={() => go('signup', { banner: null })}>Create an account</LinkButton>
      </p>
      <ProtoNote />
    </div>
  )
}
