import { useAtomValue } from 'jotai'
import { useAuthEnv } from './authEnv'
import { viewDataAtom } from '@/services/account'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'

/** The terms checkbox on the sign-up form, with its error line. */
export function SignUpTermsField() {
  const { account } = useAuthEnv()
  const terms = useAtomValue(viewDataAtom).terms ?? false
  const termsError = useAtomValue(viewDataAtom).fieldErrors?.terms
  return (
    <>
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
    </>
  )
}
