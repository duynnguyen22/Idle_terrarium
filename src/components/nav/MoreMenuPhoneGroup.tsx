import { useAtomValue } from 'jotai'
import type { ReactNode } from 'react'
import { useAccountActions } from '@/components/account/auth/authEnv'
import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { phaseAtom, userAtom } from '@/services/account'
import { plusOneDay } from '@/services/awayFlow'
import { audioEnabledAtom, realTimeModeAtom, timeSpeedAtom } from '@/store/studio'
import { showToast } from '@/store/toast'
import { activeSpeed, applySpeed, type SpeedId } from './speeds'
import { takeSnapshot, toggleAudio } from './studioActions'

const ROW = 'min-h-11 gap-2.5 rounded-[10px] px-3 text-sm font-medium text-[#1f2924]'
const SEG =
  'min-h-11 justify-center rounded-[10px] bg-[#eef1ea] px-1 text-sm font-semibold text-forest-deep data-[state=checked]:bg-forest-deep data-[state=checked]:text-white focus:data-[state=checked]:bg-forest-deep focus:data-[state=checked]:text-white focus:data-[state=checked]:**:text-white [&>[data-slot=dropdown-menu-radio-item-indicator]]:hidden'

const SEG_ITEMS: { id: SpeedId; label: string }[] = [
  { id: 'rt', label: 'Live' },
  { id: 'pause', label: 'Pause' },
  { id: '1x', label: '1×' },
  { id: '5x', label: '5×' },
]

/** Keeps the menu open so the new state shows. */
const keepOpen = (run: () => void) => (e: Event) => {
  e.preventDefault()
  run()
}

/** A stroked 24 px row icon; the paths are the prototype menu's (spec 814–826). */
function RowIcon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-[18px]"
    >
      {children}
    </svg>
  )
}

/** Handheld-only rows standing in for the top-bar controls that no longer fit (spec 813–828). */
export function MoreMenuPhoneGroup() {
  const phase = useAtomValue(phaseAtom)
  const name = useAtomValue(userAtom)?.name ?? ''
  const active = activeSpeed(useAtomValue(realTimeModeAtom), useAtomValue(timeSpeedAtom))
  const audioEnabled = useAtomValue(audioEnabledAtom)
  const { openPanel } = useAccountActions()
  // Same test as the header chip (chipStatus): only cloud and onboarding count as signed in.
  const signedIn = phase === 'cloud' || phase === 'onboarding'

  return (
    <DropdownMenuGroup>
      <DropdownMenuItem onSelect={openPanel} className={ROW}>
        <RowIcon>
          <circle cx="12" cy="8" r="4" />
          <path d="M4.5 20c1.4-3.6 4.3-5.5 7.5-5.5s6.1 1.9 7.5 5.5" />
        </RowIcon>
        {signedIn ? `Account: ${name}` : 'Sign in to save your work'}
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuLabel className="px-3 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
        Time
      </DropdownMenuLabel>
      <DropdownMenuRadioGroup
        aria-label="Time speed"
        value={active}
        onValueChange={applySpeed}
        className="grid grid-cols-4 gap-1 px-1.5 pt-0.5 pb-1.5"
      >
        {SEG_ITEMS.map((s) => (
          <DropdownMenuRadioItem
            key={s.id}
            value={s.id}
            onSelect={(e) => e.preventDefault()}
            className={SEG}
          >
            {s.label}
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
      <DropdownMenuItem onSelect={() => showToast(plusOneDay())} className={ROW}>
        <RowIcon>
          <path d="M5 4v16M19 4v16M9 8l6 4l-6 4z" />
        </RowIcon>
        Skip ahead one tank day
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onSelect={keepOpen(toggleAudio)} className={ROW}>
        <RowIcon>
          <path d="M11 5L6 9H3v6h3l5 4zM15.5 9.5a3.5 3.5 0 0 1 0 5M18 7a7 7 0 0 1 0 10" />
        </RowIcon>
        Ambient sound
        <small className="ml-auto text-xs text-stone">{audioEnabled ? 'On' : 'Off'}</small>
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => void takeSnapshot()} className={ROW}>
        <RowIcon>
          <path d="M4 8h3l2-3h6l2 3h3v11H4zM12 10a3.5 3.5 0 1 0 0 7a3.5 3.5 0 1 0 0-7z" />
        </RowIcon>
        Save a snapshot picture
      </DropdownMenuItem>
    </DropdownMenuGroup>
  )
}
