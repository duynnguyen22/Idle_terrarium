import { useAtomValue, useSetAtom } from 'jotai'
import { useEffect, useId, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { tryGetWorld } from '@/engine/engineBridge'
import { PING_MS, pingItem } from '@/engine/marks'
import { focusOn } from '@/engine/view'
import { breedConditions } from '@/engine/simulation/breed'
import { lightDose } from '@/engine/simulation/life'
import { PACE_LABELS, PACE_SUBTITLES, type PaceId } from '@/engine/simulation/pace'
import { appStore } from '@/store/appStore'
import { growthBoardOpenAtom } from '@/store/overlay'
import {
  dayCountAtom,
  hasGrowLampAtom,
  paceAtom,
  pumpFlowAtom,
  relaxModeAtom,
  selectedIdAtom,
  substratesAtom,
  timeSpeedAtom,
  waterSplitAtom,
} from '@/store/studio'
import { showToast } from '@/store/toast'
import {
  faunaRows,
  floraRow,
  tankStats,
  upNext,
  type FaunaRow,
  type FloraRow,
  type HealthChip,
} from './growthRows'

/** A click's close-up: the camera eases to the animals for 3.2 s, then returns. */
function closeUp(uids: string[]): void {
  const world = tryGetWorld()
  if (world) focusOn(world.view, uids, 2, 3200, performance.now())
}

const PACE_IDS: PaceId[] = ['brisk', 'garden', 'calm', 'real']
const REFRESH_MS = 1000

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

const ROW =
  'w-full flex-col items-stretch gap-[5px] rounded-xl px-[11px] py-[9px] hover:border-[#9fbfa9] hover:bg-white focus-visible:border-[#9fbfa9]'

function Chip({ label, tone }: HealthChip) {
  return (
    <Badge className={`h-auto px-2 py-px text-[10.5px] font-bold tabular-nums ${TONES[tone]}`}>
      {label}
    </Badge>
  )
}

function Bar({
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

function Stat({ title, value, sub }: { title: string; value: string; sub?: string }) {
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

const Empty = ({ children }: { children: string }) => (
  <p className="mx-0.5 text-xs text-stone">{children}</p>
)

const SectionTitle = ({ children, count }: { children: string; count: number }) => (
  <h3 className="mx-0.5 mb-1.5 mt-2.5 flex items-center gap-1.5 text-xs font-semibold text-forest-ink">
    {children}
    <Badge className="h-auto bg-sand-light px-[7px] py-0 text-[11px] font-semibold text-stone">
      {count}
    </Badge>
  </h3>
)

/** The Growth board: every plant and animal with its life phase, health and what is coming next. */
export function GrowthBoard() {
  const titleId = useId()
  const open = useAtomValue(growthBoardOpenAtom)
  const setOpen = useSetAtom(growthBoardOpenAtom)
  const closeGrowthBoard = () => setOpen(false)
  const pace = useAtomValue(paceAtom)
  const timeSpeed = useAtomValue(timeSpeedAtom)
  const dayCount = useAtomValue(dayCountAtom)
  const pumpFlow = useAtomValue(pumpFlowAtom)
  const waterSplit = useAtomValue(waterSplitAtom)
  const hasGrowLamp = useAtomValue(hasGrowLampAtom)
  const substrates = useAtomValue(substratesAtom)
  const setPace = useSetAtom(paceAtom)
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
    // Relax mode hides the board, so there Escape is left to leave relax mode.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || appStore.get(relaxModeAtom)) return
      e.stopPropagation()
      setOpen(false)
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open, setOpen])

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
  const select = (uids: string[]) => {
    const first = uids[0]
    if (first === undefined) return
    appStore.set(selectedIdAtom, first)
    closeUp(uids.slice(0, 3))
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
      className="absolute inset-y-0 right-0 z-30 flex w-[min(26.25rem,100%)] flex-col gap-2.5 border-l border-sand-border bg-paper px-4 pt-4 shadow-[-18px_0_40px_-24px_rgba(20,40,28,.45)]"
    >
      <div className="flex items-start justify-between gap-2.5">
        <div>
          <p className="font-mono text-[10.5px] uppercase tracking-[.06em] text-stone">
            Growth board
          </p>
          <h2
            id={titleId}
            className="mt-0.5 font-serif-title text-xl font-semibold leading-tight text-forest-ink"
          >
            How your tank is growing
          </h2>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Close the growth board"
          onClick={closeGrowthBoard}
          className="text-forest-ink hover:bg-sand-pale hover:text-forest-ink"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </Button>
      </div>

      <ToggleGroup
        type="single"
        variant="raised"
        spacing={0.75}
        aria-label="Tank pace"
        value={pace}
        // Pressing the chosen pace again sends '': keep it.
        onValueChange={(id) => id && choosePace(id as PaceId)}
        className="grid w-full grid-cols-4 rounded-[11px] bg-sand-light p-[3px]"
      >
        {PACE_IDS.map((id) => (
          <ToggleGroupItem
            key={id}
            value={id}
            className="h-[30px] min-w-0 rounded-lg text-xs font-semibold data-[state=on]:shadow-[0_1px_2px_rgba(20,40,28,.12)]"
          >
            {PACE_LABELS[id]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <p className="-mt-1 mx-0.5 text-[11.5px] text-stone">{`${PACE_SUBTITLES[pace]}. ${watching}`}</p>

      {stats && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(110px,1fr))] gap-1.5">
          <Stat title="Tank age" value={stats.age} />
          {stats.pool && <Stat title="Pool cycle" value={stats.pool.value} sub={stats.pool.sub} />}
          <Stat title="Moss cover" value={stats.moss.value} sub={stats.moss.sub} />
        </div>
      )}

      <div className="rounded-xl bg-[#e6eee4] px-2.5 py-2 text-[12.5px] leading-snug text-[#24402f]">
        <p className="text-[10.5px] font-semibold uppercase tracking-[.04em] text-[#3d6b4c]">
          Up next
        </p>
        <p>
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

      <div className="-mx-4 flex-1 overflow-y-auto px-4 pb-4">
        <section aria-label="Plants">
          <SectionTitle count={plants.length}>Plants</SectionTitle>
          {plants.length === 0 ? (
            <Empty>No plants yet. Add some from the Flora tab.</Empty>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {plants.map((row) => (
                <li key={row.uid}>
                  <Button
                    variant="tile"
                    size="auto"
                    onMouseEnter={() => ping([row.uid])}
                    onFocus={() => ping([row.uid])}
                    onClick={() => select([row.uid])}
                    className={ROW}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-[13px] font-semibold text-ink-deep">
                        {row.name}
                      </span>
                      <Chip {...row.chip} />
                    </span>
                    <span className="flex justify-between gap-2 text-[11.5px] text-ink-brown">
                      <span>{row.phase}</span>
                      <span className="whitespace-nowrap tabular-nums text-stone-light">{`Size ${row.size}%`}</span>
                    </span>
                    <Bar
                      value={row.bar}
                      ticks={row.ticks}
                      tone={row.chip.tone}
                      label={`${row.name} progress`}
                    />
                    <span className="text-[11.5px] leading-snug text-stone">{row.next}</span>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-label="Animals">
          <SectionTitle count={animals.reduce((n, r) => n + r.count, 0)}>Animals</SectionTitle>
          {animals.length === 0 ? (
            <Empty>No animals yet. Add a cleanup crew from the Fauna tab.</Empty>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {animals.map((row) => (
                <li key={row.id}>
                  <Button
                    variant="tile"
                    size="auto"
                    onMouseEnter={() => ping(row.uids)}
                    onFocus={() => ping(row.uids)}
                    onClick={() => select(row.uids)}
                    className={ROW}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-[13px] font-semibold text-ink-deep">{`${row.name} ×${row.count}`}</span>
                      <Chip {...row.chip} />
                    </span>
                    {row.young !== undefined && (
                      <span className="text-[11.5px] text-ink-brown">{`Young growing up: ${row.young}%`}</span>
                    )}
                    {row.breeding && (
                      <>
                        <span className="text-[11.5px] text-ink-brown">{`Breeding · ${row.breeding.n} of ${row.breeding.cap}`}</span>
                        <Bar
                          value={row.breeding.n / row.breeding.cap}
                          label={`${row.name} colony size`}
                        />
                      </>
                    )}
                    <span className="text-[11.5px] leading-snug text-stone">{row.next}</span>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="mx-0.5 mt-3 text-[11px] leading-snug text-[#7a857c]">
          Times are estimates at 1× speed and assume conditions stay the same. Struggling plants
          slow down; resting ones pause until you care for them.
        </p>
      </div>
    </aside>
  )
}
