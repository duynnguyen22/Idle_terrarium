import { BotanistNotes } from '@/components/telemetry/BotanistNotes'
import { GaugeBar } from '@/components/telemetry/GaugeBar'
import { MicroEcologyPanel } from '@/components/telemetry/MicroEcologyPanel'
import { selectTelemetry } from '@/store/selectors'
import { useStudioStore } from '@/store/useStudioStore'

const selectSpecimenCount = (s: { worldSnapshot: { items: unknown[] } | null }) =>
  s.worldSnapshot?.items.length ?? 0

export function RightTelemetry({ drawerOpen = false }: { drawerOpen?: boolean }) {
  const t = useStudioStore(selectTelemetry)
  const specimens = useStudioStore(selectSpecimenCount)
  return (
    <aside
      id="right-sidebar"
      data-drawer-open={drawerOpen}
      className={`z-20 max-lg:z-40 flex w-72 shrink-0 flex-col justify-between overflow-y-auto border-l border-sand-border bg-paper p-4 max-lg:absolute max-lg:inset-y-0 max-lg:right-0 max-lg:max-w-[85vw] max-lg:shadow-xl max-lg:transition-[transform,visibility] motion-reduce:max-lg:transition-none ${
        drawerOpen ? '' : 'max-lg:invisible max-lg:translate-x-full'
      }`}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-stone">
            Biosphere Telemetry
          </h2>
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-800">
            Thriving
          </span>
        </div>
        <div className="space-y-3 rounded-2xl border border-sand-border bg-white p-3.5">
          <GaugeBar label="💧 Air Humidity" value={t.humidity} fillClass="bg-sky-500" />
          <GaugeBar label="🌱 Soil Moisture" value={t.soilMoisture} fillClass="bg-teal-600" />
          <GaugeBar label="🧪 Bio-Nutrients" value={t.nutrients} fillClass="bg-amber-500" />
          <GaugeBar label="🌬️ O₂ / CO₂ Balance" value={t.o2Balance} fillClass="bg-emerald-600" />
        </div>
        <MicroEcologyPanel />
        <BotanistNotes />
      </div>
      <div className="flex items-center justify-between border-t border-sand-border pt-3 text-[11px] text-stone-light">
        <span>Zero-Punishment Sanctuary</span>
        <span className="font-semibold text-forest-deep">{specimens} Specimens</span>
      </div>
    </aside>
  )
}
