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
import { StrengthBlock } from './StrengthBlock'

const TERMS_ERROR = 'Accept the terms to continue.'

/** New account with name, email and password; leads to email verification (spec Screens.signup). */
export function SignUpScreen() {
  const { store, auth } = useAuthEnv()
  const terms = useAccount((s) => s.viewData.terms ?? false)
  const termsError = useAccount((s) => s.viewData.fieldErrors?.terms)

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!store.getState().viewData.terms) {
      store.getState().setViewData({ fieldErrors: { terms: TERMS_ERROR } })
      return
    }
    void store.getState().run(async () => {
      const v = store.getState().viewData
      const r = await auth.signUp({
        name: v.name ?? '',
        email: v.email ?? '',
        password: v.password ?? '',
      })
      store.getState().goView('verify', {
        email: r.email,
        resendAt: Date.now() + RESEND_WINDOW_MS,
        code: '',
        banner: null,
      })
    })
  }

  return (
    <div className="auth-screen">
      <AuthHeader
        title="Create your account"
        sub="Save your terrariums, track their growth and pick up on any device."
      />
      <Banner />
      <Providers mode="signup" />
      <Divider>or sign up with email</Divider>
      <form className="auth-form" noValidate onSubmit={onSubmit}>
        <AuthField
          name="name"
          label="Your name"
          autoComplete="name"
          placeholder="Linh Tran"
          autoFocus
        />
        <AuthField
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
        />
        <AuthField name="password" label="Password" type="password" autoComplete="new-password" />
        <StrengthBlock name="password" />
        <label className={`auth-check${termsError ? ' has-error' : ''}`}>
          <input
            type="checkbox"
            id="auth-terms"
            checked={terms}
            aria-invalid={termsError ? true : undefined}
            aria-describedby={termsError ? 'auth-terms-err' : undefined}
            onChange={(e) => store.getState().setViewData({ terms: e.target.checked })}
          />
          I agree to the Terms of Service and Privacy Policy
        </label>
        {termsError && (
          <p id="auth-terms-err" className="auth-err">
            {termsError}
          </p>
        )}
        <FormError />
        <SubmitButton>Create account</SubmitButton>
      </form>
      <p className="auth-foot">
        {'Already have an account? '}
        <LinkButton onClick={() => store.getState().goView('signin', { banner: null })}>
          Sign in
        </LinkButton>
      </p>
      <ProtoNote />
    </div>
  )
}
