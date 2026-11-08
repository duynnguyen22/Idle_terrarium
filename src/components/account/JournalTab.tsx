import { useState } from 'react'
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

  const logToday = () => {
    const value = note
    setNote('')
    clearDraft()
    // The store toasts on success and routes backend errors through handleCloudError itself.
    store
      .getState()
      .addJournalEntry(value, false)
      .catch((e: unknown) => store.getState().handleCloudError(e))
  }

  return (
    <div className="acct-card">
      <h3 className="acct-h">{`Growth journal${active ? ` · ${active.name}` : ''}`}</h3>
      <p className="acct-note acct-muted">
        An entry is added each time you press “+1 day”. Add notes about what you see.
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
