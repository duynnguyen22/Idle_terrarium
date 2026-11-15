import { Button } from '@/components/ui/button'
import { type FloraRow } from './growthRows'
import { ROW } from './growthBoardConstants'
import { Bar, Chip, Empty, SectionTitle } from './GrowthBoardPrimitives'

/** The Plants section of the Growth board: one row per plant. */
export function GrowthPlantsSection({
  plants,
  ping,
  select,
}: {
  plants: FloraRow[]
  ping: (uids: string[]) => void
  select: (uids: string[]) => void
}) {
  return (
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
  )
}
