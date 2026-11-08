import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createLocalAuthService, deviceLabel } from '@/auth/localAuthService'
import { AUTH_SESSION_KEY, AUTH_USERS_KEY, EMAIL_RE } from '@/auth'
import { AuthError } from '@/auth/AuthError'
import type { AuthService } from '@/auth/types'

class MemoryStorage implements Storage {
  private map = new Map<string, string>()
  get length() {
    return this.map.size
  }
  clear() {
    this.map.clear()
  }
  getItem(key: string) {
    return this.map.has(key) ? this.map.get(key)! : null
  }
  key(index: number) {
    return [...this.map.keys()][index] ?? null
  }
  removeItem(key: string) {
    this.map.delete(key)
  }
  setItem(key: string, value: string) {
    this.map.set(key, String(value))
  }
}

class BlockedStorage extends MemoryStorage {
  setItem(): void {
    throw new DOMException('blocked', 'SecurityError')
  }
}

const none = () => Promise.resolve()
const MIN = 60 * 1000
const HOUR = 60 * MIN

let local: MemoryStorage
let session: MemoryStorage
let t: number
const now = () => t
let svc: AuthService

const users = () =>
  JSON.parse(local.getItem(AUTH_USERS_KEY)!) as Record<string, Record<string, unknown>>
/** The app calls getSession at boot, which seeds the demo account. */
const signInDemo = (remember = true) => {
  svc.getSession()
  return svc.signIn({ email: 'demo@botanica.app', password: 'terrarium1', remember })
}
const signInWrong = () =>
  svc.signIn({ email: 'demo@botanica.app', password: 'nope', remember: true })

async function signUpVerified(email = 'a@b.cc', password = 'abcdefg1') {
  await svc.signUp({ name: 'Linh Tran', email, password })
  return svc.verifyEmail({ email, code: svc.devCode(email)! })
}

beforeEach(() => {
  local = new MemoryStorage()
  session = new MemoryStorage()
  t = 1_700_000_000_000
  svc = createLocalAuthService({ local, session, now, latency: none })
})

describe('constants', () => {
  it('keeps the prototype storage keys and email pattern', () => {
    expect(AUTH_USERS_KEY).toBe('botanica_auth_users_v1')
    expect(AUTH_SESSION_KEY).toBe('botanica_auth_session_v1')
    expect(EMAIL_RE.test('a@b.cc')).toBe(true)
    expect(EMAIL_RE.test('a@b.c')).toBe(false)
    expect(EMAIL_RE.test('a b@c.dd')).toBe(false)
  })
})

describe('AuthError', () => {
  it('is an Error carrying a code and extras', () => {
    const e = new AuthError('locked', 'Too many attempts.', { until: 5 })
    expect(e).toBeInstanceOf(Error)
    expect(e).toMatchObject({ code: 'locked', message: 'Too many attempts.', until: 5 })
  })
})

describe('deviceLabel', () => {
  it.each([
    [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
      'Safari on macOS',
    ],
    [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36 Edg/120.0',
      'Edge on Windows',
    ],
    ['Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0', 'Firefox on Linux'],
    ['curl/8.0', 'Browser'],
  ])('%s → %s', (ua, label) => {
    expect(deviceLabel(ua)).toBe(label)
  })
})

