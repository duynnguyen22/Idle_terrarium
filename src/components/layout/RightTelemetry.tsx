import { atom, useAtomValue } from 'jotai'
import { cn } from 'cn'
import { useMemo } from 'react'
import { BotanistNotes, CareList } from '@/components/telemetry/BotanistNotes'
import { EcoStats } from '@/components/telemetry/EcoStats'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import type { PlacedItem } from '@/data/types'
import { envModel } from '@/engine/room'
import { isLampOn } from '@/engine/simulation/clock'
import {
  hasGrowLampAtom,
  hasLidAtom,
  lightingAtom,
  roomAtom,
  worldSnapshotAtom,
} from '@/store/studio'
import { telemetryAtom } from '@/store/telemetry'
import { BiosphereGauges } from './BiosphereGauges'

const NO_ITEMS: PlacedItem[] = []
const itemsAtom = atom((get) => get(worldSnapshotAtom)?.items ?? NO_ITEMS)
const lampOnAtom = atom((get) =>
  isLampOn({ hasGrowLamp: get(hasGrowLampAtom), lighting: get(lightingAtom) }),
)

function badge(warns: number): [label: string, cls: string] {
  if (warns === 0) return ['Thriving', 'bg-emerald-100 text-emerald-800']
  if (warns < 3) return ['Adjusting', 'bg-amber-100 text-amber-900']
  return ['Needs care', 'bg-rose-100 text-rose-800']
}

export function RightTelemetry({ drawerOpen = false }: { drawerOpen?: boolean }) {
  const t = useAtomValue(telemetryAtom)
  const items = useAtomValue(itemsAtom)
  const lampOn = useAtomValue(lampOnAtom)
  const room = useAtomValue(roomAtom)
  const hasLid = useAtomValue(hasLidAtom)
  const m = useMemo(() => envModel(room, hasLid), [room, hasLid])
  const [badgeLabel, badgeCls] = badge(t.careIssues.filter((i) => i.level === 'warn').length)

  return (
    <aside
      id="right-sidebar"
      tabIndex={-1}
      data-drawer-open={drawerOpen}
      className={cn(
        'z-20 flex w-72 shrink-0 flex-col gap-3.5 overflow-y-auto border-l border-sand-border bg-paper p-4 max-lg:absolute max-lg:inset-y-0 max-lg:right-0 max-lg:z-40 max-lg:max-w-[85vw] max-lg:shadow-xl max-lg:transition-[transform,visibility] motion-reduce:max-lg:transition-none',
        !drawerOpen && 'max-lg:invisible max-lg:translate-x-full',
      )}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-forest-ink">Biosphere health</h2>
        <Badge className={cn('text-[11px] font-semibold', badgeCls)}>{badgeLabel}</Badge>
      </div>
      <BotanistNotes />
      <BiosphereGauges t={t} items={items} lampOn={lampOn} room={room} m={m} />
      <CareList />
      <EcoStats />
      <div className="mt-auto flex flex-col gap-3">
        <Separator className="bg-sand-border" />
        <div className="flex items-center justify-between text-[11px] text-stone">
          <span>Nothing dies here; plants recover</span>
          <span className="font-semibold text-forest-deep">{items.length} specimens</span>
        </div>
      </div>
    </aside>
  )
}
