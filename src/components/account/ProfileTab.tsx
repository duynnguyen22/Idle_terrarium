import { useAtomValue, useStore } from 'jotai'
import { useEffect, useLayoutEffect, useRef, type FormEvent } from 'react'
import type { PublicUser } from '@/auth'
import { useAuthEnv } from '@/components/account/auth/authEnv'
import { AUTH_LABEL, AuthField } from '@/components/account/auth/AuthField'
import { FormError } from '@/components/account/auth/AuthPieces'
import { StrengthBlock } from '@/components/account/auth/StrengthBlock'
import { Field, FieldGroup, FieldTitle } from '@/components/ui/field'
import {
  backendAtom,
  busyAtom,
  CLEARED_ACCOUNT_FORM,
  sessionAtom,
  timeAgo,
  userAtom,
  viewDataAtom,
} from '@/store/account'
import {
  ACCT_ACTIONS,
  ACCT_H,
  ACCT_NOTE,
  ACCT_OK,
  AccountBadge,
  AccountButton,
  AccountCard,
  AccountRow,
  ROW_INFO,
  ROW_META,
  ROW_NAME,
  VerifiedBadge,
} from './AccountPieces'

const SIGNED_OUT_EVERYWHERE_TEXT =
  'You’re signed out everywhere. Sign in again on the devices you use.'
const DELETED_TEXT = 'Your account and its data were deleted.'
const MISMATCH_TEXT = 'That doesn’t match your email.'

/** The fields and actions inside a card's form. */
const CARD_FORM = 'gap-2.5'

function ProfileCard({ user }: { user: PublicUser }) {
  const { account, auth } = useAuthEnv()
  const store = useStore()
  const busy = useAtomValue(busyAtom)
  const saved = useAtomValue(viewDataAtom).saved === 'profile'
  const nameUnset = useAtomValue(viewDataAtom).name === undefined

  // Prefill the name before the first paint (spec: `if (v.name === undefined) v.name = u.name`).
  useLayoutEffect(() => {
    if (nameUnset) account.setViewData({ name: user.name })
  }, [nameUnset, account, user.name])

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    void account.run(async () => {
      const name = store.get(viewDataAtom).name ?? user.name
      const next = await auth.updateProfile(user.id, { name })
      // A reply that arrives after the session ended changes nothing.
      if (account.setUser(next)) account.setViewData({ saved: 'profile' })
    })
  }

  return (
    <AccountCard>
      <form noValidate onSubmit={onSubmit}>
        <FieldGroup className={CARD_FORM}>
          <h3 className={ACCT_H}>Profile</h3>
          <AuthField name="name" label="Display name" autoComplete="name" />
          <Field className="gap-1.5">
            <FieldTitle className={AUTH_LABEL}>Email</FieldTitle>
            <p className="acct-static flex items-center gap-2 text-[13px] text-forest-ink">
              <span>{user.email}</span>
              {user.verified && <VerifiedBadge />}
            </p>
          </Field>
          <div className={ACCT_ACTIONS}>
            <AccountButton type="submit" tone="primary" disabled={busy}>
              Save profile
            </AccountButton>
            {saved && <span className={ACCT_OK}>Saved</span>}
          </div>
        </FieldGroup>
      </form>
    </AccountCard>
  )
}

function PasswordCard({ user }: { user: PublicUser }) {
  const { account, auth } = useAuthEnv()
  const store = useStore()
  const busy = useAtomValue(busyAtom)
  const saved = useAtomValue(viewDataAtom).saved === 'password'

  if (user.provider !== 'password') {
    return (
      <AccountCard>
        <h3 className={ACCT_H}>Password</h3>
        <p
          className={ACCT_NOTE}
        >{`You sign in with ${user.provider}, so there’s no Botanica password to manage.`}</p>
      </AccountCard>
    )
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    void account.run(async () => {
      const v = store.get(viewDataAtom)
      await auth.changePassword(user.id, { current: v.current ?? '', next: v.next ?? '' })
      account.setViewData({ current: '', next: '', saved: 'password' })
    })
  }

  return (
    <AccountCard>
      <form noValidate onSubmit={onSubmit}>
        <FieldGroup className={CARD_FORM}>
          <h3 className={ACCT_H}>Password</h3>
          <AuthField
            name="current"
            label="Current password"
            type="password"
            autoComplete="current-password"
          />
          <AuthField name="next" label="New password" type="password" autoComplete="new-password" />
          <StrengthBlock name="next" />
          <div className={ACCT_ACTIONS}>
            <AccountButton type="submit" tone="primary" disabled={busy}>
              Change password
            </AccountButton>
            {saved && <span className={ACCT_OK}>Password changed</span>}
          </div>
        </FieldGroup>
      </form>
    </AccountCard>
  )
}

