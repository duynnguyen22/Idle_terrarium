export interface GaugeBand {
  lo: number
  hi: number
  /** Slack either side of lo..hi that still counts as in band. */
  tol?: number
  /** Inhabitants want ranges that don't overlap: no band is drawn and the gauge stays "in band". */
  conflict?: boolean
}

interface GaugeBarProps {
  /** Suffix for `data-testid="gauge-{key}"` (`key` itself is reserved by React). */
  gaugeKey: string
  icon: string
  label: string
  value: number
  min: number
  max: number
  /** Formatted reading shown beside the label. */
  text: string
  band?: GaugeBand
  hint?: string
  /** Tailwind background class for the in-band fill. */
  fillClass?: string
}

/** In band when value is within lo..hi ± tol; true when there is no band or it conflicts (prototype setGauge). */
function isInBand(value: number, band?: GaugeBand): boolean {
  if (!band || band.conflict) return true
  const tol = band.tol ?? 0
  return value >= band.lo - tol && value <= band.hi + tol
}

export function GaugeBar({
  gaugeKey,
  icon,
  label,
  value,
  min,
  max,
  text,
  band,
  hint,
  fillClass = 'bg-moss',
}: GaugeBarProps) {
  const pct = (v: number) => Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100))
  const inBand = isInBand(value, band)
  return (
    <div data-testid={`gauge-${gaugeKey}`} data-in-band={String(inBand)}>
      <div className="mb-1.5 flex justify-between text-xs">
        <span className="font-medium text-ink-brown">
          <span aria-hidden="true">{icon}</span> {label}
        </span>
        <span className="font-mono-clock font-semibold text-forest-ink">{text}</span>
      </div>
      <div className="relative h-2 w-full rounded-full bg-sand-light">
        <div
          data-testid="gauge-fill"
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-300 motion-reduce:transition-none ${
            inBand ? fillClass : 'bg-orange-700'
          }`}
          style={{ width: `${pct(value)}%` }}
        />
        {band && !band.conflict && (
          <div
            data-testid={`gauge-band-${gaugeKey}`}
            aria-hidden="true"
            className="absolute -inset-y-0.5 rounded-full border border-forest-deep/40 bg-sage/30"
            style={{
              left: `${pct(band.lo)}%`,
              width: `${Math.max(2, pct(band.hi) - pct(band.lo))}%`,
            }}
          />
        )}
      </div>
      {hint && <div className="mt-1 text-[10.5px] text-stone">{hint}</div>}
    </div>
  )
}
