import { useAtomValue, useStore } from 'jotai'
import type { FormEvent } from 'react'
import { RESEND_WINDOW_MS, useAuthEnv } from './authEnv'
import { viewDataAtom } from '@/store/account'
import { AuthField } from './AuthField'
import {
  AUTH_FORM,
  AUTH_SCREEN,
  AuthFoot,
  AuthHeader,
  Banner,
  Divider,
  FormError,
  LinkButton,
  ProtoNote,
  Providers,
  SubmitButton,
} from './AuthPieces'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { StrengthBlock } from './StrengthBlock'

const TERMS_ERROR = 'Accept the terms to continue.'

/** New account with name, email and password; leads to email verification (spec Screens.signup). */
export function SignUpScreen() {
  const { account, auth } = useAuthEnv()
  const store = useStore()
  const terms = useAtomValue(viewDataAtom).terms ?? false
  const termsError = useAtomValue(viewDataAtom).fieldErrors?.terms

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!store.get(viewDataAtom).terms) {
      account.setViewData({ fieldErrors: { terms: TERMS_ERROR } })
      return
    }
    void account.run(async () => {
      const v = store.get(viewDataAtom)
      const r = await auth.signUp({
        name: v.name ?? '',
        email: v.email ?? '',
        password: v.password ?? '',
      })
      account.goView('verify', {
        email: r.email,
        resendAt: Date.now() + RESEND_WINDOW_MS,
        code: '',
        banner: null,
      })
    })
  }

  return (
    <div className={AUTH_SCREEN}>
      <AuthHeader
        title="Create your account"
        sub="Save your terrariums, track their growth and pick up on any device."
      />
      <Banner />
      <Providers mode="signup" />
      <Divider>or sign up with email</Divider>
      <form noValidate onSubmit={onSubmit}>
        <FieldGroup className={AUTH_FORM}>
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
          <Field
            orientation="horizontal"
            data-invalid={termsError ? true : undefined}
            className="gap-2"
          >
            <Checkbox
              id="auth-terms"
              checked={terms}
              aria-invalid={termsError ? true : undefined}
              aria-describedby={termsError ? 'auth-terms-err' : undefined}
              onCheckedChange={(c) => account.setViewData({ terms: c === true })}
            />
            <FieldLabel htmlFor="auth-terms" className="text-[12.5px] font-normal text-ink-soft">
              I agree to the Terms of Service and Privacy Policy
            </FieldLabel>
          </Field>
          {termsError && (
            <FieldError id="auth-terms-err" className="-mt-2 text-xs">
              {termsError}
            </FieldError>
          )}
          <FormError />
          <SubmitButton>Create account</SubmitButton>
        </FieldGroup>
      </form>
      <AuthFoot>
        {'Already have an account? '}
        <LinkButton onClick={() => account.goView('signin', { banner: null })}>Sign in</LinkButton>
      </AuthFoot>
      <ProtoNote />
    </div>
  )
}
