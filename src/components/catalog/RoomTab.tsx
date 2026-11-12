import { EnvOptionList } from '@/components/catalog/EnvOptionList'
import { Glyph, ICON_OFF, ICON_ON, SwitchRow } from '@/components/catalog/HardwarePanel'
import type { AirSourceId, WaterSourceId } from '@/data/types'
import {
  AIR_SOURCES,
  PH_RANGE,
  TDS_RANGE,
  WATER_SOURCES,
  envModel,
  qualityTier,
  qualityWord,
} from '@/engine/room'
import { useStudioStore } from '@/store/useStudioStore'
import { Slider } from '@/components/ui/Slider'

const WATER_OPTIONS = (Object.keys(WATER_SOURCES) as WaterSourceId[]).map((id) => ({
  id,
  name: WATER_SOURCES[id].name,
  sub: WATER_SOURCES[id].sub,
}))
const AIR_OPTIONS = (Object.keys(AIR_SOURCES) as AirSourceId[]).map((id) => ({
  id,
  name: AIR_SOURCES[id].name,
  sub: AIR_SOURCES[id].sub,
}))

const HEADING = 'mb-2 text-xs font-semibold text-forest-deep'
const PURIFIER_GLYPH = 'M3 8h10a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h8'

function ScoreRow({ label, value, note }: { label: string; value: number; note: string }) {
  const tier = qualityTier(value)
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="env-score-l">{label}</span>
        <span className="env-score-v" data-q={tier}>
          {value} · {qualityWord(value)}
        </span>
      </div>
      <div className="env-track">
        <div className="env-fill" data-q={tier} style={{ width: `${value}%` }} />
      </div>
      <div className="env-score-n">{note}</div>
    </div>
  )
}

function waterNote(chlorine: number, tds: number): string {
  if (chlorine >= 0.9) return 'Chlorine present'
  if (tds > 350) return 'Hard water'
  if (tds < 80) return 'Very soft water'
  return 'Safe for misting and the pool'
}

/** Room tab: the water and air around the tank and what they do to its quality scores. */
export function RoomTab() {
  const room = useStudioStore((s) => s.room)
  const hasLid = useStudioStore((s) => s.hasLid)
  const setRoom = useStudioStore((s) => s.setRoom)
  const env = envModel(room, hasLid)
  const fixed = room.water === 'ro' || room.water === 'rain'
  const tdsText = `${env.tds} ppm${env.tds > 350 ? ' · hard' : env.tds < 80 ? ' · very soft' : ''}`
  const airNote = hasLid
    ? 'Sealed lid halves what reaches the tank'
    : 'Open top: the tank breathes room air'

  return (
    <div className="space-y-5">
      <p className="text-[11px] leading-relaxed text-stone">
        What surrounds the tank shapes how it grows. Set the water you mist and fill with, and the
        air in the room.
      </p>
      <section>
        <h2 className={HEADING}>How the room is treating your tank</h2>
        <div className="env-scores">
          <ScoreRow
            label="Water quality"
            value={env.water}
            note={waterNote(env.chlorine, env.tds)}
          />
          <ScoreRow label="Air quality at the tank" value={env.airEff} note={airNote} />
        </div>
      </section>
      <section>
        <h2 className={HEADING}>Water you use</h2>
        <EnvOptionList
          label="Water source"
          options={WATER_OPTIONS}
          value={room.water}
          onChange={(water) => setRoom({ water })}
        />
        <div className="mt-2 space-y-2.5 rounded-2xl border border-sand-border bg-white p-3">
          <div className="space-y-1">
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
              value={room.tds}
              disabled={fixed}
              onValueChange={(tds) => setRoom({ tds })}
            />
          </div>
          <div className="space-y-1">
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
              value={Math.round(room.ph * 10)}
              disabled={fixed}
              onValueChange={(v) => setRoom({ ph: v / 10 })}
            />
          </div>
          <p className="text-[10.5px] text-stone">
            {fixed
              ? `${env.ws.name} sets these for you.`
              : 'Read them from a TDS pen and pH strip.'}
          </p>
        </div>
      </section>
      <section>
        <h2 className={HEADING}>Room air</h2>
        <EnvOptionList
          label="Room air"
          options={AIR_OPTIONS}
          value={room.air}
          onChange={(air) => setRoom({ air })}
        />
        <div className="mt-2 rounded-[14px] border border-sand-border bg-white p-1">
          <SwitchRow
            label="Air purifier"
            sub={room.purifier ? 'HEPA + carbon, running' : 'Off'}
            checked={room.purifier}
            iconClass={room.purifier ? ICON_ON : ICON_OFF}
            icon={<Glyph d={PURIFIER_GLYPH} />}
            onToggle={() => setRoom({ purifier: !room.purifier })}
          />
        </div>
        <p className="mt-2 text-[10.5px] text-stone">
          A sealed lid keeps out about half of what is in the room air.
        </p>
      </section>
    </div>
  )
}
