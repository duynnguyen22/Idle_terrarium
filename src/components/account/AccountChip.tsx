import { useEffect, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useAccount } from '@/components/account/auth/authEnv'
import { avatarColor, chipStatus, initialsOf } from '@/store/useAccountStore'

const TICK_MS = 30_000

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
  // The derived status is a flat object of primitives, so a shallow compare skips unrelated store changes.
  const status = useAccount(useShallow((s) => chipStatus(s, now)))
  const userId = useAccount((s) => s.user?.id ?? '')
  const panelOpen = useAccount((s) => s.panelOpen)
  const openPanel = useAccount((s) => s.openPanel)

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
