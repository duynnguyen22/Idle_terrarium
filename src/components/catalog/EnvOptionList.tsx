import { RadioGroup } from 'radix-ui'

export interface EnvOption<T extends string> {
  id: T
  name: string
  sub: string
}

/** Radio list of environment sources (water, room air); reused by onboarding. */
export function EnvOptionList<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: EnvOption<T>[]
  value: T
  onChange: (id: T) => void
}) {
  return (
    <RadioGroup.Root className="env-list" aria-label={label} value={value}>
      {options.map((o) => (
        <RadioGroup.Item key={o.id} value={o.id} onClick={() => onChange(o.id)} className="env-opt">
          <span className="env-dot" aria-hidden="true" />
          <span className="env-txt">
            <b>{o.name}</b>
            <small>{o.sub}</small>
          </span>
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  )
}
