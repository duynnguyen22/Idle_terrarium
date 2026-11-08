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
    <div className="env-list" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={o.id === value}
          onClick={() => onChange(o.id)}
          className="env-opt"
        >
          <span className="env-dot" aria-hidden="true" />
          <span className="env-txt">
            <b>{o.name}</b>
            <small>{o.sub}</small>
          </span>
        </button>
      ))}
    </div>
  )
}