function SessionsCard({ user }: { user: PublicUser }) {
  const { account, auth } = useAuthEnv()
  const store = useStore()
  const busy = useAtomValue(busyAtom)
  const session = useAtomValue(sessionAtom)

  const signOutEverywhere = () =>
    void account.run(async () => {
      await auth.signOutEverywhere(user.id)
      // Same order as Sign out: clear busy and move to sign in before ending the session, so the
      // sign-in screen arrives ready (no "Please wait…") and the dialog focuses it.
      store.set(busyAtom, false)
      account.goView('signin', {
        ...CLEARED_ACCOUNT_FORM,
        email: user.email,
        password: '',
        banner: { kind: 'success', text: SIGNED_OUT_EVERYWHERE_TEXT },
      })
      await account.endSession('Signed out of every device')
    })

  const kept = session?.remember ? 'stays signed in for 30 days' : 'until you close the browser'
  return (
    <AccountCard>
      <h3 className={ACCT_H}>Where you’re signed in</h3>
      <ul>
        <AccountRow active>
          <div className={ROW_INFO}>
            <b className={ROW_NAME}>{session?.device || 'This device'}</b>
            <small className={ROW_META}>
              {`This device · signed in ${timeAgo(session?.createdAt ?? 0)} · ${kept}`}
            </small>
          </div>
          <AccountBadge>Current</AccountBadge>
        </AccountRow>
      </ul>
      <div className={ACCT_ACTIONS}>
        <AccountButton disabled={busy} onClick={signOutEverywhere}>
          Sign out of all devices
        </AccountButton>
      </div>
    </AccountCard>
  )
}

/** The typed-email confirmation; its field takes focus when it opens. */
function ConfirmDelete({ user, onCancel }: { user: PublicUser; onCancel: () => void }) {
  const { account, auth } = useAuthEnv()
  const store = useStore()
  const busy = useAtomValue(busyAtom)
  useEffect(() => document.getElementById('auth-confirmEmail')?.focus(), [])

  const onDelete = () => {
    const typed = (store.get(viewDataAtom).confirmEmail ?? '').trim().toLowerCase()
    if (typed !== user.email.toLowerCase()) {
      account.setViewData({ fieldErrors: { confirmEmail: MISMATCH_TEXT } })
      return
    }
    void account.run(async () => {
      // Close the open terrarium first: endSession's final save (and any pending debounced save)
      // would otherwise write it back into the storage deleteAll just emptied.
      const openId = await account.detachActiveGarden()
      try {
        await store.get(backendAtom)?.deleteAll()
      } catch {
        // The storage is already gone; the account is deleted either way.
      }
      try {
        await auth.deleteAccount(user.id)
      } catch (e) {
        // The account is still there: reopen the terrarium and write it back (under its own name,
        // still in the list), then match the list to the storage. run() shows the error.
        account.attachActiveGarden(openId)
        await account.flushCloudSave()
        await account.refreshGardens()
        throw e
      }
      store.set(busyAtom, false)
      account.goView('signup', {
        ...CLEARED_ACCOUNT_FORM,
        banner: { kind: 'info', text: DELETED_TEXT },
      })
      await account.endSession('Account deleted')
    })
  }

  return (
    <>
      <AuthField
        name="confirmEmail"
        label={`Type ${user.email} to confirm`}
        type="email"
        autoComplete="off"
      />
      <div className={ACCT_ACTIONS}>
        <AccountButton tone="danger" disabled={busy} onClick={onDelete}>
          Delete my account
        </AccountButton>
        <AccountButton onClick={onCancel}>Cancel</AccountButton>
      </div>
    </>
  )
}

function DangerZone({ user }: { user: PublicUser }) {
  const { account } = useAuthEnv()
  const confirming = !!useAtomValue(viewDataAtom).confirmDeleteAccount
  const openRef = useRef<HTMLButtonElement>(null)
  const refocus = useRef(false)

  // After Cancel, focus goes back to the button that opened the confirmation.
  useEffect(() => {
    if (!confirming && refocus.current) openRef.current?.focus()
    refocus.current = false
  }, [confirming])

  const cancel = () => {
    refocus.current = true
    account.setViewData({ confirmDeleteAccount: false })
  }

  return (
    <AccountCard className="ring-[#f2cfc8]">
      <h3 className={ACCT_H}>Delete account</h3>
      <p className={ACCT_NOTE}>
        This removes your account, every terrarium and every journal entry. It can’t be undone.
      </p>
      {confirming ? (
        <ConfirmDelete user={user} onCancel={cancel} />
      ) : (
        <div>
          <AccountButton
            ref={openRef}
            tone="danger-outline"
            onClick={() => account.setViewData({ confirmDeleteAccount: true })}
          >
            Delete account…
          </AccountButton>
        </div>
      )}
    </AccountCard>
  )
}

/** The Profile & security tab: name, password, where you're signed in and account deletion (spec profileTab). */
export function ProfileTab() {
  const user = useAtomValue(userAtom)
  if (!user) return null
  return (
    <div className="grid gap-3">
      <FormError />
      <ProfileCard user={user} />
      <PasswordCard user={user} />
      <SessionsCard user={user} />
      <DangerZone user={user} />
    </div>
  )
}
