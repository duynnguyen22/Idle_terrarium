import type { ClipboardEvent, KeyboardEvent } from 'react'
import { type TextKey } from './authEnv'
import { Field, FieldError } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

/** The row of single-digit inputs and the error line under it. Handlers come from OtpInput. */
export function OtpDigitBoxes({
  name,
  digits,
  value,
  err,
  registerBox,
  onInput,
  onPaste,
  onKeyDown,
}: {
  name: TextKey
  digits: string[]
  value: string
  err: string | undefined
  registerBox: (i: number, el: HTMLInputElement | null) => void
  onInput: (i: number, raw: string) => void
  onPaste: (i: number, e: ClipboardEvent<HTMLInputElement>) => void
  onKeyDown: (i: number, e: KeyboardEvent<HTMLInputElement>) => void
}) {
  const errId = `auth-${name}-err`
  return (
    <Field data-invalid={err ? true : undefined} className="gap-1.5">
      <div
        className="grid grid-cols-6 gap-2"
        role="group"
        aria-label="Verification code"
        aria-describedby={err ? errId : undefined}
      >
        {digits.map((d, i) => (
          <Input
            key={i}
            ref={(el) => registerBox(i, el)}
            className="h-12 min-w-0 bg-white text-center text-xl font-semibold text-forest-ink tabular-nums md:text-xl"
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
        <FieldError id={errId} className="text-xs">
          {err}
        </FieldError>
      )}
    </Field>
  )
}
