export interface PasswordStrength {
  checks: { length: boolean; letter: boolean; number: boolean }
  score: 0 | 1 | 2 | 3 | 4
  ok: boolean
  label: string
}

const LABELS = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'] as const

/**
 * Scores a password 0–4. `ok` is the sign-up bar (8+ characters with a letter
 * and a number); a password below the bar never scores above 1, and one that
 * clears it never scores below 1.
 */
export function passwordStrength(pw: string): PasswordStrength {
  const checks = {
    length: pw.length >= 8,
    letter: /[A-Za-z]/.test(pw),
    number: /\d/.test(pw),
  }
  let raw = 0
  if (pw.length >= 8) raw++
  if (pw.length >= 12) raw++
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) raw++
  if (/\d/.test(pw)) raw++
  if (/[^A-Za-z0-9]/.test(pw)) raw++
  raw = Math.min(4, raw)
  const ok = checks.length && checks.letter && checks.number
  const score = (ok ? Math.max(1, raw) : Math.min(1, raw)) as PasswordStrength['score']
  return { checks, score, ok, label: LABELS[score] }
}
