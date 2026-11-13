import { useAtomValue, useStore } from 'jotai'
import type { FormEvent } from 'react'
import { useAuthEnv } from './authEnv'
import { busyAtom, viewDataAtom } from '@/store/account'
import { AUTH_LABEL, AuthField } from './AuthField'
import {
  AUTH_FORM,
  AUTH_SCREEN,
  AuthFoot,
  AuthHeader,
  AuthSub,
  Banner,
  FormError,
  LinkButton,
  ProtoInbox,
  ResendRow,
  SubmitButton,
} from './AuthPieces'
import { FieldGroup, FieldTitle } from '@/components/ui/field'
import { OtpInput } from './OtpInput'
import { StrengthBlock } from './StrengthBlock'

/** The emailed reset code plus a new password (spec Screens.reset). */
export function ResetScreen() {
  const { account, auth } = useAuthEnv()
  const store = useStore()
  const email = useAtomValue(viewDataAtom).email ?? ''

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    void account.run(async () => {
      const v = store.get(viewDataAtom)
      await auth.resetPassword({
        email,
        code: (v.code ?? '').replace(/\s/g, ''),
        password: v.password ?? '',
      })
      store.set(busyAtom, false)
      account.goView('resetDone', { password: '' })
    })
  }

  return (
    <div className={AUTH_SCREEN}>
      <AuthHeader title="Set a new password" />
      <AuthSub center>
        {'If an account exists for '}
        <b>{email}</b>, a code is on its way.
      </AuthSub>
      <Banner />
      <ProtoInbox email={email} purpose="reset" />
      <form noValidate onSubmit={onSubmit}>
        <FieldGroup className={AUTH_FORM}>
          <FieldTitle className={AUTH_LABEL}>Code from the email</FieldTitle>
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
        </FieldGroup>
      </form>
      <ResendRow email={email} purpose="reset" />
      <AuthFoot>
        <LinkButton onClick={() => account.goView('signin')}>Back to sign in</LinkButton>
      </AuthFoot>
    </div>
  )
}
