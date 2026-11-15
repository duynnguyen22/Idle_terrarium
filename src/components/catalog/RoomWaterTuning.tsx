import { PH_RANGE, TDS_RANGE } from '@/data/room'
import type { RoomEnv } from '@/data/types'
import type { EnvModel } from '@/engine/room'
import { Slider } from '@/components/ui/slider'

/** The hardness (TDS) and pH sliders under the water source list; locked for RO and rain water. */
export function RoomWaterTuning({
  room,
  env,
  setRoom,
}: {
  room: RoomEnv
  env: EnvModel
  setRoom: (patch: Partial<RoomEnv>) => void
}) {
  const fixed = room.water === 'ro' || room.water === 'rain'
  const tdsText = `${env.tds} ppm${env.tds > 350 ? ' · hard' : env.tds < 80 ? ' · very soft' : ''}`
  return (
    <div className="mt-2 flex flex-col gap-2.5 rounded-2xl border border-sand-border bg-white p-3">
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-xs">
          <span id="env-tds-label" className="font-medium text-ink-soft">
            Hardness (TDS)
          </span>
          <span className="text-[11px] tabular-nums text-stone">{tdsText}</span>
        </div>
        <Slider
          aria-labelledby="env-tds-label"
          min={TDS_RANGE[0]}
          max={TDS_RANGE[1]}
          step={10}
          value={[room.tds]}
          disabled={fixed}
          onValueChange={([tds]) => setRoom({ tds: tds! })}
        />
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-xs">
          <span id="env-ph-label" className="font-medium text-ink-soft">
            pH
          </span>
          <span className="text-[11px] tabular-nums text-stone">pH {env.ph.toFixed(1)}</span>
        </div>
        <Slider
          aria-labelledby="env-ph-label"
          min={PH_RANGE[0] * 10}
          max={PH_RANGE[1] * 10}
          value={[Math.round(room.ph * 10)]}
          disabled={fixed}
          onValueChange={([v]) => setRoom({ ph: v! / 10 })}
        />
      </div>
      <p className="text-[10.5px] text-stone">
        {fixed ? `${env.ws.name} sets these for you.` : 'Read them from a TDS pen and pH strip.'}
      </p>
    </div>
  )
}
