import type { FormEvent } from 'react'
import { useAccount, useAuthEnv } from './authEnv'
import { AuthField } from './AuthField'
import {
  AuthHeader,
  Banner,
  FormError,
  LinkButton,
  ProtoInbox,
  ResendRow,
  SubmitButton,
} from './AuthPieces'
import { OtpInput } from './OtpInput'
import { StrengthBlock } from './StrengthBlock'

/** The emailed reset code plus a new password (spec Screens.reset). */
export function ResetScreen() {
  const { store, auth } = useAuthEnv()
  const email = useAccount((s) => s.viewData.email ?? '')

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    void store.getState().run(async () => {
      const v = store.getState().viewData
      await auth.resetPassword({
        email,
        code: (v.code ?? '').replace(/\s/g, ''),
        password: v.password ?? '',
      })
      store.setState({ busy: false })
      store.getState().goView('resetDone', { password: '' })
    })
  }

  return (
    <div className="auth-screen">
      <AuthHeader title="Set a new password" />
      <p className="auth-sub center">
        {'If an account exists for '}
        <b>{email}</b>, a code is on its way.
      </p>
      <Banner />
      <ProtoInbox email={email} purpose="reset" />
      <form className="auth-form" noValidate onSubmit={onSubmit}>
        <p className="auth-label">Code from the email</p>
        <OtpInput name="code" />
        <AuthField
          name="password"
          label="New password"
          type="password"
          autoComplete="new-password"
        />
        <StrengthBlock name="password" />
        <FormError />
        <SubmitButton>Update password</SubmitButton>
      </form>
      <ResendRow email={email} purpose="reset" />
      <p className="auth-foot">
        <LinkButton onClick={() => store.getState().goView('signin')}>Back to sign in</LinkButton>
      </p>
    </div>
  )
}
