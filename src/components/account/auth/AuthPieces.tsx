import { useAtomValue, useStore } from 'jotai'
import { useEffect, type ReactNode } from 'react'
import type { CodePurpose } from '@/auth'
import { RESEND_WINDOW_MS, useAuthEnv, useSecondsLeft } from './authEnv'
import { busyAtom, viewDataAtom } from '@/store/account'

/** A 24-unit stroked icon in the spec's `.ic` style. */
function Ic({ children }: { children: ReactNode }) {
  return (
    <svg
      className="ic"
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export const EyeIcon = () => (
  <Ic>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </Ic>
)
export const EyeOffIcon = () => (
  <Ic>
    <path d="M3 3l18 18M10.6 5.1A10.8 10.8 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6A17.4 17.4 0 0 0 2 12s3.6 7 10 7a10 10 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  </Ic>
)
export const MailIcon = () => (
  <Ic>
    <path d="M3 6h18v12H3z" />
    <path d="M3 7l9 6 9-6" />
  </Ic>
)
export const CheckIcon = () => (
  <Ic>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Ic>
)

/** The Botanica mark over a screen's title and optional subtitle (spec authHeader). */
export function AuthHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="auth-head">
      <div className="auth-mark">
        <svg
          width={24}
          height={24}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path d="M12 2L4 7v10l8 5 8-5V7l-8-5z" strokeLinejoin="round" />
          <path
            d="M12 22V12M12 12C12 9 15 7 17 8C17 11 15 12 12 12ZM12 12C12 9 9 7 7 8C7 11 9 12 12 12Z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <h2 id="acct-title" className="auth-title">
        {title}
      </h2>
      {sub && <p className="auth-sub">{sub}</p>}
    </div>
  )
}

/** The screen's info/success/error banner from viewData.banner. */
export function Banner() {
  const banner = useAtomValue(viewDataAtom).banner
  if (!banner) return null
  return (
    <div className={`auth-banner ${banner.kind}`} role="status">
      {banner.text}
    </div>
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
  return (
    <div className="auth-banner error" role="alert">
      {error}
    </div>
  )
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
    <div className="auth-banner error" role="alert">
      {'Too many attempts. Try again in '}
      <span>{`${left} s`}</span>.
    </div>
  )
}

/** The primary submit button; shows a spinner and "Please wait…" while a request runs. */
export function SubmitButton({ children }: { children: ReactNode }) {
  const busy = useAtomValue(busyAtom)
  return (
    <button type="submit" className="auth-btn primary" disabled={busy}>
      {busy && <span className="auth-spin" aria-hidden="true" />}
      {busy ? 'Please wait…' : children}
    </button>
  )
}

export function LinkButton({
  children,
  onClick,
  className,
}: {
  children: ReactNode
  onClick: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      className={`auth-link${className ? ` ${className}` : ''}`}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

/** Google and Apple buttons; both open the provider consent screen (spec providers). */
export function Providers({ mode }: { mode: 'signin' | 'signup' }) {
  const store = useStore()
  const { account } = useAuthEnv()
  const verb = mode === 'signup' ? 'Sign up' : 'Continue'
  const go = (provider: string) => {
    account.goView('provider', { provider, email: store.get(viewDataAtom).email ?? '' })
  }
  return (
    <div className="auth-providers">
      {(
        [
          ['Google', 'G'],
          ['Apple', 'A'],
        ] as const
      ).map(([provider, mono]) => (
        <button
          key={provider}
          type="button"
          className="auth-btn provider"
          onClick={() => go(provider)}
        >
          <span className="auth-mono" aria-hidden="true">
            {mono}
          </span>
          {`${verb} with ${provider}`}
        </button>
      ))}
    </div>
  )
}

export function Divider({ children }: { children: ReactNode }) {
  return (
    <div className="auth-divider">
      <span>{children}</span>
    </div>
  )
}

/** The prototype disclaimer with the demo account. */
export function ProtoNote() {
  return (
    <p className="auth-proto">
      Prototype sign-in: accounts are kept in this browser and nothing is sent anywhere. Use a
      made-up password. Try <b>demo@botanica.app</b> / <b>terrarium1</b>.
    </p>
  )
}

/** Prototype only: shows the pending code (or magic link) the local auth service issued. */
export function ProtoInbox({ email, purpose }: { email: string; purpose: CodePurpose }) {
  const { auth } = useAuthEnv()
  // Re-read on every render: a resend replaces the pending code.
  const code = auth.devCode(email)
  if (!code) return null
  return (
    <div className="auth-inbox">
      <div className="auth-inbox-h">
        <MailIcon />
        Prototype inbox
      </div>
      {purpose === 'magic' ? (
        <p>Your sign-in link is ready.</p>
      ) : (
        <p>
          Your code is <b className="tabular-nums">{code}</b>
        </p>
      )}
    </div>
  )
}

/** "Didn’t get it?" with a countdown, then a link that sends another code or link. */
export function ResendRow({ email, purpose }: { email: string; purpose: CodePurpose }) {
  const resendAt = useAtomValue(viewDataAtom).resendAt ?? 0
  return <Resend key={resendAt} until={resendAt} email={email} purpose={purpose} />
}

function Resend({ until, email, purpose }: { until: number; email: string; purpose: CodePurpose }) {
  const { account, auth } = useAuthEnv()
  const left = useSecondsLeft(until)
  if (left > 0) {
    return (
      <p className="auth-small">
        {'Didn’t get it? You can send another in '}
        <span>{`${left} s`}</span>.
      </p>
    )
  }
  const resend = () =>
    void account.run(async () => {
      await auth.resendCode(email, purpose)
      account.setViewData({
        resendAt: Date.now() + RESEND_WINDOW_MS,
        banner: {
          kind: 'success',
          text: `We sent a new ${purpose === 'magic' ? 'link' : 'code'} to ${email}.`,
        },
      })
    })
  return (
    <p className="auth-small">
      {'Didn’t get it? '}
      <LinkButton onClick={resend}>Send it again</LinkButton>
    </p>
  )
}
