import { useEffect, useState } from 'react'
import { atom, useAtomValue } from 'jotai'
import { useAccountActions } from '@/components/account/auth/authEnv'
import {
  avatarColor,
  chipStatus,
  initialsOf,
  lastErrorAtom,
  lastSavedAtom,
  panelOpenAtom,
  phaseAtom,
  saveTimerAtom,
  userAtom,
  writingAtom,
  type AccountState,
} from '@/store/account'

const TICK_MS = 30_000

/** Just the fields chipStatus reads, so unrelated account changes do not re-render the chip. */
const chipInputAtom = atom(
  (get) =>
    ({
      phase: get(phaseAtom),
      user: get(userAtom),
      lastError: get(lastErrorAtom),
      writing: get(writingAtom),
      saveTimer: get(saveTimerAtom),
      lastSaved: get(lastSavedAtom),
    }) as AccountState,
)

/** Re-renders the caller on an interval so relative times ("Saved 2 min ago") keep aging. */
function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

/** The header chip (spec 431-436): dark "Sign in" when signed out, avatar + save status when in. */
export function AccountChip() {
  const now = useNow(TICK_MS)
  const status = chipStatus(useAtomValue(chipInputAtom), now)
  const userId = useAtomValue(userAtom)?.id ?? ''
  const panelOpen = useAtomValue(panelOpenAtom)
  const { openPanel } = useAccountActions()

  return (
    <button
      id="btn-account"
      type="button"
      className={`acct-chip${status.signedIn ? '' : ' is-signedout'}`}
      aria-label={`${status.name} ${status.text}`.trim()}
      aria-haspopup="dialog"
      aria-expanded={panelOpen}
      aria-controls="acct-panel"
      onClick={openPanel}
    >
      {status.signedIn ? (
        <span
          id="acct-avatar"
          className="acct-avatar"
          aria-hidden="true"
          style={{ background: avatarColor(userId) }}
        >
          {initialsOf(status.name)}
        </span>
      ) : (
        <svg
          className="acct-person h-4 w-4 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="8" r="4" />
          <path d="M4.5 20c1.4-3.6 4.3-5.5 7.5-5.5s6.1 1.9 7.5 5.5" />
        </svg>
      )}
      <span className="acct-text">
        <span id="acct-name" className="acct-name">
          {status.name}
        </span>
        <span className="acct-status-row">
          {status.signedIn && <span id="acct-dot" className="acct-dot" data-q={status.q} />}
          <span id="acct-status">{status.text}</span>
        </span>
      </span>
    </button>
  )
}
