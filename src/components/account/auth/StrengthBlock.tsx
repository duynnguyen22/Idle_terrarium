import { useAtomValue } from 'jotai'
import { passwordStrength } from '@/auth'
import { type TextKey } from './authEnv'
import { viewDataAtom } from '@/store/account'
import { CheckIcon } from './AuthPieces'

/** The live strength meter and rule list under a new-password field (spec strengthBlock). */
export function StrengthBlock({ name }: { name: TextKey }) {
  const pw = useAtomValue(viewDataAtom)[name] ?? ''
  const s = passwordStrength(pw)
  const rules = [
    [s.checks.length, 'At least 8 characters'],
    [s.checks.letter, 'A letter'],
    [s.checks.number, 'A number'],
  ] as const
  return (
    <div>
      <div className="auth-strength" data-strength-for={name}>
        <div className="auth-bars" aria-hidden="true">
          {[1, 2, 3, 4].map((i) => (
            <span key={i} className={i <= s.score && pw ? `on s${s.score}` : undefined} />
          ))}
        </div>
        <span className="auth-strength-l">{pw ? s.label : 'Password strength'}</span>
      </div>
      <ul className="auth-rules">
        {rules.map(([ok, text]) => (
          <li key={text} className={ok ? 'ok' : undefined}>
            <CheckIcon />
            {text}
          </li>
        ))}
      </ul>
    </div>
  )
}
