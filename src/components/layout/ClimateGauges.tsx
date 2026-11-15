import { GaugeBar } from '@/components/telemetry/GaugeBar'
import type { PlacedItem } from '@/data/types'
import { idealRange } from '@/engine/care'
import type { Telemetry } from '@/store/telemetry'

const toF = (c: number) => ((c * 9) / 5 + 32).toFixed(1)

/** The humidity and temperature gauges, each with the band the inhabitants want. */
export function ClimateGauges({ t, items }: { t: Telemetry; items: PlacedItem[] }) {
  const hum = idealRange(items, 'hum')
  const tmp = idealRange(items, 'temp')
  // A corrupt or missing reading must not render as "NaN °C".
  const tempKnown = Number.isFinite(t.temperature)

  return (
    <>
      <GaugeBar
        gaugeKey="humidity"
        label="Air humidity"
        value={t.humidity}
        min={0}
        max={100}
        text={`${Math.round(t.humidity)}%`}
        band={{ ...hum, tol: 3 }}
        hint={
          hum.conflict && hum.names
            ? `No humidity suits both ${hum.names.lo} and ${hum.names.hi}`
            : `Ideal ${hum.lo}–${hum.hi}% for what lives here`
        }
      />
      <GaugeBar
        gaugeKey="temperature"
        label="Temperature"
        value={t.temperature}
        min={15}
        max={35}
        text={tempKnown ? `${t.temperature.toFixed(1)} °C` : '— °C'}
        band={{ ...tmp, tol: 1 }}
        hint={
          !tempKnown
            ? undefined
            : tmp.conflict
              ? 'Inhabitants want different temperatures'
              : `Ideal ${tmp.lo}–${tmp.hi} °C · ${toF(t.temperature)} °F now`
        }
      />
    </>
  )
}
