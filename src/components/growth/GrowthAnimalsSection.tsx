import { Button } from '@/components/ui/button'
import { type FaunaRow } from './growthRows'
import { ROW } from './growthBoardConstants'
import { Bar, Chip, Empty, SectionTitle } from './GrowthBoardPrimitives'

/** The Animals section of the Growth board: one row per kind of animal. */
export function GrowthAnimalsSection({
  animals,
  ping,
  select,
}: {
  animals: FaunaRow[]
  ping: (uids: string[]) => void
  select: (uids: string[]) => void
}) {
  return (
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
  )
}
