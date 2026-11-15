import { type ReactNode } from 'react'
import type { CodePurpose } from '@/auth'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useAuthEnv } from '../authEnv'
import { MailIcon } from './AuthIcons'

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
