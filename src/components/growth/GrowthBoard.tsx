import { useEffect, useId, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { tryGetWorld } from '@/engine/engineBridge'
import { PING_MS, pingItem } from '@/engine/marks'
import { breedConditions } from '@/engine/simulation/breed'
import { lightDose } from '@/engine/simulation/life'
import { PACE_LABELS, PACE_SUBTITLES, type PaceId } from '@/engine/simulation/pace'
import { showToast } from '@/store/toastStore'
import { useOverlayStore } from '@/store/useOverlayStore'
import { useStudioStore } from '@/store/useStudioStore'
import {
  faunaRows,
  floraRow,
  tankStats,
  upNext,
  type FaunaRow,
  type FloraRow,
  type HealthChip,
} from './growthRows'

const PACE_IDS: PaceId[] = ['brisk', 'garden', 'calm', 'real']
const REFRESH_MS = 1000

const TONES: Record<HealthChip['tone'], string> = {
  good: 'bg-mint text-forest-mid',
  fair: 'bg-amber-pale text-amber-brown',
  bad: 'bg-rose-pale text-blood',
  rest: 'bg-sand-pale text-stone',
}

const ROW =
  'block w-full rounded-xl border border-card-line px-2.5 py-2 text-left transition hover:bg-forest-ink/5 focus-visible:outline-2 focus-visible:outline-forest-mid'

function Chip({ label, tone }: HealthChip) {
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${TONES[tone]}`}>
      {label}
    </span>
  )
}

function Bar({ value, ticks = [], label }: { value: number; ticks?: number[]; label: string }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100)
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className="relative mt-1.5 h-1.5 rounded-full bg-sand-track"
    >
      <div className="h-full rounded-full bg-moss" style={{ width: `${pct}%` }} />
      {ticks.map((t) => (
        <span
          key={t}
          aria-hidden="true"
          className="absolute top-[-1px] h-2 w-px bg-forest-ink/40"
          style={{ left: `${t * 100}%` }}
        />
      ))}
    </div>
  )
}

function Stat({ title, value, sub }: { title: string; value: string; sub?: string }) {
  return (
    <div className="min-w-0 flex-1 rounded-xl bg-sand-pale px-2.5 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-stone">{title}</p>
      <p className="mt-0.5 text-sm font-semibold text-forest-ink">{value}</p>
      {sub && <p className="text-[11px] leading-tight text-stone">{sub}</p>}
    </div>
  )
}

const Empty = ({ children }: { children: string }) => (
  <p className="rounded-xl bg-sand-pale px-2.5 py-2 text-xs text-stone">{children}</p>
)

const SectionTitle = ({ children }: { children: string }) => (
  <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-stone">
    {children}
  </h3>
)

/** The Growth board: every plant and animal with its life phase, health and what is coming next. */
export function GrowthBoard() {
  const titleId = useId()
  const open = useOverlayStore((s) => s.growthBoardOpen)
  const closeGrowthBoard = useOverlayStore((s) => s.closeGrowthBoard)
  const { pace, timeSpeed, dayCount, pumpFlow, waterSplit, hasGrowLamp, substrates } =
    useStudioStore(
      useShallow((s) => ({
        pace: s.pace,
        timeSpeed: s.timeSpeed,
        dayCount: s.dayCount,
        pumpFlow: s.pumpFlow,
        waterSplit: s.waterSplit,
        hasGrowLamp: s.hasGrowLamp,
        substrates: s.substrates,
      })),
    )
  const setPace = useStudioStore((s) => s.setPace)
  // The world mutates outside React, so a timer re-reads it while the board is open.
  const [, setTick] = useState(0)

  useEffect(() => {
    if (!open) return
    const timer = setInterval(() => setTick((n) => n + 1), REFRESH_MS)
    return () => clearInterval(timer)
  }, [open])

  useEffect(() => {
    if (!open) return
    // Capture phase + stopPropagation: Escape closes the board only, not relax mode or the selection.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      closeGrowthBoard()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open, closeGrowthBoard])

  if (!open) return null

  const world = tryGetWorld()
  const dose = lightDose({ hasGrowLamp })
  const plants: FloraRow[] = world
    ? world.items.filter((i) => i.category === 'flora').map((i) => floraRow(i, dose, pace))
    : []
  const animals: FaunaRow[] = world
    ? faunaRows(world, breedConditions(world, { substrates, waterSplit }), pace)
    : []
  const stats = world ? tankStats(world, { dayCount, pumpFlow, waterSplit, pace }) : null
  const next = upNext([...plants, ...animals])
  const watching =
    timeSpeed === 0
      ? 'Paused while you watch.'
      : timeSpeed === 5
        ? 'Running 5× while you watch.'
        : 'Growth continues while the app is closed.'

  const ping = (uids: string[]) => {
    const live = tryGetWorld()
    if (live) for (const uid of uids) pingItem(live, uid, PING_MS)
  }
  const select = (uid: string | undefined) => {
    if (uid !== undefined) useStudioStore.getState().selectItem(uid)
  }
  const choosePace = (id: PaceId) => {
    setPace(id)
    showToast(`Tank pace: ${PACE_SUBTITLES[id]}`)
  }

  return (
    <aside
      id="growth-board"
      role="dialog"
      aria-labelledby={titleId}
      className="absolute bottom-3 right-3 top-3 z-30 flex w-[21rem] max-w-[calc(100%-1.5rem)] flex-col gap-3 overflow-y-auto rounded-2xl border border-card-line bg-white p-3.5 shadow-lg"
    >
      <div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-stone">
              Growth board
            </p>
            <h2 id={titleId} className="mt-0.5 text-sm font-semibold text-forest-ink">
              How your tank is growing
            </h2>
          </div>
          <button
            type="button"
            onClick={closeGrowthBoard}
            className="inline-flex h-7 shrink-0 items-center rounded-lg px-2 text-xs font-semibold text-forest-ink transition hover:bg-forest-ink/10"
          >
            Close
          </button>
        </div>
        <div
          role="radiogroup"
          aria-label="Tank pace"
          className="mt-2.5 flex gap-1 rounded-xl bg-sand-pale p-1"
        >
          {PACE_IDS.map((id) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={pace === id}
              onClick={() => choosePace(id)}
              className={`h-7 flex-1 whitespace-nowrap rounded-lg text-xs font-semibold transition ${
                pace === id ? 'bg-forest-deep text-white' : 'text-ink-brown hover:bg-white/60'
              }`}
            >
              {PACE_LABELS[id]}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-stone">{`${PACE_SUBTITLES[pace]}. ${watching}`}</p>
      </div>

      {stats && (
        <div className="flex gap-1.5">
          <Stat title="Tank age" value={stats.age} />
          {stats.pool && <Stat title="Pool cycle" value={stats.pool.value} sub={stats.pool.sub} />}
          <Stat title="Moss cover" value={stats.moss.value} sub={stats.moss.sub} />
        </div>
      )}

      <div className="rounded-xl bg-mint-mist px-2.5 py-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-stone">Up next</p>
        <p className="mt-0.5 text-xs text-forest-ink">
          {next ? (
            <>
              <b>{next.name}</b>
              {`: ${next.next}`}
            </>
          ) : (
            'Nothing is due. Healthy plants keep cycling.'
          )}
        </p>
      </div>

      <section aria-label="Plants">
        <SectionTitle>Plants</SectionTitle>
        {plants.length === 0 ? (
          <Empty>No plants yet. Add some from the Flora tab.</Empty>
        ) : (
          <ul className="space-y-1.5">
            {plants.map((row) => (
              <li key={row.uid}>
                <button
                  type="button"
                  onMouseEnter={() => ping([row.uid])}
                  onFocus={() => ping([row.uid])}
                  onClick={() => select(row.uid)}
                  className={ROW}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-semibold text-forest-ink">
                      {row.name}
                    </span>
                    <Chip {...row.chip} />
                  </span>
                  <span className="mt-0.5 flex items-center justify-between gap-2 text-[11px] text-stone">
                    <span>{row.phase}</span>
                    <span>{`Size ${row.size}%`}</span>
                  </span>
                  <Bar value={row.bar} ticks={row.ticks} label={`${row.name} progress`} />
                  <span className="mt-1.5 block text-[11px] text-ink-umber">{row.next}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Animals">
        <SectionTitle>Animals</SectionTitle>
        {animals.length === 0 ? (
          <Empty>No animals yet. Add a cleanup crew from the Fauna tab.</Empty>
        ) : (
          <ul className="space-y-1.5">
            {animals.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  onMouseEnter={() => ping(row.uids)}
                  onFocus={() => ping(row.uids)}
                  onClick={() => select(row.uids[0])}
                  className={ROW}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-semibold text-forest-ink">{`${row.name} ×${row.count}`}</span>
                    <Chip {...row.chip} />
                  </span>
                  {row.young !== undefined && (
                    <span className="mt-0.5 block text-[11px] text-stone">{`Young growing up: ${row.young}%`}</span>
                  )}
                  {row.breeding && (
                    <>
                      <span className="mt-0.5 block text-[11px] text-stone">{`Breeding · ${row.breeding.n} of ${row.breeding.cap}`}</span>
                      <Bar
                        value={row.breeding.n / row.breeding.cap}
                        label={`${row.name} colony size`}
                      />
                    </>
                  )}
                  <span className="mt-1.5 block text-[11px] text-ink-umber">{row.next}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-[11px] leading-snug text-stone">
        Times are estimates at 1× speed and assume conditions stay the same. Struggling plants slow
        down; resting ones pause until you care for them.
      </p>
    </aside>
  )
}
