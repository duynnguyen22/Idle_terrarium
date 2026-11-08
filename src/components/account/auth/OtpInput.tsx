import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react'
import { textPatch, useAccount, useAuthEnv, type TextKey } from './authEnv'

const LEN = 6

/**
 * Six single-digit boxes bound to viewData[name] (spec otpInput, 4723-4760). Typing advances,
 * pasting or autofilling a code fills from the box onward, Backspace on an empty box steps back,
 * and the arrow keys move. `onComplete` fires once all six digits are in.
 */
export function OtpInput({
  name,
  onComplete,
}: {
  name: TextKey
  onComplete?: (code: string) => void
}) {
  const { store } = useAuthEnv()
  const value = useAccount((s) => s.viewData[name] ?? '')
  const err = useAccount((s) => s.viewData.fieldErrors?.[name])
  const boxes = useRef<(HTMLInputElement | null)[]>([])
  // Empty boxes are stored as spaces so each digit keeps its position.
  const digits = Array.from({ length: LEN }, (_, i) => (value[i] ?? '').trim())
  const errId = `auth-${name}-err`

  const focusBox = (i: number) => boxes.current[i]?.focus()

  const commit = (next: string[]) => {
    const code = next
      .map((d) => d || ' ')
      .join('')
      .trimEnd()
    store.getState().setViewData(textPatch(name, code))
    if (/^\d{6}$/.test(code)) onComplete?.(code)
  }

  /** Spreads several digits (a paste or an autofill) from box `i` onward. */
  const fill = (i: number, many: string) => {
    const next = [...digits]
    many
      .slice(0, LEN - i)
      .split('')
      .forEach((d, k) => {
        next[i + k] = d
      })
    commit(next)
    focusBox(Math.min(LEN - 1, i + many.length))
  }

  const onInput = (i: number, raw: string) => {
    const typed = raw.replace(/\D/g, '')
    if (typed.length > 1) {
      fill(i, typed)
      return
    }
    const next = [...digits]
    next[i] = typed
    commit(next)
    if (typed && i < LEN - 1) focusBox(i + 1)
  }

  const onPaste = (i: number, e: ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '')
    e.preventDefault()
    if (pasted) fill(i, pasted)
  }

  const onKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      e.preventDefault()
      const next = [...digits]
      next[i - 1] = ''
      commit(next)
      focusBox(i - 1)
    } else if (e.key === 'ArrowLeft' && i > 0) {
      e.preventDefault()
      focusBox(i - 1)
    } else if (e.key === 'ArrowRight' && i < LEN - 1) {
      e.preventDefault()
      focusBox(i + 1)
    }
  }

  return (
    <div className="auth-field">
      <div
        className={`auth-otp${err ? ' has-error' : ''}`}
        role="group"
        aria-label="Verification code"
        aria-describedby={err ? errId : undefined}
      >
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              boxes.current[i] = el
            }}
            className="auth-otp-box tabular-nums"
            inputMode="numeric"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            maxLength={1}
            aria-label={`Digit ${i + 1}`}
            aria-invalid={err ? true : undefined}
            value={d}
            data-autofocus={i === 0 && !value.trim() ? '1' : undefined}
            onChange={(e) => onInput(i, e.target.value)}
            onPaste={(e) => onPaste(i, e)}
            onKeyDown={(e) => onKeyDown(i, e)}
            onFocus={(e) => e.target.select()}
          />
        ))}
      </div>
      {err && (
        <p id={errId} className="auth-err">
          {err}
        </p>
      )}
    </div>
  )
}
