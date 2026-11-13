import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

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
    <ToggleGroup
      type="single"
      orientation="vertical"
      variant="choice"
      size="auto"
      spacing={1}
      aria-label={label}
      value={value}
      // Pressing the chosen row again reports '' — a source is always set, so ignore it.
      onValueChange={(id) => id && onChange(id as T)}
      className="w-full rounded-[14px] border border-card-line bg-white p-1"
    >
      {options.map((o) => (
        <ToggleGroupItem key={o.id} value={o.id} className="group/env">
          <span
            aria-hidden="true"
            className="mt-0.5 size-3.5 shrink-0 rounded-full border-[1.6px] border-[#9aa59c] transition-[border-color,border-width] group-data-[state=on]/env:border-[4.5px] group-data-[state=on]/env:border-forest-deep"
          />
          <span className="flex min-w-0 flex-col">
            <b className="text-[12.5px] font-semibold text-forest-ink">{o.name}</b>
            <small className="text-[10.5px] leading-[1.35] text-stone">{o.sub}</small>
          </span>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
