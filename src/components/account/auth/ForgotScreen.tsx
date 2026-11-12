import type { FormEvent } from 'react'
import { useStore } from 'jotai'
import { busyAtom, viewDataAtom } from '@/store/account'
import { RESEND_WINDOW_MS, useAuthEnv } from './authEnv'
import { AuthField } from './AuthField'
import { AuthHeader, FormError, LinkButton, SubmitButton } from './AuthPieces'

/** Asks for the account email and sends a password reset code (spec Screens.forgot). */
export function ForgotScreen() {
  const { account, auth } = useAuthEnv()
  const store = useStore()

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    void account.run(async () => {
      await auth.requestPasswordReset(store.get(viewDataAtom).email ?? '')
      store.set(busyAtom, false)
      account.goView('reset', {
        code: '',
        password: '',
        resendAt: Date.now() + RESEND_WINDOW_MS,
        banner: null,
      })
    })
  }

  return (
    <div className="auth-screen">
      <AuthHeader
        title="Reset your password"
        sub="Enter the email you signed up with. We’ll send a code to set a new password."
      />
      <form className="auth-form" noValidate onSubmit={onSubmit}>
        <AuthField
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          autoFocus
        />
        <FormError />
        <SubmitButton>Send reset code</SubmitButton>
      </form>
      <p className="auth-foot">
        <LinkButton onClick={() => account.goView('signin')}>Back to sign in</LinkButton>
      </p>
    </div>
  )
}
