import { BotanistNotes, CareList } from '@/components/telemetry/BotanistNotes'
import { EcoStats } from '@/components/telemetry/EcoStats'
import { GaugeBar } from '@/components/telemetry/GaugeBar'
import type { PlacedItem } from '@/data/types'
import { idealRange } from '@/engine/care'
import { isLampOn } from '@/engine/simulation/clock'
import { selectTelemetry } from '@/store/selectors'
import { useStudioStore, type StudioStore } from '@/store/useStudioStore'
import { useTelemetryStore } from '@/store/useTelemetryStore'

const NO_ITEMS: PlacedItem[] = []
const selectItems = (s: StudioStore) => s.worldSnapshot?.items ?? NO_ITEMS
const selectLampOn = (s: StudioStore) => isLampOn(s)

const toF = (c: number) => ((c * 9) / 5 + 32).toFixed(1)

function badge(warns: number): [label: string, cls: string] {
  if (warns === 0) return ['Thriving', 'bg-emerald-100 text-emerald-800']
  if (warns < 3) return ['Adjusting', 'bg-amber-100 text-amber-900']
  return ['Needs care', 'bg-rose-100 text-rose-800']
}

export function RightTelemetry({ drawerOpen = false }: { drawerOpen?: boolean }) {
  const t = useTelemetryStore(selectTelemetry)
  const items = useStudioStore(selectItems)
  const lampOn = useStudioStore(selectLampOn)
  const hum = idealRange(items, 'hum')
  const tmp = idealRange(items, 'temp')
  // A corrupt or missing reading must not render as "NaN °C".
  const tempKnown = Number.isFinite(t.temperature)
  const [badgeLabel, badgeCls] = badge(t.careIssues.filter((i) => i.level === 'warn').length)

  return (
    <aside
      id="right-sidebar"
      tabIndex={-1}
      data-drawer-open={drawerOpen}
      className={`z-20 max-lg:z-40 flex w-72 shrink-0 flex-col gap-3.5 overflow-y-auto border-l border-sand-border bg-paper p-4 max-lg:absolute max-lg:inset-y-0 max-lg:right-0 max-lg:max-w-[85vw] max-lg:shadow-xl max-lg:transition-[transform,visibility] motion-reduce:max-lg:transition-none ${
        drawerOpen ? '' : 'max-lg:invisible max-lg:translate-x-full'
      }`}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-forest-ink">Biosphere health</h2>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${badgeCls}`}>
          {badgeLabel}
        </span>
      </div>
      <BotanistNotes />
      <div className="space-y-3.5 rounded-2xl border border-card-line bg-white p-3.5">
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
      <CareList />
      <EcoStats />
      <div className="mt-auto flex items-center justify-between border-t border-sand-border pt-3 text-[11px] text-stone">
        <span>Nothing dies here; plants recover</span>
        <span className="font-semibold text-forest-deep">{items.length} specimens</span>
      </div>
    </aside>
  )
}