describe('local AuthService', () => {
  it('seeds the demo user on getSession and signs it in', async () => {
    expect(svc.getSession()).toEqual({ session: null, user: null })
    expect(users()['demo@botanica.app']).toMatchObject({
      id: 'usr_demo',
      name: 'Demo Gardener',
      verified: true,
    })
    const r = await svc.signIn({
      email: 'Demo@Botanica.app',
      password: 'terrarium1',
      remember: true,
    })
    expect(r.user).toEqual({
      id: 'usr_demo',
      name: 'Demo Gardener',
      email: 'demo@botanica.app',
      verified: true,
      provider: 'password',
      createdAt: t,
    })
    expect(r.session).toMatchObject({
      userId: 'usr_demo',
      version: 1,
      remember: true,
      createdAt: t,
    })
    expect(r.session.expiresAt - r.session.createdAt).toBe(30 * 24 * HOUR)
    expect(local.getItem(AUTH_SESSION_KEY)).not.toBeNull()
    expect(session.getItem(AUTH_SESSION_KEY)).toBeNull()
    expect(svc.getSession()).toEqual({ session: r.session, user: r.user })
  })

  it('remember=false stores the session in sessionStorage with a 12 h ttl', async () => {
    const r = await signInDemo(false)
    expect(r.session.remember).toBe(false)
    expect(r.session.expiresAt - r.session.createdAt).toBe(12 * HOUR)
    expect(session.getItem(AUTH_SESSION_KEY)).not.toBeNull()
    expect(local.getItem(AUTH_SESSION_KEY)).toBeNull()
    expect(svc.getSession().user?.id).toBe('usr_demo')
  })

  it('a new sign-in replaces a session held in the other storage', async () => {
    await signInDemo(true)
    await signInDemo(false)
    expect(local.getItem(AUTH_SESSION_KEY)).toBeNull()
    expect(session.getItem(AUTH_SESSION_KEY)).not.toBeNull()
  })

  it('rejects a malformed email before looking anything up', async () => {
    await expect(
      svc.signIn({ email: 'nope', password: 'a', remember: true }),
    ).rejects.toMatchObject({
      code: 'invalid_email',
      field: 'email',
      message: 'Enter a valid email address.',
    })
  })

  it('unknown email → no_account on the email field', async () => {
    await expect(
      svc.signIn({ email: 'x@y.zz', password: 'a', remember: true }),
    ).rejects.toMatchObject({
      code: 'no_account',
      field: 'email',
      message: 'There’s no account with this email.',
    })
  })

  it('5 wrong passwords lock for 60 s with the tries-left message on the way', async () => {
    svc.getSession()
    for (let i = 1; i <= 4; i++) {
      await expect(signInWrong()).rejects.toMatchObject({
        code: 'wrong_password',
        field: 'password',
        message: `That password isn’t right. ${5 - i} ${5 - i === 1 ? 'try' : 'tries'} left before a short lockout.`,
      })
    }
    await expect(signInWrong()).rejects.toMatchObject({
      code: 'locked',
      message: 'Too many attempts.',
      until: now() + 60000,
    })
    // Even the right password is refused during the lockout
    t += 59 * 1000
    await expect(signInDemo()).rejects.toMatchObject({ code: 'locked', until: t + 1000 })
    t += 1000
    await expect(signInDemo()).resolves.toMatchObject({ user: { id: 'usr_demo' } })
  })

  it('a successful sign-in resets the failure count', async () => {
    svc.getSession()
    for (let i = 0; i < 3; i++) await expect(signInWrong()).rejects.toBeInstanceOf(AuthError)
    await signInDemo()
    await expect(signInWrong()).rejects.toMatchObject({
      message: expect.stringContaining('4 tries left'),
    })
  })

  it('signUp requires a strong password and a unique email, then verify issues a session', async () => {
    await expect(
      svc.signUp({ name: 'A', email: 'a@b.cc', password: 'short' }),
    ).rejects.toMatchObject({
      code: 'weak_password',
      field: 'password',
      message: 'Use at least 8 characters with a letter and a number.',
    })
    await expect(
      svc.signUp({ name: ' ', email: 'a@b.cc', password: 'abcdefg1' }),
    ).rejects.toMatchObject({
      code: 'invalid_name',
      field: 'name',
      message: 'Enter your name.',
    })
    await expect(
      svc.signUp({ name: 'Linh Tran', email: 'a@b.cc', password: 'abcdefg1' }),
    ).resolves.toEqual({
      email: 'a@b.cc',
    })
    await expect(
      svc.signUp({ name: 'B', email: 'A@B.CC', password: 'abcdefg1' }),
    ).rejects.toMatchObject({
      code: 'email_taken',
      field: 'email',
      message: 'An account with this email already exists.',
    })
    const stored = users()['a@b.cc']
    expect(stored).toMatchObject({ verified: false, sessionVersion: 1 })
    expect(stored.hash).toMatch(/^[0-9a-f]{64}$/) // SHA-256 hex
    expect(JSON.stringify(stored)).not.toContain('abcdefg1')

    const code = svc.devCode('a@b.cc')!
    expect(code).toMatch(/^\d{6}$/)
    await expect(svc.verifyEmail({ email: 'a@b.cc', code: '000000' })).rejects.toMatchObject({
      code: 'bad_code',
      message: 'That code doesn’t match. Check the email and try again.',
    })
    const r = await svc.verifyEmail({ email: 'a@b.cc', code })
    expect(r).toMatchObject({ isNew: true, user: { verified: true, name: 'Linh Tran' } })
    expect(r.session.remember).toBe(true)
    expect(svc.devCode('a@b.cc')).toBeNull()
    await expect(svc.verifyEmail({ email: 'a@b.cc', code })).rejects.toMatchObject({
      code: 'bad_code',
      message: 'Request a new code.',
    })
  })

  it('a hashed password signs in, and only the right one', async () => {
    await signUpVerified()
    await expect(
      svc.signIn({ email: 'a@b.cc', password: 'abcdefg2', remember: true }),
    ).rejects.toMatchObject({ code: 'wrong_password' })
    await expect(
      svc.signIn({ email: 'a@b.cc', password: 'abcdefg1', remember: true }),
    ).resolves.toMatchObject({ user: { email: 'a@b.cc', provider: 'password' } })
  })

  describe('without WebCrypto', () => {
    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('falls back to an FNV digest that still checks passwords', async () => {
      vi.spyOn(crypto.subtle, 'digest').mockRejectedValue(new Error('no subtle'))
      await signUpVerified()
      expect(users()['a@b.cc'].hash).toMatch(/^f[0-9a-f]+$/)
      await expect(
        svc.signIn({ email: 'a@b.cc', password: 'abcdefg2', remember: true }),
      ).rejects.toMatchObject({ code: 'wrong_password' })
      await expect(
        svc.signIn({ email: 'a@b.cc', password: 'abcdefg1', remember: true }),
      ).resolves.toMatchObject({ user: { email: 'a@b.cc' } })
    })
  })

  it('signing in before verifying re-issues a code and throws not_verified with the email', async () => {
    await svc.signUp({ name: 'Linh Tran', email: 'A@b.cc', password: 'abcdefg1' })
    t += 20 * MIN
    expect(svc.devCode('a@b.cc')).not.toBeNull()
    await expect(
      svc.signIn({ email: 'a@b.cc', password: 'abcdefg1', remember: true }),
    ).rejects.toMatchObject({
      code: 'not_verified',
      email: 'A@b.cc',
      message: 'Confirm your email first. We sent you a new code.',
    })
    // The re-issued code is fresh, so it verifies even though the first one had expired
    const r = await svc.verifyEmail({ email: 'a@b.cc', code: svc.devCode('a@b.cc')! })
    expect(r.user.verified).toBe(true)
  })

  it('codes expire after 10 minutes', async () => {
    await svc.signUp({ name: 'Linh Tran', email: 'a@b.cc', password: 'abcdefg1' })
    const code = svc.devCode('a@b.cc')!
    t += 10 * MIN + 1
    await expect(svc.verifyEmail({ email: 'a@b.cc', code })).rejects.toMatchObject({
      code: 'code_expired',
      message: 'This code has expired. Send a new one.',
    })
  })

  it('a code exactly 10 minutes old still verifies', async () => {
    await svc.signUp({ name: 'Linh Tran', email: 'a@b.cc', password: 'abcdefg1' })
    t += 10 * MIN
    await expect(
      svc.verifyEmail({ email: 'a@b.cc', code: svc.devCode('a@b.cc')! }),
    ).resolves.toMatchObject({ isNew: true })
  })

  it('verifyEmail honours remember=false', async () => {
    await svc.signUp({ name: 'Linh Tran', email: 'a@b.cc', password: 'abcdefg1' })
    const r = await svc.verifyEmail({
      email: 'a@b.cc',
      code: svc.devCode('a@b.cc')!,
      remember: false,
    })
    expect(r.session.remember).toBe(false)
    expect(session.getItem(AUTH_SESSION_KEY)).not.toBeNull()
  })

  it('resendCode within 30 s is rate_limited', async () => {
    await svc.signUp({ name: 'Linh Tran', email: 'a@b.cc', password: 'abcdefg1' })
    t += 29 * 1000
    await expect(svc.resendCode('a@b.cc')).rejects.toMatchObject({
      code: 'rate_limited',
      message: 'Wait a few seconds before asking again.',
    })
    t += 1000
    await expect(svc.resendCode('a@b.cc')).resolves.toBeUndefined()
    expect(svc.devCode('a@b.cc')).toMatch(/^\d{6}$/)
    // The resent code carries a fresh 10-minute window
    t += 9 * MIN
    await expect(
      svc.verifyEmail({ email: 'a@b.cc', code: svc.devCode('a@b.cc')! }),
    ).resolves.toMatchObject({ isNew: true })
  })

  it('resendCode issues a code for the requested purpose', async () => {
    svc.getSession()
    await svc.resendCode('demo@botanica.app', 'reset')
    await svc.resetPassword({
      email: 'demo@botanica.app',
      code: svc.devCode('demo@botanica.app')!,
      password: 'newpass12',
    })
    await expect(
      svc.signIn({ email: 'demo@botanica.app', password: 'newpass12', remember: true }),
    ).resolves.toMatchObject({ user: { id: 'usr_demo' } })
  })

  it('requestPasswordReset answers the same for unknown emails and issues a reset code for known ones', async () => {
    svc.getSession()
    await expect(svc.requestPasswordReset('ghost@nowhere.zz')).resolves.toBeUndefined()
    expect(svc.devCode('ghost@nowhere.zz')).toBeNull()
    await expect(svc.requestPasswordReset('Demo@Botanica.app')).resolves.toBeUndefined()
    expect(svc.devCode('demo@botanica.app')).toMatch(/^\d{6}$/)
    await expect(svc.requestPasswordReset('bad')).rejects.toMatchObject({
      code: 'invalid_email',
      field: 'email',
    })
    // A reset code is not a verification code
    await expect(
      svc.verifyEmail({ email: 'demo@botanica.app', code: svc.devCode('demo@botanica.app')! }),
    ).rejects.toMatchObject({ code: 'bad_code', message: 'Request a new code.' })
  })

  it('resetPassword validates the code, expiry and strength', async () => {
    svc.getSession()
    await svc.requestPasswordReset('demo@botanica.app')
    const code = svc.devCode('demo@botanica.app')!
    await expect(
      svc.resetPassword({ email: 'demo@botanica.app', code: 'x', password: 'newpass12' }),
    ).rejects.toMatchObject({
      code: 'bad_code',
      field: 'code',
      message: 'That code doesn’t match. Check the email and try again.',
    })
    await expect(
      svc.resetPassword({ email: 'demo@botanica.app', code, password: 'weak' }),
    ).rejects.toMatchObject({ code: 'weak_password', field: 'password' })
    t += 10 * MIN + 1
    await expect(
      svc.resetPassword({ email: 'demo@botanica.app', code, password: 'newpass12' }),
    ).rejects.toMatchObject({ code: 'code_expired' })
  })

  it('resetPassword bumps sessionVersion so an existing session reads as revoked', async () => {
    await signInDemo(true)
    await svc.requestPasswordReset('demo@botanica.app')
    await svc.resetPassword({
      email: 'demo@botanica.app',
      code: svc.devCode('demo@botanica.app')!,
      password: 'newpass12',
    })
    expect(users()['demo@botanica.app']).toMatchObject({ sessionVersion: 2 })
    expect(users()['demo@botanica.app']).not.toHaveProperty('demoPw')
    expect(svc.devCode('demo@botanica.app')).toBeNull()
    expect(svc.getSession()).toEqual({ session: null, user: null, ended: 'revoked' })
    expect(local.getItem(AUTH_SESSION_KEY)).toBeNull()
    expect(session.getItem(AUTH_SESSION_KEY)).toBeNull()
    await expect(signInDemo()).rejects.toMatchObject({ code: 'wrong_password' })
    const r = await svc.signIn({
      email: 'demo@botanica.app',
      password: 'newpass12',
      remember: true,
    })
    expect(r.session.version).toBe(2)
  })

  it('resetPassword clears a lockout and marks the account verified', async () => {
    await svc.signUp({ name: 'Linh Tran', email: 'a@b.cc', password: 'abcdefg1' })
    t += 30 * 1000
    await svc.requestPasswordReset('a@b.cc')
    await svc.resetPassword({
      email: 'a@b.cc',
      code: svc.devCode('a@b.cc')!,
      password: 'newpass12',
    })
    expect(users()['a@b.cc']).toMatchObject({ verified: true, failed: 0, lockedUntil: 0 })
  })

  it('an expired session reads as expired and is cleared', async () => {
    await signInDemo(false)
    t += 12 * HOUR
    expect(svc.getSession().session).not.toBeNull()
    t += 1
    expect(svc.getSession()).toEqual({ session: null, user: null, ended: 'expired' })
    expect(session.getItem(AUTH_SESSION_KEY)).toBeNull()
    expect(svc.getSession()).toEqual({ session: null, user: null })
  })

  it('a session whose user is gone reads as missing', async () => {
    await signUpVerified()
    const all = users()
    delete all['a@b.cc']
    local.setItem(AUTH_USERS_KEY, JSON.stringify(all))
    expect(svc.getSession()).toEqual({ session: null, user: null, ended: 'missing' })
  })

  it('magic link creates a verified user named from the email local part', async () => {
    await expect(svc.sendMagicLink('nope')).rejects.toMatchObject({
      code: 'invalid_email',
      field: 'email',
      message: 'Enter your email first.',
    })
    await expect(svc.completeMagicLink('fern.lover@moss.io')).rejects.toMatchObject({
      code: 'code_expired',
      message: 'This link has expired. Send a new one.',
    })
    await svc.sendMagicLink('Fern.Lover@moss.io')
    const r = await svc.completeMagicLink('fern.lover@moss.io')
    expect(r.isNew).toBe(true)
    expect(r.user).toMatchObject({
      name: 'fern.lover',
      email: 'fern.lover@moss.io',
      verified: true,
      provider: 'email link',
    })
    expect(r.session.remember).toBe(true)
    expect(r.user.id).toMatch(/^usr_/)
    // A used link cannot be replayed
    await expect(svc.completeMagicLink('fern.lover@moss.io')).rejects.toMatchObject({
      code: 'code_expired',
    })
    // An existing account signs straight in
    await svc.sendMagicLink('fern.lover@moss.io')
    await expect(svc.completeMagicLink('fern.lover@moss.io')).resolves.toMatchObject({
      isNew: false,
      user: { id: r.user.id },
    })
  })

  it('a magic link expires after 10 minutes', async () => {
    await svc.sendMagicLink('fern@moss.io')
    t += 10 * MIN + 1
    await expect(svc.completeMagicLink('fern@moss.io')).rejects.toMatchObject({
      code: 'code_expired',
    })
  })

  it('signInWithProvider creates the user with the provider name', async () => {
    const r = await svc.signInWithProvider('Google', {
      email: 'Sky@Mail.com',
      name: '  Sky Pham  ',
    })
    expect(r.isNew).toBe(true)
    expect(r.user).toMatchObject({
      name: 'Sky Pham',
      email: 'Sky@Mail.com',
      verified: true,
      provider: 'Google',
    })
    const again = await svc.signInWithProvider('Google', { email: 'sky@mail.com', name: 'Other' })
    expect(again).toMatchObject({ isNew: false, user: { id: r.user.id, name: 'Sky Pham' } })
    // A provider account has no password to type
    await expect(
      svc.signIn({ email: 'sky@mail.com', password: 'whatever1', remember: true }),
    ).rejects.toMatchObject({
      code: 'use_provider',
      message: 'This account signs in with Google. Use that button above.',
    })
    await expect(svc.signInWithProvider('Google', { email: 'x', name: 'X' })).rejects.toMatchObject(
      {
        code: 'invalid_email',
      },
    )
  })

  it('signInWithProvider names the user from the email when no name is given', async () => {
    const r = await svc.signInWithProvider('Apple', { email: 'leaf@ivy.org', name: '' })
    expect(r.user.name).toBe('leaf')
  })

  it('updateProfile trims and caps the name', async () => {
    const { user } = await signInDemo()
    await expect(svc.updateProfile(user.id, { name: '   ' })).rejects.toMatchObject({
      code: 'invalid_name',
      field: 'name',
    })
    await expect(svc.updateProfile('usr_ghost', { name: 'X' })).rejects.toMatchObject({
      code: 'no_account',
      message: 'Account not found.',
    })
    const updated = await svc.updateProfile(user.id, { name: '  ' + 'a'.repeat(80) })
    expect(updated.name).toBe('a'.repeat(60))
    expect(svc.getSession().user?.name).toBe('a'.repeat(60))
  })

  it('changePassword checks the current password and replaces demoPw', async () => {
    const { user } = await signInDemo()
    await expect(
      svc.changePassword(user.id, { current: 'wrong', next: 'newpass12' }),
    ).rejects.toMatchObject({
      code: 'wrong_password',
      field: 'current',
      message: 'Your current password isn’t right.',
    })
    await expect(
      svc.changePassword(user.id, { current: 'terrarium1', next: 'weak' }),
    ).rejects.toMatchObject({ code: 'weak_password', field: 'next' })
    await svc.changePassword(user.id, { current: 'terrarium1', next: 'newpass12' })
    expect(users()['demo@botanica.app']).not.toHaveProperty('demoPw')
    await expect(signInDemo()).rejects.toMatchObject({ code: 'wrong_password' })
    await expect(
      svc.signIn({ email: 'demo@botanica.app', password: 'newpass12', remember: true }),
    ).resolves.toMatchObject({ user: { id: 'usr_demo' } })
    // Changing the password keeps this device signed in
    expect(svc.getSession().session).not.toBeNull()
  })

  it('changePassword lets a provider account set a first password', async () => {
    const { user } = await svc.signInWithProvider('Google', { email: 'sky@mail.com', name: 'Sky' })
    await svc.changePassword(user.id, { current: '', next: 'newpass12' })
    await expect(
      svc.signIn({ email: 'sky@mail.com', password: 'newpass12', remember: true }),
    ).resolves.toMatchObject({ user: { id: user.id } })
  })

  it('signOut clears the session', async () => {
    await signInDemo()
    await svc.signOut()
    expect(svc.getSession()).toEqual({ session: null, user: null })
  })

  it('signOutEverywhere revokes; deleteAccount removes the user and the session', async () => {
    const first = await signInDemo(true)
    await svc.signOutEverywhere(first.user.id)
    expect(svc.getSession()).toEqual({ session: null, user: null })
    expect(users()['demo@botanica.app']).toMatchObject({ sessionVersion: 2 })

    // A session started elsewhere before the bump reads as revoked
    const other = new MemoryStorage()
    const elsewhere = createLocalAuthService({ local, session: other, now, latency: none })
    elsewhere.getSession()
    const second = await elsewhere.signIn({
      email: 'demo@botanica.app',
      password: 'terrarium1',
      remember: false,
    })
    expect(second.session.version).toBe(2)
    await svc.signOutEverywhere(second.user.id)
    expect(elsewhere.getSession()).toEqual({ session: null, user: null, ended: 'revoked' })

    const { user } = await signUpVerified()
    expect(svc.getSession().user?.id).toBe(user.id)
    await svc.deleteAccount(user.id)
    expect(users()['a@b.cc']).toBeUndefined()
    expect(local.getItem(AUTH_SESSION_KEY)).toBeNull()
    expect(svc.getSession()).toEqual({ session: null, user: null })
    await expect(
      svc.signIn({ email: 'a@b.cc', password: 'abcdefg1', remember: true }),
    ).rejects.toMatchObject({ code: 'no_account' })
  })

  it('corrupt users JSON is treated as empty', () => {
    local.setItem(AUTH_USERS_KEY, '{nope')
    expect(() => svc.getSession()).not.toThrow()
    expect(users()['demo@botanica.app']).toMatchObject({ id: 'usr_demo' })
  })

  it('a corrupt session is treated as signed out', () => {
    local.setItem(AUTH_SESSION_KEY, '{nope')
    expect(svc.getSession()).toEqual({ session: null, user: null })
  })

  it('blocked storage surfaces as a storage error on writes', async () => {
    const blocked = createLocalAuthService({
      local: new BlockedStorage(),
      session: new BlockedStorage(),
      now,
      latency: none,
    })
    expect(() => blocked.getSession()).not.toThrow()
    await expect(
      blocked.signUp({ name: 'Linh', email: 'a@b.cc', password: 'abcdefg1' }),
    ).rejects.toMatchObject({
      code: 'storage',
      message: 'This browser is blocking storage, so accounts can’t be kept.',
    })
  })

  it('pending codes are per service instance and keyed by normalised email', async () => {
    await svc.signUp({ name: 'Linh Tran', email: '  A@B.cc ', password: 'abcdefg1' })
    expect(svc.devCode('a@b.cc')).toBe(svc.devCode(' A@B.CC'))
    const other = createLocalAuthService({ local, session, now, latency: none })
    expect(other.devCode('a@b.cc')).toBeNull()
    expect(users()['a@b.cc'].email).toBe('A@B.cc')
  })
})

describe('default storages', () => {
  const names = ['localStorage', 'sessionStorage'] as const
  const saved = names.map((n) => Object.getOwnPropertyDescriptor(globalThis, n))

  afterEach(() => {
    names.forEach((n, i) => {
      if (saved[i]) Object.defineProperty(globalThis, n, saved[i])
      else delete (globalThis as Record<string, unknown>)[n]
    })
  })

  it('are not touched until the service is used, so blocked storage cannot break loading', async () => {
    for (const n of names) {
      Object.defineProperty(globalThis, n, {
        configurable: true,
        get() {
          throw new DOMException('blocked', 'SecurityError')
        },
      })
    }
    let lazy: AuthService | undefined
    expect(() => {
      lazy = createLocalAuthService({ now, latency: none })
    }).not.toThrow()
    expect(lazy!.getSession()).toEqual({ session: null, user: null })
    await expect(
      lazy!.signUp({ name: 'Linh', email: 'a@b.cc', password: 'abcdefg1' }),
    ).rejects.toMatchObject({ code: 'storage' })
  })
})
