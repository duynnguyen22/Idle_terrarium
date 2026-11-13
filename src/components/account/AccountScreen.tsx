import { useAtomValue, useSetAtom } from 'jotai'
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
import { ACCT_MUTED, AccountButton, VerifiedBadge } from './AccountPieces'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
    <Tabs value={tab} onValueChange={(id) => selectTab(id as AccountTab)} className="gap-4">
      <div className="flex items-center gap-3.5 pr-8">
        <span
          className="acct-big-avatar inline-flex size-13 shrink-0 items-center justify-center rounded-full text-lg font-bold tracking-wide text-white"
          style={{ background: avatarColor(user.id) }}
        >
          {initialsOf(user.name)}
        </span>
        <div className="min-w-0">
          <h2
            id="acct-title"
            className="truncate font-heading text-lg font-semibold text-forest-ink"
          >
            {user.name}
          </h2>
          <p className="flex flex-wrap items-center gap-2 text-[12.5px] text-ink-soft">
            <span className="truncate">{user.email}</span>
            {user.verified && <VerifiedBadge />}
          </p>
        </div>
      </div>
      <TabsList className="grid h-auto! w-full grid-cols-3 gap-0.5 rounded-[11px] bg-sand-pale">
        {TABS.map(([id, label]) => (
          <TabsTrigger
            key={id}
            value={id}
            className="h-8 rounded-lg text-[12.5px] text-ink-soft data-active:font-semibold data-active:text-forest-ink"
            data-autofocus={tab === id ? '1' : undefined}
            // Radix selects on mousedown and keyboard; a plain click (assistive tech) selects too.
            onClick={() => tab !== id && selectTab(id)}
          >
            {label}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value={tab}>
        {tab === 'terrariums' && <GardensTab />}
        {tab === 'journal' && <JournalTab />}
        {tab === 'profile' && <ProfileTab />}
      </TabsContent>
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <span className={ACCT_MUTED}>
          {cloud ? 'Saved to your account' : 'Saved in this browser (prototype backend)'}
        </span>
        <AccountButton disabled={busy} onClick={signOut}>
          Sign out
        </AccountButton>
      </div>
    </Tabs>
  )
}
