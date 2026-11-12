import { useAtomValue, useStore } from 'jotai'
import type { FormEvent } from 'react'
import { useAuthEnv } from './authEnv'
import { busyAtom, viewDataAtom } from '@/store/account'
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

/** The 6-digit email confirmation after sign-up; success starts onboarding (spec Screens.verify). */
export function VerifyScreen() {
  const { account, auth } = useAuthEnv()
  const store = useStore()
  const email = useAtomValue(viewDataAtom).email ?? ''
  const notice = useAtomValue(viewDataAtom).notice

  const submit = (code?: string) =>
    void account.run(async () => {
      const typed = code ?? store.get(viewDataAtom).code ?? ''
      const r = await auth.verifyEmail({ email, code: typed.replace(/\s/g, '') })
      // The form is done: the button should not read "Please wait…" while the session loads.
      store.set(busyAtom, false)
      await account.beginSession(r.user, r.session, { isNew: true })
    })

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    submit()
  }

  return (
    <div className="auth-screen">
      <AuthHeader title="Check your email" />
      <p className="auth-sub center">
        {'Enter the 6-digit code we sent to '}
        <b>{email}</b>. It expires in 10 minutes.
      </p>
      {notice ? <div className="auth-banner info">{notice}</div> : <Banner />}
      <ProtoInbox email={email} purpose="verify" />
      <form className="auth-form" noValidate onSubmit={onSubmit}>
        <OtpInput name="code" onComplete={submit} />
        <FormError />
        <SubmitButton>Verify email</SubmitButton>
      </form>
      <ResendRow email={email} purpose="verify" />
      <p className="auth-foot">
        <LinkButton onClick={() => account.goView('signup', { banner: null })}>
          Use a different email
        </LinkButton>
      </p>
    </div>
  )
}
