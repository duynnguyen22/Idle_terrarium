import { useState } from 'react'
import { textPatch, useAccount, useAuthEnv, type TextKey } from './authEnv'
import { EyeIcon, EyeOffIcon } from './AuthPieces'

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

/**
 * A labelled text, email or password input bound to viewData[name] (spec field()). Errors come
 * from viewData.fieldErrors[name]; a password field gets the show/hide eye toggle.
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
  const { store } = useAuthEnv()
  const value = useAccount((s) => s.viewData[name] ?? '')
  const err = useAccount((s) => s.viewData.fieldErrors?.[name])
  const [shown, setShown] = useState(false)
  const id = `auth-${name}`
  const isPassword = type === 'password'

  const input = (
    <input
      id={id}
      name={name}
      type={isPassword && shown ? 'text' : type}
      className={`auth-input${err ? ' has-error' : ''}`}
      autoComplete={autoComplete}
      placeholder={placeholder}
      value={value}
      onChange={(e) => store.getState().setViewData(textPatch(name, e.target.value))}
      aria-invalid={err ? true : undefined}
      aria-describedby={err ? `${id}-err` : hint ? `${id}-hint` : undefined}
      data-autofocus={autoFocus ? '1' : undefined}
      spellCheck={type === 'email' ? false : undefined}
    />
  )

  return (
    <div className="auth-field">
      <label htmlFor={id} className="auth-label">
        {label}
      </label>
      {isPassword ? (
        <div className="auth-pw">
          {input}
          <button
            type="button"
            className="auth-eye"
            aria-label={shown ? 'Hide password' : 'Show password'}
            onClick={() => setShown((v) => !v)}
          >
            {shown ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
      ) : (
        input
      )}
      {err ? (
        <p id={`${id}-err`} className="auth-err">
          {err}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="auth-hint">
            {hint}
          </p>
        )
      )}
    </div>
  )
}
