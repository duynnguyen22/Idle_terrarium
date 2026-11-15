import { useAtomValue } from 'jotai'
import { cn } from 'cn'
import { useEffect, type ReactNode } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuthEnv, useSecondsLeft } from '../authEnv'
import { viewDataAtom } from '@/services/account'
import { BANNER, BANNER_KIND } from './bannerStyles'

/** A coloured notice. Errors are alerts; info and success are polite status messages. */
export function Notice({
  kind,
  children,
}: {
  kind: keyof typeof BANNER_KIND
  children: ReactNode
}) {
  return (
    <Alert
      role={kind === 'error' ? 'alert' : 'status'}
      variant={kind === 'error' ? 'destructive' : 'default'}
      className={cn(BANNER, BANNER_KIND[kind])}
    >
      <AlertDescription className="text-current">{children}</AlertDescription>
    </Alert>
  )
}

/** The screen's info/success/error banner from viewData.banner. */
export function Banner() {
  const banner = useAtomValue(viewDataAtom).banner
  if (!banner) return null
  // The stored banner announces politely whatever its colour.
  return (
    <Alert role="status" className={cn(BANNER, BANNER_KIND[banner.kind])}>
      <AlertDescription className="text-current">{banner.text}</AlertDescription>
    </Alert>
  )
}

/** The form-level error: a ticking lockout countdown while locked, else viewData.error. */
export function FormError() {
  const lockedUntil = useAtomValue(viewDataAtom).lockedUntil ?? 0
  const error = useAtomValue(viewDataAtom).error ?? null
  if (lockedUntil) return <Lockout key={lockedUntil} until={lockedUntil} error={error} />
  return <ErrorBanner error={error} />
}

function ErrorBanner({ error }: { error: string | null }) {
  if (!error) return null
  return <Notice kind="error">{error}</Notice>
}

function Lockout({ until, error }: { until: number; error: string | null }) {
  const { account } = useAuthEnv()
  const left = useSecondsLeft(until)
  useEffect(() => {
    // The lockout's own "Too many attempts." goes with it.
    if (left <= 0) account.setViewData({ lockedUntil: 0, error: null })
  }, [left, account])
  if (left <= 0) return <ErrorBanner error={error} />
  return (
    <Notice kind="error">
      {'Too many attempts. Try again in '}
      <span>{`${left} s`}</span>.
    </Notice>
  )
}
