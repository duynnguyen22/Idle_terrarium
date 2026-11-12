import { useAtomValue, useStore } from 'jotai'
import { useEffect, useLayoutEffect, useRef, type FormEvent } from 'react'
import type { PublicUser } from '@/auth'
import { useAuthEnv } from '@/components/account/auth/authEnv'
import { AuthField } from '@/components/account/auth/AuthField'
import { FormError } from '@/components/account/auth/AuthPieces'
import { StrengthBlock } from '@/components/account/auth/StrengthBlock'
import {
  backendAtom,
  busyAtom,
  CLEARED_ACCOUNT_FORM,
  sessionAtom,
  timeAgo,
  userAtom,
  viewDataAtom,
} from '@/store/account'

const SIGNED_OUT_EVERYWHERE_TEXT =
  'You’re signed out everywhere. Sign in again on the devices you use.'
const DELETED_TEXT = 'Your account and its data were deleted.'
const MISMATCH_TEXT = 'That doesn’t match your email.'

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
    <form className="acct-card" noValidate onSubmit={onSubmit}>
      <h3 className="acct-h">Profile</h3>
      <AuthField name="name" label="Display name" autoComplete="name" />
      <div className="auth-field">
        <span className="auth-label">Email</span>
        <p className="acct-static">
          <span>{user.email}</span>
          {user.verified && <span className="acct-verified">Verified</span>}
        </p>
      </div>
      <div className="acct-row gap">
        <button type="submit" className="g-btn primary" disabled={busy}>
          Save profile
        </button>
        {saved && <span className="acct-ok">Saved</span>}
      </div>
    </form>
  )
}

function PasswordCard({ user }: { user: PublicUser }) {
  const { account, auth } = useAuthEnv()
  const store = useStore()
  const busy = useAtomValue(busyAtom)
  const saved = useAtomValue(viewDataAtom).saved === 'password'

  if (user.provider !== 'password') {
    return (
      <div className="acct-card">
        <h3 className="acct-h">Password</h3>
        <p className="acct-note">{`You sign in with ${user.provider}, so there’s no Botanica password to manage.`}</p>
      </div>
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
    <form className="acct-card" noValidate onSubmit={onSubmit}>
      <h3 className="acct-h">Password</h3>
      <AuthField
        name="current"
        label="Current password"
        type="password"
        autoComplete="current-password"
      />
      <AuthField name="next" label="New password" type="password" autoComplete="new-password" />
      <StrengthBlock name="next" />
      <div className="acct-row gap">
        <button type="submit" className="g-btn primary" disabled={busy}>
          Change password
        </button>
        {saved && <span className="acct-ok">Password changed</span>}
      </div>
    </form>
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
    <div className="acct-card">
      <h3 className="acct-h">Where you’re signed in</h3>
      <div className="garden-row is-active">
        <div className="garden-info">
          <b>{session?.device || 'This device'}</b>
          <small>{`This device · signed in ${timeAgo(session?.createdAt ?? 0)} · ${kept}`}</small>
        </div>
        <span className="g-badge">Current</span>
      </div>
      <div className="acct-row gap">
        <button type="button" className="g-btn" disabled={busy} onClick={signOutEverywhere}>
          Sign out of all devices
        </button>
      </div>
    </div>
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
      <div className="acct-row gap">
        <button type="button" className="g-btn danger" disabled={busy} onClick={onDelete}>
          Delete my account
        </button>
        <button type="button" className="g-btn" onClick={onCancel}>
          Cancel
        </button>
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
    <div className="acct-card danger-zone">
      <h3 className="acct-h">Delete account</h3>
      <p className="acct-note">
        This removes your account, every terrarium and every journal entry. It can’t be undone.
      </p>
      {confirming ? (
        <ConfirmDelete user={user} onCancel={cancel} />
      ) : (
        <div>
          <button
            ref={openRef}
            type="button"
            className="g-btn danger-outline"
            onClick={() => account.setViewData({ confirmDeleteAccount: true })}
          >
            Delete account…
          </button>
        </div>
      )}
    </div>
  )
}

/** The Profile & security tab: name, password, where you're signed in and account deletion (spec profileTab). */
export function ProfileTab() {
  const user = useAtomValue(userAtom)
  if (!user) return null
  return (
    <div className="acct-stack">
      <FormError />
      <ProfileCard user={user} />
      <PasswordCard user={user} />
      <SessionsCard user={user} />
      <DangerZone user={user} />
    </div>
  )
}
