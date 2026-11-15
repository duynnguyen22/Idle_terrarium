import { useAtomValue } from 'jotai'
import type { CodePurpose } from '@/auth'
import { RESEND_WINDOW_MS, useAuthEnv, useSecondsLeft } from '../authEnv'
import { viewDataAtom } from '@/services/account'
import { LinkButton } from './LinkButton'

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
