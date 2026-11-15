import { useAtomValue, useStore } from 'jotai'
import { useAuthEnv } from './authEnv'
import { viewDataAtom } from '@/services/account'
import { LinkButton } from './AuthPieces'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldLabel } from '@/components/ui/field'

/** The "Keep me signed in" checkbox and the "Forgot password?" link on the sign-in form. */
export function SignInRememberRow() {
  const { account } = useAuthEnv()
  const store = useStore()
  const remember = useAtomValue(viewDataAtom).remember ?? true
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <Field orientation="horizontal" className="w-auto gap-2">
        <Checkbox
          id="auth-remember"
          checked={remember}
          onCheckedChange={(c) => account.setViewData({ remember: c === true })}
        />
        <FieldLabel htmlFor="auth-remember" className="text-[12.5px] font-normal text-ink-soft">
          Keep me signed in
        </FieldLabel>
      </Field>
      <LinkButton
        onClick={() => account.goView('forgot', { email: store.get(viewDataAtom).email })}
      >
        Forgot password?
      </LinkButton>
    </div>
  )
}
