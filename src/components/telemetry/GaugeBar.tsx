interface GaugeBarProps {
  label: string
  value: number
  /** Tailwind background class for the fill. */
  fillClass: string
}

export function GaugeBar({ label, value, fillClass }: GaugeBarProps) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="font-medium text-ink-brown">{label}</span>
        <span className="font-mono-clock font-semibold text-forest-deep">{Math.round(value)}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-sand-light">
        <div
          data-testid="gauge-fill"
          className={`h-full rounded-full transition-all duration-300 ${fillClass}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}
