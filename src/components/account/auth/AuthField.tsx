import { useAtomValue } from 'jotai'
import { useState, type ChangeEvent } from 'react'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group'
import { textPatch, useAuthEnv, type TextKey } from './authEnv'
import { viewDataAtom } from '@/store/account'
import { AUTH_INPUT, EyeIcon, EyeOffIcon } from './AuthPieces'

export interface AuthFieldProps {
  name: TextKey
  label: string
  type?: 'text' | 'email' | 'password'
  autoComplete?: string
  placeholder?: string
  hint?: string
  /** Marks the input as the one the dialog focuses when this screen opens. */
  autoFocus?: boolean
}

/** The label above every auth field. */
export const AUTH_LABEL = 'text-[12.5px] font-semibold text-ink-deep'

/**
 * A labelled text, email or password input bound to viewData[name]. Errors come from
 * viewData.fieldErrors[name]; a password field gets the show/hide eye toggle.
 */
export function AuthField({
  name,
  label,
  type = 'text',
  autoComplete,
  placeholder,
  hint,
  autoFocus,
}: AuthFieldProps) {
  const { account } = useAuthEnv()
  const value = useAtomValue(viewDataAtom)[name] ?? ''
  const err = useAtomValue(viewDataAtom).fieldErrors?.[name]
  const [shown, setShown] = useState(false)
  const id = `auth-${name}`
  const isPassword = type === 'password'

  const inputProps = {
    id,
    name,
    type: isPassword && shown ? 'text' : type,
    autoComplete,
    placeholder,
    value,
    onChange: (e: ChangeEvent<HTMLInputElement>) =>
      account.setViewData(textPatch(name, e.target.value)),
    'aria-invalid': err ? true : undefined,
    'aria-describedby': err ? `${id}-err` : hint ? `${id}-hint` : undefined,
    'data-autofocus': autoFocus ? '1' : undefined,
    spellCheck: type === 'email' ? false : undefined,
  }

  return (
    <Field data-invalid={err ? true : undefined} className="gap-1.5">
      <FieldLabel htmlFor={id} className={AUTH_LABEL}>
        {label}
      </FieldLabel>
      {isPassword ? (
        <InputGroup className={AUTH_INPUT}>
          <InputGroupInput {...inputProps} className="px-3" />
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              size="icon-sm"
              className="text-ink-umber"
              aria-label={shown ? 'Hide password' : 'Show password'}
              onClick={() => setShown((v) => !v)}
            >
              {shown ? <EyeOffIcon /> : <EyeIcon />}
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      ) : (
        <Input {...inputProps} className={`${AUTH_INPUT} px-3`} />
      )}
      {err ? (
        <FieldError id={`${id}-err`} className="text-xs">
          {err}
        </FieldError>
      ) : (
        hint && (
          <FieldDescription id={`${id}-hint`} className="text-[11.5px]">
            {hint}
          </FieldDescription>
        )
      )}
    </Field>
  )
}
