import { atom, useAtomValue } from 'jotai'
import { useRef, useState } from 'react'
import { useAuthEnv } from '@/components/account/auth/authEnv'
import type { JournalEntry } from '@/auth/backend'
import { cn } from 'cn'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { qualityTier } from '@/engine/room'
import { activeIdAtom, gardensAtom, journalAtom } from '@/store/account'
import {
  ACCT_H,
  ACCT_MUTED,
  ACCT_NOTE,
  ACCT_ROW,
  AccountButton,
  AccountCard,
} from './AccountPieces'

const DRAFT_KEY = 'botanica_journal_draft'

// A blocked sessionStorage (private mode, disabled site data) only loses the draft.
function readDraft(): string {
  try {
    return sessionStorage.getItem(DRAFT_KEY) ?? ''
  } catch {
    return ''
  }
}

function writeDraft(value: string) {
  try {
    sessionStorage.setItem(DRAFT_KEY, value)
  } catch {
    /* ignore */
  }
}

function clearDraft() {
  try {
    sessionStorage.removeItem(DRAFT_KEY)
  } catch {
    /* ignore */
  }
}

/** A reading chip, tinted by quality tier (fair, bad) when it has one. */
const CHIP =
  'j-chip h-auto rounded-full bg-linen px-[7px] py-0.5 text-[10.5px] font-normal text-[#3f4a42] tabular-nums data-[q=bad]:bg-[#fde2dd] data-[q=bad]:text-[#9b1c12] data-[q=fair]:bg-[#fbf0cc] data-[q=fair]:text-[#7a5300]'

function JournalItem({ entry }: { entry: JournalEntry }) {
  const m = entry.metrics
  const chips: [string, number | null][] = [
    [`${m.humidity}% RH`, null],
    [`${m.temp} °C`, null],
    [`Water ${m.water}`, m.water],
    [`Air ${m.air}`, m.air],
    [`${entry.summary.plants || 0} plants`, null],
  ]
  if (typeof m.pool === 'number') chips.splice(4, 0, [`Pool ${m.pool}`, m.pool])
  const when = new Date(entry.at).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="journal-item grid gap-1.5 border-t border-[#edf0ea] pt-2.5">
      <div className={ACCT_ROW}>
        <b className="text-xs text-forest-ink">{`Day ${entry.day}`}</b>
        <span className={ACCT_MUTED}>{when}</span>
      </div>
      {entry.note && (
        <p className="journal-note text-xs leading-[1.45] whitespace-pre-wrap text-ink-soft">
          {entry.note}
        </p>
      )}
      {entry.events && entry.events.length > 0 && (
        <ul className="pl-4 text-[11.5px] leading-[1.45] text-[#3f4a42]">
          {entry.events.map((ev, i) => (
            <li key={`${i}:${ev.text}`}>{ev.text}</li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-1">
        {chips.map(([text, q]) => (
          <Badge
            key={text}
            variant="secondary"
            className={CHIP}
            data-q={q == null ? undefined : qualityTier(q)}
          >
            {text}
          </Badge>
        ))}
      </div>
      {entry.issues.map((text, i) => (
        <p key={`${i}:${text}`} className="journal-issue text-[11px] leading-snug text-[#9a3412]">
          {text}
        </p>
      ))}
    </div>
  )
}

const activeGardenAtom = atom((get) => {
  const activeId = get(activeIdAtom)
  return get(gardensAtom).find((g) => g.id === activeId)
})

/** The Journal tab: a note composer and the open terrarium's entries, newest first (spec journalTab). */
export function JournalTab() {
  const { account } = useAuthEnv()
  const journal = useAtomValue(journalAtom)
  const active = useAtomValue(activeGardenAtom)
  const [note, setNote] = useState(readDraft)
  // The latest typed text, so a slow save does not clear words typed while it ran.
  const latest = useRef(note)

  const logToday = () => {
    const value = note
    // The store toasts on success and routes backend errors through handleCloudError itself. The
    // draft is cleared only once the entry is stored, and only if nothing new was typed meanwhile.
    account
      .addJournalEntry(value, false)
      .then((ok) => {
        if (!ok || latest.current !== value) return
        latest.current = ''
        setNote('')
        clearDraft()
      })
      .catch((e: unknown) => account.handleCloudError(e, { user: true }))
  }

  return (
    <AccountCard>
      <h3 className={ACCT_H}>{`Growth journal${active ? ` · ${active.name}` : ''}`}</h3>
      <p className={cn(ACCT_NOTE, ACCT_MUTED)}>
        An entry is added after each time away and each &quot;+1 day&quot;, listing what changed.
        Add notes about what you see.
      </p>
      <div className="flex items-end gap-2">
        <Textarea
          id="journal-note"
          className="min-h-0 min-w-0 flex-1 resize-y bg-[#fbfcfa] p-2 text-xs text-forest-ink md:text-xs"
          rows={2}
          maxLength={600}
          placeholder="New fern frond unfurling, springtails busy near the waterfall…"
          aria-label="Journal note"
          value={note}
          onChange={(e) => {
            latest.current = e.target.value
            setNote(e.target.value)
            writeDraft(e.target.value)
          }}
        />
        <AccountButton tone="primary" onClick={logToday}>
          Log today
        </AccountButton>
      </div>
      {!journal.length && <p className={cn(ACCT_NOTE, ACCT_MUTED)}>No entries yet.</p>}
      {journal.map((j) => (
        <JournalItem key={j.id} entry={j} />
      ))}
    </AccountCard>
  )
}
