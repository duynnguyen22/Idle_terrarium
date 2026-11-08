import { useAccount, useAuthEnv } from '@/components/account/auth/authEnv'
import { avatarColor, initialsOf, type AccountTab } from '@/store/useAccountStore'
import { GardensTab } from './GardensTab'

const TABS: [AccountTab, string][] = [
  ['terrariums', 'Terrariums'],
  ['journal', 'Journal'],
  ['profile', 'Profile & security'],
]

const SIGNED_OUT_TEXT = 'You’re signed out. Your terrariums are safe in your account.'

/** The signed-in account view: who, the three tabs, where saves go and Sign out (spec accountScreen). */
export function AccountScreen() {
  const { store, auth } = useAuthEnv()
  const user = useAccount((s) => s.user)
  const tab = useAccount((s) => s.tab)
  const cloud = useAccount((s) => s.backend?.kind === 'cloud')
  const busy = useAccount((s) => s.busy)
  // The session can end while this view is still current (Sign out, then the move to sign in).
  if (!user) return null

  const selectTab = (id: AccountTab) => {
    store.getState().setTab(id)
    store.setState({ viewData: {} })
  }

  const signOut = () =>
    void store.getState().run(async () => {
      await auth.signOut()
      await store.getState().endSession('Signed out')
      // Clear busy before the screen changes so the sign-in screen's controls can take focus.
      store.setState({ busy: false })
      store.getState().goView('signin', {
        email: user.email,
        password: '',
        banner: { kind: 'success', text: SIGNED_OUT_TEXT },
      })
    })

  return (
    <div className="auth-screen wide">
      <div className="acct-head">
        <span className="acct-big-avatar" style={{ background: avatarColor(user.id) }}>
          {initialsOf(user.name)}
        </span>
        <div className="min-w-0">
          <h2 id="acct-title" className="auth-title left">
            {user.name}
          </h2>
          <p className="acct-email">
            <span>{user.email}</span>
            {user.verified && <span className="acct-verified">Verified</span>}
          </p>
        </div>
      </div>
      <div className="acct-tabs" role="tablist">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            id={`acct-tab-${id}`}
            type="button"
            role="tab"
            className="acct-tab"
            aria-selected={tab === id}
            aria-controls="acct-tabpanel"
            data-autofocus={tab === id ? '1' : undefined}
            onClick={() => selectTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <div id="acct-tabpanel" role="tabpanel" aria-labelledby={`acct-tab-${tab}`}>
        {tab === 'terrariums' && <GardensTab />}
        {/* Tasks 13 and 14 replace these placeholders with the Journal and Profile tabs. */}
        {tab === 'journal' && <div data-tab="journal" />}
        {tab === 'profile' && <div data-tab="profile" />}
      </div>
      <div className="acct-foot">
        <span className="acct-muted">
          {cloud ? 'Saved to your account' : 'Saved in this browser (prototype backend)'}
        </span>
        <button type="button" className="g-btn" disabled={busy} onClick={signOut}>
          Sign out
        </button>
      </div>
    </div>
  )
}
