import type { JournalEntry } from '@/auth/backend'
import { hasPool } from '@/engine/geometry'
import { poolScore } from '@/engine/simulation/ecology'
import { envModel } from '@/engine/room'
import { gardenSummary } from '@/services/gardenSnapshot'
import { studioStateAtom } from '@/store/studio'
import { telemetryAtom } from '@/store/telemetry'
import { MAX_ISSUES, MAX_NOTE } from './constants'
import type { AccountActions } from './contract'
import type { AccountContext } from './context'

/** The open terrarium's growth journal: logging an entry and reloading the list. */
export function journalActions(
  ctx: AccountContext,
): Pick<AccountActions, 'addJournalEntry' | 'refreshJournal'> {
  const { store, deps, now, state, setAccount, actions } = ctx
  return {
    async addJournalEntry(note, auto, extra) {
      const { phase, activeId, backend } = state()
      if (phase !== 'cloud' || !activeId || !backend) return false
      if (extra?.key !== undefined && extra.key === state().journal[0]?.key) return false
      const s = store.get(studioStateAtom)
      const t = store.get(telemetryAtom)
      const m = envModel(s.room, s.hasLid)
      const world = deps.getWorld()
      const entry: Omit<JournalEntry, 'id'> = {
        at: now(),
        day: Math.floor(s.dayCount),
        auto,
        note: note.trim().slice(0, MAX_NOTE),
        metrics: {
          humidity: Math.round(t.humidity),
          temp: +t.temperature.toFixed(1),
          moisture: Math.round(t.soilMoisture),
          nutrients: Math.round(t.nutrients),
          water: m.water,
          air: m.airEff,
          // A tank without a pool has no pool score (its cycle progress sits at 1, which would read "Pool 100").
          ...(hasPool(s.waterSplit) ? { pool: Math.round(poolScore(s.cycleProgress)) } : {}),
        },
        summary: gardenSummary(s, world ? world.items : (s.worldSnapshot?.items ?? [])),
        issues: t.careIssues
          .filter((i) => i.level === 'warn')
          .slice(0, MAX_ISSUES)
          .map((i) => i.text),
        ...(extra?.events ? { events: extra.events } : {}),
        ...(extra?.key !== undefined ? { key: extra.key } : {}),
      }
      try {
        await backend.addJournal(activeId, entry)
        await actions.refreshJournal()
        if (!auto) deps.toast('Logged in your growth journal')
        return true
      } catch (e) {
        actions.handleCloudError(e, { user: !auto })
        return false
      }
    },

    async refreshJournal() {
      const { backend, activeId } = state()
      if (!backend || !activeId) {
        setAccount({ journal: [] })
        return
      }
      try {
        const journal = await backend.listJournal(activeId)
        if (state().backend === backend && state().activeId === activeId) setAccount({ journal })
      } catch (e) {
        actions.handleCloudError(e)
      }
    },
  }
}
