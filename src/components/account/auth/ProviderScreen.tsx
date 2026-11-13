import { useAtomValue, useStore } from 'jotai'
import type { FormEvent } from 'react'
import { useAuthEnv } from './authEnv'
import { busyAtom, phaseAtom, viewDataAtom } from '@/store/account'
import { AuthField } from './AuthField'
import {
  AUTH_FORM,
  AUTH_SCREEN,
  AuthFoot,
  AuthHeader,
  FormError,
  LinkButton,
  ProtoAlert,
  SubmitButton,
} from './AuthPieces'
import { FieldGroup } from '@/components/ui/field'

/** Stands in for Google's or Apple's own sign-in window (spec Screens.provider). */
export function ProviderScreen() {
  const { account, auth, toast } = useAuthEnv()
  const store = useStore()
  const p = useAtomValue(viewDataAtom).provider || 'Google'

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    void account.run(async () => {
      const v = store.get(viewDataAtom)
      const r = await auth.signInWithProvider(p, { email: v.email ?? '', name: v.name ?? '' })
      // The form is done: the button should not read "Please wait…" while the session loads.
      store.set(busyAtom, false)
      await account.beginSession(r.user, r.session, { isNew: r.isNew })
      if (store.get(phaseAtom) === 'cloud') {
        account.closePanel()
        toast(`Signed in with ${p}`)
      }
    })
  }

  return (
    <div className={AUTH_SCREEN}>
      <AuthHeader title={`Continue with ${p}`} />
      <ProtoAlert>
        {`In the real app this opens ${p}’s own sign-in window. The prototype stands in for it here: enter the account to use.`}
      </ProtoAlert>
      <form noValidate onSubmit={onSubmit}>
        <FieldGroup className={AUTH_FORM}>
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
        </FieldGroup>
      </form>
      <AuthFoot>
        <LinkButton onClick={() => account.goView('signin')}>Back</LinkButton>
      </AuthFoot>
    </div>
  )
}
