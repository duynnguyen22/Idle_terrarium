import { Badge } from '@/components/ui/badge'
import { type HealthChip } from './growthRows'

const TONES: Record<HealthChip['tone'], string> = {
  good: 'bg-[#dcebe0] text-forest-deep',
  fair: 'bg-[#f6ecd6] text-[#7a5410]',
  bad: 'bg-[#f8dfdc] text-[#8f2b22]',
  rest: 'bg-[#e8ebe7] text-ink-umber',
}

const FILLS: Record<HealthChip['tone'], string> = {
  good: 'bg-[#4f9a5e]',
  fair: 'bg-[#c99a2e]',
  bad: 'bg-[#c4554a]',
  rest: 'bg-[#9aa79d]',
}

export function Chip({ label, tone }: HealthChip) {
  return (
    <Badge className={`h-auto px-2 py-px text-[10.5px] font-bold tabular-nums ${TONES[tone]}`}>
      {label}
    </Badge>
  )
}

export function Bar({
  value,
  ticks = [],
  label,
  tone = 'good',
}: {
  value: number
  ticks?: number[]
  label: string
  tone?: HealthChip['tone']
}) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100)
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className="relative h-1.5 overflow-hidden rounded-full bg-[#e7ebe4]"
    >
      <div
        className={`absolute inset-y-0 left-0 rounded-full ${FILLS[tone]}`}
        style={{ width: `${Math.max(2, pct)}%` }}
      />
      {ticks.map((t) => (
        <span
          key={t}
          aria-hidden="true"
          className="absolute inset-y-0 -ml-px w-0.5 bg-paper"
          style={{ left: `${t * 100}%` }}
        />
      ))}
    </div>
  )
}

export function Stat({ title, value, sub }: { title: string; value: string; sub?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-px rounded-xl border border-card-line bg-white px-2.5 py-2">
      <p className="text-[10.5px] font-semibold uppercase tracking-[.04em] text-stone-light">
        {title}
      </p>
      <p className="text-base font-semibold tabular-nums text-forest-ink">{value}</p>
      {sub && <p className="text-[11px] leading-snug text-stone">{sub}</p>}
    </div>
  )
}

export const Empty = ({ children }: { children: string }) => (
  <p className="mx-0.5 text-xs text-stone">{children}</p>
)

export const SectionTitle = ({ children, count }: { children: string; count: number }) => (
  <h3 className="mx-0.5 mb-1.5 mt-2.5 flex items-center gap-1.5 text-xs font-semibold text-forest-ink">
    {children}
    <Badge className="h-auto bg-sand-light px-[7px] py-0 text-[11px] font-semibold text-stone">
      {count}
    </Badge>
  </h3>
)
