import { useAtomValue, useStore } from 'jotai'
import { cn } from 'cn'
import { useEffect, type ReactNode } from 'react'
import type { CodePurpose } from '@/auth'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import { RESEND_WINDOW_MS, useAuthEnv, useSecondsLeft } from './authEnv'
import { busyAtom, viewDataAtom } from '@/store/account'

/** Shared layout classes for the auth screens. */
export const AUTH_SCREEN = 'grid gap-4'
/** Pass to FieldGroup: auth forms sit tighter than the shadcn default. */
export const AUTH_FORM = 'gap-3.5'
/** The text inputs in auth forms. */
export const AUTH_INPUT = 'h-10 bg-white'
/** The full-width primary action. */
export const AUTH_PRIMARY = 'h-10 w-full font-semibold'

/** A 24-unit stroked icon. */
function Ic({ children }: { children: ReactNode }) {
  return (
    <svg
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

/** The dialog's title; `acct-title` labels the dialog. */
export function AuthTitle({ children }: { children: ReactNode }) {
  return (
    <h2
      id="acct-title"
      className="text-center font-heading text-[22px] font-bold tracking-[-0.01em] text-balance text-forest-ink"
    >
      {children}
    </h2>
  )
}

export function AuthSub({ children, center }: { children: ReactNode; center?: boolean }) {
  return (
    <p
      className={cn(
        'max-w-[34ch] text-[13px] leading-normal text-balance text-muted-foreground',
        center && 'justify-self-center text-center',
      )}
    >
      {children}
    </p>
  )
}

/** The centred line under a form: "New to Botanica? Create an account", "Back to sign in". */
export function AuthFoot({ children }: { children: ReactNode }) {
  return <p className="text-center text-[12.5px] text-muted-foreground">{children}</p>
}

/** The round success (or mail) mark over a confirmation screen. */
export function DoneMark({ mail }: { mail?: boolean }) {
  return (
    <div
      className={cn(
        'flex size-13 items-center justify-center justify-self-center rounded-full [&_svg]:size-6.5 [&_svg]:stroke-[2.2]',
        mail ? 'bg-[#e6eff4] text-[#1d4a63]' : 'bg-secondary text-forest-mid',
      )}
    >
      {mail ? <MailIcon /> : <CheckIcon />}
    </div>
  )
}

/** The Botanica mark over a screen's title and optional subtitle. */
export function AuthHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="grid justify-items-center gap-2 text-center">
      <div className="mb-1 flex size-11 items-center justify-center rounded-[13px] bg-primary text-primary-foreground">
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
      <AuthTitle>{title}</AuthTitle>
      {sub && <AuthSub>{sub}</AuthSub>}
    </div>
  )
}

const BANNER = 'text-[12.5px] leading-[1.45]'
const BANNER_KIND = {
  info: 'border-[#cfe0ea] bg-[#e6eff4] text-[#1d4a63]',
  success: 'border-primary/15 bg-secondary text-forest-mid',
  error: 'border-destructive/20 bg-destructive/5',
} as const

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
    <Button
      type="button"
      variant="link"
      size="auto"
      className={cn(
        'p-0 text-[12.5px] font-semibold text-forest-mid underline decoration-forest-mid/35 underline-offset-3 hover:decoration-current',
        className,
      )}
      onClick={onClick}
    >
      {children}
    </Button>
  )
}

/** Google and Apple buttons; both open the provider consent screen. */
export function Providers({ mode }: { mode: 'signin' | 'signup' }) {
  const store = useStore()
  const { account } = useAuthEnv()
  const verb = mode === 'signup' ? 'Sign up' : 'Continue'
  const go = (provider: string) => {
    account.goView('provider', { provider, email: store.get(viewDataAtom).email ?? '' })
  }
  return (
    <div className="grid grid-cols-2 gap-2">
      {(
        [
          ['Google', 'G'],
          ['Apple', 'A'],
        ] as const
      ).map(([provider, mono]) => (
        <Button
          key={provider}
          type="button"
          variant="outline"
          size="lg"
          className="h-10 bg-white text-forest-ink"
          onClick={() => go(provider)}
        >
          <span
            className="inline-flex size-5.5 items-center justify-center rounded-full bg-muted text-[11px] font-bold text-primary"
            aria-hidden="true"
          >
            {mono}
          </span>
          {`${verb} with ${provider}`}
        </Button>
      ))}
    </div>
  )
}

export function Divider({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 text-[11.5px] text-stone-light">
      <Separator className="flex-1" />
      <span>{children}</span>
      <Separator className="flex-1" />
    </div>
  )
}

/** The yellow prototype note. A note, not an alert: it never changes. */
export function ProtoAlert({ children }: { children: ReactNode }) {
  return (
    <Alert
      role="note"
      className="border-[#eedfa8] bg-[#faf3dc] text-[11.5px] leading-normal text-[#6b5a2e]"
    >
      <AlertDescription className="text-current">{children}</AlertDescription>
    </Alert>
  )
}

/** The prototype disclaimer with the demo account. */
export function ProtoNote() {
  return (
    <ProtoAlert>
      Prototype sign-in: accounts are kept in this browser and nothing is sent anywhere. Use a
      made-up password. Try <b>demo@botanica.app</b> / <b>terrarium1</b>.
    </ProtoAlert>
  )
}

/** The dashed "Prototype inbox" card that stands in for the person's email. */
export function InboxCard({ children }: { children: ReactNode }) {
  return (
    <Alert
      role="note"
      className="gap-1.5 rounded-xl border-dashed border-[#c9b77a] bg-[#fffaf0] px-3 py-2.5 text-[12.5px] text-[#3f3a2a] *:[svg]:text-[#7a6a33]"
    >
      <MailIcon />
      <AlertTitle className="text-[11px] font-bold text-[#7a6a33]">Prototype inbox</AlertTitle>
      <AlertDescription className="grid justify-items-start gap-1.5 text-[12.5px] text-current">
        {children}
      </AlertDescription>
    </Alert>
  )
}

/** Prototype only: shows the pending code (or magic link) the local auth service issued. */
export function ProtoInbox({ email, purpose }: { email: string; purpose: CodePurpose }) {
  const { auth } = useAuthEnv()
  // Re-read on every render: a resend replaces the pending code.
  const code = auth.devCode(email)
  if (!code) return null
  return (
    <InboxCard>
      {purpose === 'magic' ? (
        <p>Your sign-in link is ready.</p>
      ) : (
        <p>
          Your code is{' '}
          <b className="text-base tracking-[0.14em] text-forest-ink tabular-nums">{code}</b>
        </p>
      )}
    </InboxCard>
  )
}

/** "Didn’t get it?" with a countdown, then a link that sends another code or link. */
export function ResendRow({ email, purpose }: { email: string; purpose: CodePurpose }) {
  const resendAt = useAtomValue(viewDataAtom).resendAt ?? 0
  return <Resend key={resendAt} until={resendAt} email={email} purpose={purpose} />
}

const SMALL = 'text-center text-xs text-muted-foreground'

function Resend({ until, email, purpose }: { until: number; email: string; purpose: CodePurpose }) {
  const { account, auth } = useAuthEnv()
  const left = useSecondsLeft(until)
  if (left > 0) {
    return (
      <p className={SMALL}>
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
    <p className={SMALL}>
      {'Didn’t get it? '}
      <LinkButton onClick={resend}>Send it again</LinkButton>
    </p>
  )
}
