import { useEffect, useState } from 'react'
import { atom, useAtomValue } from 'jotai'
import { cn } from 'cn'
import { Button } from '@/components/ui/button'
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

/**
 * The header chip (spec 431-436): dark "Sign in" when signed out, avatar + save status when in.
 * Below lg there is no room for the text: avatar or person icon only (the label stays as
 * aria-label), with the save-status dot as a badge on the avatar's bottom-right corner.
 */
export function AccountChip() {
  const now = useNow(TICK_MS)
  const status = chipStatus(useAtomValue(chipInputAtom), now)
  const userId = useAtomValue(userAtom)?.id ?? ''
  const panelOpen = useAtomValue(panelOpenAtom)
  const { openPanel } = useAccountActions()
  const signedIn = status.signedIn

  return (
    <Button
      id="btn-account"
      variant={signedIn ? 'sand' : 'default'}
      size="lg"
      className={cn(
        'relative max-w-[220px] gap-2 rounded-full pr-2.5 pl-1 max-lg:size-9 max-lg:gap-0 max-lg:p-0',
        !signedIn && 'is-signedout pr-3.5 pl-3 hover:bg-forest-dark',
      )}
      aria-label={`${status.name} ${status.text}`.trim()}
      aria-haspopup="dialog"
      aria-expanded={panelOpen}
      aria-controls="acct-panel"
      onClick={openPanel}
    >
      {signedIn ? (
        <span
          id="acct-avatar"
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold tracking-wide text-white"
          aria-hidden="true"
          style={{ background: avatarColor(userId) }}
        >
          {initialsOf(status.name)}
        </span>
      ) : (
        <svg
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
      <span className="flex min-w-0 flex-col items-start text-left leading-tight">
        <span
          id="acct-name"
          className={cn(
            'max-w-full truncate text-[11.5px] font-semibold max-lg:hidden',
            signedIn ? 'text-forest-ink' : 'text-white',
          )}
        >
          {status.name}
        </span>
        <span
          className={cn(
            'flex items-center gap-[5px] text-[10.5px] font-normal',
            signedIn ? 'text-stone' : 'text-[#cfe3d5]',
          )}
        >
          {signedIn && (
            <span
              id="acct-dot"
              data-q={status.q}
              className="size-[7px] shrink-0 rounded-full bg-[#9aa59c] data-[q=busy]:bg-[#d4a017] data-[q=err]:bg-[#d1432f] data-[q=local]:bg-[#8a948c] data-[q=ok]:bg-[#2f8a4e] max-lg:absolute max-lg:right-[3px] max-lg:bottom-[3px] max-lg:ring-2 max-lg:ring-sand-pale max-lg:group-hover/button:ring-sand-track"
            />
          )}
          <span id="acct-status" className="max-lg:hidden">
            {status.text}
          </span>
        </span>
      </span>
    </Button>
  )
}
