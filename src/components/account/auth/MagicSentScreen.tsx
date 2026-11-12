import { useAtomValue, useStore } from 'jotai'
import { useAuthEnv } from './authEnv'
import { busyAtom, phaseAtom, viewDataAtom } from '@/store/account'
import { Banner, FormError, LinkButton, MailIcon, ResendRow } from './AuthPieces'

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
    <div className="auth-screen">
      <div className="auth-done mail">
        <MailIcon />
      </div>
      <h2 id="acct-title" className="auth-title">
        Check your inbox
      </h2>
      <p className="auth-sub center">
        {'We sent a sign-in link to '}
        <b>{email}</b>. It works once and expires in 10 minutes.
      </p>
      <Banner />
      <div className="auth-inbox">
        <div className="auth-inbox-h">
          <span>
            <MailIcon />
          </span>
          Prototype inbox
        </div>
        <p>Botanica: Your sign-in link</p>
        <button
          type="button"
          className="auth-btn primary small"
          disabled={busy}
          data-autofocus="1"
          onClick={openLink}
        >
          Open the link
        </button>
      </div>
      <FormError />
      <ResendRow email={email} purpose="magic" />
      <p className="auth-foot">
        <LinkButton onClick={() => account.goView('signin')}>Back to sign in</LinkButton>
      </p>
    </div>
  )
}
