import { useAtomValue } from 'jotai'
import { type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { busyAtom } from '@/services/account'
import { AUTH_PRIMARY } from './authClasses'

/** The primary submit button; shows a spinner and "Please wait…" while a request runs. */
export function SubmitButton({ children }: { children: ReactNode }) {
  const busy = useAtomValue(busyAtom)
  return (
    <Button type="submit" size="lg" className={AUTH_PRIMARY} disabled={busy}>
      {busy && <Spinner data-icon="inline-start" aria-hidden="true" />}
      {busy ? 'Please wait…' : children}
    </Button>
  )
}
