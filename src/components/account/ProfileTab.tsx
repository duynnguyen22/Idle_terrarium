import { useEffect, useLayoutEffect, useRef, type FormEvent } from 'react'
import type { PublicUser } from '@/auth'
import { useAccount, useAuthEnv } from '@/components/account/auth/authEnv'
import { AuthField } from '@/components/account/auth/AuthField'
import { FormError } from '@/components/account/auth/AuthPieces'
import { StrengthBlock } from '@/components/account/auth/StrengthBlock'
import { timeAgo, type ViewData } from '@/store/useAccountStore'

const SIGNED_OUT_EVERYWHERE_TEXT =
  'You’re signed out everywhere. Sign in again on the devices you use.'
const DELETED_TEXT = 'Your account and its data were deleted.'
const MISMATCH_TEXT = 'That doesn’t match your email.'

/** The profile tab's own form values, cleared on the way out so they do not follow the person to sign in. */
const CLEARED: ViewData = { current: '', next: '', confirmEmail: '', confirmDeleteAccount: false }

function ProfileCard({ user }: { user: PublicUser }) {
  const { store, auth } = useAuthEnv()
  const busy = useAccount((s) => s.busy)
  const saved = useAccount((s) => s.viewData.saved === 'profile')
  const nameUnset = useAccount((s) => s.viewData.name === undefined)

  // Prefill the name before the first paint (spec: `if (v.name === undefined) v.name = u.name`).
  useLayoutEffect(() => {
    if (nameUnset) store.getState().setViewData({ name: user.name })
  }, [nameUnset, store, user.name])

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    void store.getState().run(async () => {
      const name = store.getState().viewData.name ?? user.name
      const next = await auth.updateProfile(user.id, { name })
      store.getState().setUser(next)
      store.getState().setViewData({ saved: 'profile' })
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
  const { store, auth } = useAuthEnv()
  const busy = useAccount((s) => s.busy)
  const saved = useAccount((s) => s.viewData.saved === 'password')

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
    void store.getState().run(async () => {
      const v = store.getState().viewData
      await auth.changePassword(user.id, { current: v.current ?? '', next: v.next ?? '' })
      store.getState().setViewData({ current: '', next: '', saved: 'password' })
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
  const { store, auth } = useAuthEnv()
  const busy = useAccount((s) => s.busy)
  const session = useAccount((s) => s.session)

  const signOutEverywhere = () =>
    void store.getState().run(async () => {
      await auth.signOutEverywhere(user.id)
      // Same order as Sign out: clear busy and move to sign in before ending the session, so the
      // sign-in screen arrives ready (no "Please wait…") and the dialog focuses it.
      store.setState({ busy: false })
      store.getState().goView('signin', {
        ...CLEARED,
        email: user.email,
        password: '',
        banner: { kind: 'success', text: SIGNED_OUT_EVERYWHERE_TEXT },
      })
      await store.getState().endSession('Signed out of every device')
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
  const { store, auth } = useAuthEnv()
  const busy = useAccount((s) => s.busy)
  useEffect(() => document.getElementById('auth-confirmEmail')?.focus(), [])

  const onDelete = () => {
    const typed = (store.getState().viewData.confirmEmail ?? '').trim().toLowerCase()
    if (typed !== user.email.toLowerCase()) {
      store.getState().setViewData({ fieldErrors: { confirmEmail: MISMATCH_TEXT } })
      return
    }
    void store.getState().run(async () => {
      // Close the open terrarium first: endSession's final save (and any pending debounced save)
      // would otherwise write it back into the storage deleteAll just emptied.
      store.setState({ activeId: null })
      try {
        await store.getState().backend?.deleteAll()
      } catch {
        // The storage is already gone; the account is deleted either way.
      }
      await auth.deleteAccount(user.id)
      store.setState({ busy: false })
      store.getState().goView('signup', {
        ...CLEARED,
        name: '',
        banner: { kind: 'info', text: DELETED_TEXT },
      })
      await store.getState().endSession('Account deleted')
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
  const { store } = useAuthEnv()
  const confirming = useAccount((s) => !!s.viewData.confirmDeleteAccount)
  const openRef = useRef<HTMLButtonElement>(null)
  const refocus = useRef(false)

  // After Cancel, focus goes back to the button that opened the confirmation.
  useEffect(() => {
    if (!confirming && refocus.current) openRef.current?.focus()
    refocus.current = false
  }, [confirming])

  const cancel = () => {
    refocus.current = true
    store.getState().setViewData({ confirmDeleteAccount: false })
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
            onClick={() => store.getState().setViewData({ confirmDeleteAccount: true })}
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
  const user = useAccount((s) => s.user)
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
