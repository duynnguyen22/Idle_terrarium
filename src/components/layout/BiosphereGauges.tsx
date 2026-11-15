import { GaugeBar } from '@/components/telemetry/GaugeBar'
import type { PlacedItem, RoomEnv } from '@/data/types'
import { qualityWord, type EnvModel } from '@/engine/room'
import type { Telemetry } from '@/store/telemetry'
import { ClimateGauges } from './ClimateGauges'

/** The card of seven gauges: humidity, temperature, moisture, nutrients, water, air and O₂. */
export function BiosphereGauges({
  t,
  items,
  lampOn,
  room,
  m,
}: {
  t: Telemetry
  items: PlacedItem[]
  lampOn: boolean
  room: RoomEnv
  m: EnvModel
}) {
  return (
    <div className="flex flex-col gap-3.5 rounded-2xl border border-card-line bg-white p-3.5">
      <ClimateGauges t={t} items={items} />
      <GaugeBar
        gaugeKey="moisture"
        label="Substrate moisture"
        value={t.soilMoisture}
        min={0}
        max={100}
        text={`${Math.round(t.soilMoisture)}%`}
        band={{ lo: 55, hi: 85, tol: 2 }}
        hint="Evenly moist with no standing water"
      />
      <GaugeBar
        gaugeKey="nutrients"
        label="Nutrients"
        value={t.nutrients}
        min={0}
        max={100}
        text={`${Math.round(t.nutrients)}%`}
        band={{ lo: 40, hi: 100, tol: 0 }}
        hint="Leaf litter and isopods recycle nutrients slowly"
      />
      <GaugeBar
        gaugeKey="water"
        label="Water quality"
        value={m.water}
        min={0}
        max={100}
        text={`${m.water} · ${qualityWord(m.water)}`}
        band={{ lo: 70, hi: 100, tol: 0 }}
        hint={`${m.ws.name} · ${m.tds} ppm · pH ${m.ph.toFixed(1)}`}
      />
      <GaugeBar
        gaugeKey="air"
        label="Air quality"
        value={m.airEff}
        min={0}
        max={100}
        text={`${m.airEff} · ${qualityWord(m.airEff)}`}
        band={{ lo: 70, hi: 100, tol: 0 }}
        hint={`${m.as.name}${room.purifier ? ' · purifier on' : ''}`}
      />
      <GaugeBar
        gaugeKey="o2"
        label="O₂ / CO₂ balance"
        value={t.o2Balance}
        min={40}
        max={100}
        text={`${Math.round(t.o2Balance)}%`}
        band={{ lo: lampOn ? 80 : 55, hi: 100, tol: 2 }}
        hint={
          lampOn ? 'Lamp on: plants are photosynthesising' : 'Lamp off: plants respire overnight'
        }
      />
    </div>
  )
}
