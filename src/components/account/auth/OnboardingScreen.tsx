import { useAtomValue, useStore } from 'jotai'
import type { FormEvent } from 'react'
import { EnvOptionList, type EnvOption } from '@/components/catalog/EnvOptionList'
import {
  busyAtom,
  CLEARED_ACCOUNT_FORM,
  type GardenStart,
  userAtom,
  viewDataAtom,
} from '@/store/account'
import { useAuthEnv } from './authEnv'
import { AUTH_LABEL, AuthField } from './AuthField'
import {
  AUTH_FORM,
  AUTH_SCREEN,
  AuthFoot,
  AuthHeader,
  FormError,
  LinkButton,
  SubmitButton,
} from './AuthPieces'
import { Field, FieldGroup, FieldTitle } from '@/components/ui/field'

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
  const { account, auth, toast } = useAuthEnv()
  const store = useStore()
  const first = (useAtomValue(userAtom)?.name ?? '').split(' ')[0] || 'there'
  const viewData = useAtomValue(viewDataAtom)
  const busy = useAtomValue(busyAtom)
  const start = viewData.start ?? 'current'
  const failed = !!viewData.error && !busy

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    void account.run(async () => {
      const v = store.get(viewDataAtom)
      const garden = await account.createGarden(v.start ?? 'current', v.gname || 'My terrarium')
      store.set(busyAtom, false)
      account.closePanel()
      toast(`${garden.name} is saved to your account`)
    })
  }

  // The dialog cannot close during onboarding, so a create that keeps failing (storage full) needs
  // a way out: signing out keeps the build on screen and offers onboarding again at the next sign in.
  const signOut = () =>
    void account.run(async () => {
      const email = store.get(userAtom)?.email
      await auth.signOut()
      // Same order as Sign out: clear busy and move to sign in before ending the session.
      store.set(busyAtom, false)
      account.goView('signin', {
        ...CLEARED_ACCOUNT_FORM,
        gname: '',
        start: undefined,
        email,
        password: '',
        banner: { kind: 'success', text: SIGNED_OUT_TEXT },
      })
      await account.endSession('Signed out')
    })

  return (
    <div className={AUTH_SCREEN}>
      <AuthHeader
        title={`Welcome, ${first}`}
        sub="Your email is confirmed. Set up your first terrarium; you can add more any time."
      />
      <form noValidate onSubmit={onSubmit}>
        <FieldGroup className={AUTH_FORM}>
          <AuthField
            name="gname"
            label="Name your terrarium"
            placeholder="My terrarium"
            autoFocus
          />
          <Field className="gap-1.5">
            <FieldTitle className={AUTH_LABEL}>Start from</FieldTitle>
            <EnvOptionList
              label="Start from"
              options={START_OPTIONS}
              value={start}
              onChange={(id) => account.setViewData({ start: id })}
            />
          </Field>
          <FormError />
          <SubmitButton>Start growing</SubmitButton>
        </FieldGroup>
      </form>
      {failed && (
        <AuthFoot>
          <LinkButton onClick={signOut}>Sign out for now</LinkButton>
        </AuthFoot>
      )}
    </div>
  )
}
