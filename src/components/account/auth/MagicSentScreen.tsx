import { useAtomValue, useStore } from 'jotai'
import { useAuthEnv } from './authEnv'
import { busyAtom, phaseAtom, viewDataAtom } from '@/store/account'
import { Button } from '@/components/ui/button'
import {
  AUTH_SCREEN,
  AuthFoot,
  AuthSub,
  AuthTitle,
  Banner,
  DoneMark,
  FormError,
  InboxCard,
  LinkButton,
  ResendRow,
} from './AuthPieces'

/** The sign-in link was sent; the prototype inbox opens it (spec Screens.magicSent). */
export function MagicSentScreen() {
  const { account, auth, toast } = useAuthEnv()
  const store = useStore()
  const email = useAtomValue(viewDataAtom).email ?? ''
  const busy = useAtomValue(busyAtom)

  const openLink = () =>
    void account.run(async () => {
      const r = await auth.completeMagicLink(email)
      // The form is done: the button should not read busy while the session loads.
      store.set(busyAtom, false)
      await account.beginSession(r.user, r.session, { isNew: r.isNew })
      if (store.get(phaseAtom) === 'cloud') {
        account.closePanel()
        toast(`Signed in as ${r.user.email}`)
      }
    })

  return (
    <div className={AUTH_SCREEN}>
      <DoneMark mail />
      <AuthTitle>Check your inbox</AuthTitle>
      <AuthSub center>
        {'We sent a sign-in link to '}
        <b>{email}</b>. It works once and expires in 10 minutes.
      </AuthSub>
      <Banner />
      <InboxCard>
        <p>Botanica: Your sign-in link</p>
        <Button
          type="button"
          className="h-8.5 px-3.5 text-[12.5px] font-semibold"
          disabled={busy}
          data-autofocus="1"
          onClick={openLink}
        >
          Open the link
        </Button>
      </InboxCard>
      <FormError />
      <ResendRow email={email} purpose="magic" />
      <AuthFoot>
        <LinkButton onClick={() => account.goView('signin')}>Back to sign in</LinkButton>
      </AuthFoot>
    </div>
  )
}
