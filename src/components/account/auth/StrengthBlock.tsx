import { useAtomValue } from 'jotai'
import { cn } from 'cn'
import { passwordStrength } from '@/auth'
import { type TextKey } from './authEnv'
import { viewDataAtom } from '@/store/account'
import { CheckIcon } from './AuthPieces'

/** Bar colour by score, weak to strong. */
const BAR: Record<number, string> = {
  1: 'bg-[#d1432f]',
  2: 'bg-[#d4a017]',
  3: 'bg-[#5a9e5f]',
  4: 'bg-[#2f8a4e]',
}

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
    <div className="-mt-1.5">
      <div className="flex items-center gap-2.5" data-strength-for={name}>
        <div className="grid flex-1 grid-cols-4 gap-1" aria-hidden="true">
          {[1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className={cn('h-1 rounded-full bg-card-line', i <= s.score && pw && BAR[s.score])}
            />
          ))}
        </div>
        <span className="min-w-23 text-right text-[11.5px] text-muted-foreground">
          {pw ? s.label : 'Password strength'}
        </span>
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {rules.map(([ok, text]) => (
          <li
            key={text}
            className={cn(
              'inline-flex items-center gap-1 text-[11.5px] text-stone-light [&_svg]:size-3.25 [&_svg]:opacity-35',
              ok && 'ok text-forest-mid [&_svg]:opacity-100',
            )}
          >
            <CheckIcon />
            {text}
          </li>
        ))}
      </ul>
    </div>
  )
}
