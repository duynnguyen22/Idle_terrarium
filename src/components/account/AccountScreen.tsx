import { useAtomValue, useSetAtom } from 'jotai'
import { Tabs } from 'radix-ui'
import { useAuthEnv } from '@/components/account/auth/authEnv'
import {
  type AccountTab,
  avatarColor,
  backendAtom,
  busyAtom,
  CLEARED_ACCOUNT_FORM,
  initialsOf,
  patchAccountAtom,
  tabAtom,
  userAtom,
} from '@/store/account'
import { GardensTab } from './GardensTab'
import { JournalTab } from './JournalTab'
import { ProfileTab } from './ProfileTab'

const TABS: [AccountTab, string][] = [
  ['terrariums', 'Terrariums'],
  ['journal', 'Journal'],
  ['profile', 'Profile & security'],
]

const SIGNED_OUT_TEXT = 'You’re signed out. Your terrariums are safe in your account.'

/** The signed-in account view: who, the three tabs, where saves go and Sign out (spec accountScreen). */
export function AccountScreen() {
  const { account, auth } = useAuthEnv()
  const patchAccount = useSetAtom(patchAccountAtom)
  const user = useAtomValue(userAtom)
  const tab = useAtomValue(tabAtom)
  const cloud = useAtomValue(backendAtom)?.kind === 'cloud'
  const busy = useAtomValue(busyAtom)
  // Only guards renders outside AccountDialog (test harnesses), which show the account view
  // whatever the phase; the dialog renders this view only while a user is signed in.
  if (!user) return null

  const selectTab = (id: AccountTab) => {
    patchAccount({ tab: id, viewData: {} })
  }

  const signOut = () =>
    void account.run(async () => {
      await auth.signOut()
      // Move to sign in before ending the session: endSession flips the phase at once and then
      // waits on the save flush, and the dialog would otherwise show an empty sign-in screen.
      account.goView('signin', {
        ...CLEARED_ACCOUNT_FORM,
        email: user.email,
        password: '',
        banner: { kind: 'success', text: SIGNED_OUT_TEXT },
      })
      await account.endSession('Signed out')
    })

  return (
    <Tabs.Root asChild value={tab} onValueChange={(id) => selectTab(id as AccountTab)}>
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
        <Tabs.List className="acct-tabs">
          {TABS.map(([id, label]) => (
            <Tabs.Trigger
              key={id}
              value={id}
              className="acct-tab"
              data-autofocus={tab === id ? '1' : undefined}
              // Radix selects on mousedown and keyboard; a plain click (assistive tech) selects too.
              onClick={() => tab !== id && selectTab(id)}
            >
              {label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        <Tabs.Content value={tab}>
          {tab === 'terrariums' && <GardensTab />}
          {tab === 'journal' && <JournalTab />}
          {tab === 'profile' && <ProfileTab />}
        </Tabs.Content>
        <div className="acct-foot">
          <span className="acct-muted">
            {cloud ? 'Saved to your account' : 'Saved in this browser (prototype backend)'}
          </span>
          <button type="button" className="g-btn" disabled={busy} onClick={signOut}>
            Sign out
          </button>
        </div>
      </div>
    </Tabs.Root>
  )
}
