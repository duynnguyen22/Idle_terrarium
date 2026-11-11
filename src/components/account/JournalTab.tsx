import { useRef, useState } from 'react'
import { useAccount, useAuthEnv } from '@/components/account/auth/authEnv'
import type { JournalEntry } from '@/auth/backend'
import { qualityTier } from '@/engine/room'

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
    <div className="journal-item">
      <div className="acct-row">
        <b>{`Day ${entry.day}`}</b>
        <span className="acct-muted">{when}</span>
      </div>
      {entry.note && <p className="journal-note">{entry.note}</p>}
      {entry.events && entry.events.length > 0 && (
        <ul className="journal-events">
          {entry.events.map((ev, i) => (
            <li key={`${i}:${ev.text}`}>{ev.text}</li>
          ))}
        </ul>
      )}
      <div className="journal-chips">
        {chips.map(([text, q]) => (
          <span key={text} className="j-chip" data-q={q == null ? undefined : qualityTier(q)}>
            {text}
          </span>
        ))}
      </div>
      {entry.issues.map((text, i) => (
        <p key={`${i}:${text}`} className="journal-issue">
          {text}
        </p>
      ))}
    </div>
  )
}

/** The Journal tab: a note composer and the open terrarium's entries, newest first (spec journalTab). */
export function JournalTab() {
  const { store } = useAuthEnv()
  const journal = useAccount((s) => s.journal)
  const active = useAccount((s) => s.gardens.find((g) => g.id === s.activeId))
  const [note, setNote] = useState(readDraft)
  // The latest typed text, so a slow save does not clear words typed while it ran.
  const latest = useRef(note)

  const logToday = () => {
    const value = note
    // The store toasts on success and routes backend errors through handleCloudError itself. The
    // draft is cleared only once the entry is stored, and only if nothing new was typed meanwhile.
    store
      .getState()
      .addJournalEntry(value, false)
      .then((ok) => {
        if (!ok || latest.current !== value) return
        latest.current = ''
        setNote('')
        clearDraft()
      })
      .catch((e: unknown) => store.getState().handleCloudError(e, { user: true }))
  }

  return (
    <div className="acct-card">
      <h3 className="acct-h">{`Growth journal${active ? ` · ${active.name}` : ''}`}</h3>
      <p className="acct-note acct-muted">
        An entry is added after each time away and each &quot;+1 day&quot;, listing what changed.
        Add notes about what you see.
      </p>
      <div className="journal-compose">
        <textarea
          id="journal-note"
          className="journal-input"
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
        <button type="button" className="g-btn primary" onClick={logToday}>
          Log today
        </button>
      </div>
      {!journal.length && <p className="acct-note acct-muted">No entries yet.</p>}
      {journal.map((j) => (
        <JournalItem key={j.id} entry={j} />
      ))}
    </div>
  )
}
