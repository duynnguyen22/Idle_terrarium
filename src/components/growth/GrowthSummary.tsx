import { Stat } from './GrowthBoardPrimitives'
import { type TankStats } from './growthRows'

/** The row of tank-wide numbers: tank age, pool cycle (when there is a pool) and moss cover. */
export function GrowthTankStats({ stats }: { stats: TankStats }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(110px,1fr))] gap-1.5">
      <Stat title="Tank age" value={stats.age} />
      {stats.pool && <Stat title="Pool cycle" value={stats.pool.value} sub={stats.pool.sub} />}
      <Stat title="Moss cover" value={stats.moss.value} sub={stats.moss.sub} />
    </div>
  )
}

/** The "Up next" card: the soonest thing due in the tank. */
export function GrowthUpNext({ next }: { next: { name: string; next: string } | null }) {
  return (
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
  )
}
