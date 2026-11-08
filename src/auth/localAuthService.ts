/**
 * The prototype AuthService (spec prototype-v7.html 4023–4240): accounts live in this
 * browser's storage and verification codes are shown on screen, because there is no
 * mail server. Swap `authService` in ./index for a real provider in production.
 */
import { AuthError } from './AuthError'
import { passwordStrength } from './passwordStrength'
import type { AuthService, CodePurpose, PublicUser, Session, SessionCheck } from './types'

export const AUTH_USERS_KEY = 'botanica_auth_users_v1'
export const AUTH_SESSION_KEY = 'botanica_auth_session_v1'
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const CODE_TTL = 10 * 60 * 1000
const RESEND_GAP = 30 * 1000
const MAX_FAILED = 5
const LOCKOUT = 60 * 1000
const TTL_REMEMBER = 30 * 24 * 3600 * 1000
const TTL_SESSION = 12 * 3600 * 1000
const NAME_MAX = 60

const MSG = {
  storage: 'This browser is blocking storage, so accounts can’t be kept.',
  invalidEmail: 'Enter a valid email address.',
  weak: 'Use at least 8 characters with a letter and a number.',
  badCode: 'That code doesn’t match. Check the email and try again.',
  codeExpired: 'This code has expired. Send a new one.',
  notFound: 'Account not found.',
  name: 'Enter your name.',
  locked: 'Too many attempts.',
} as const

/** The stored account record. `demoPw` is the seeded demo account's plain password. */
interface StoredUser {
  id: string
  name: string
  email: string
  salt: string
  hash: string | null
  demoPw?: string
  provider?: string
  verified: boolean
  createdAt: number
  sessionVersion: number
  failed?: number
  lockedUntil?: number
}

type Users = Record<string, StoredUser>

interface PendingCode {
  code: string
  purpose: CodePurpose
  expiresAt: number
  sentAt: number
}

export interface LocalAuthOptions {
  local?: Storage
  session?: Storage
  now?: () => number
  random?: () => number
  latency?: () => Promise<void>
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

const norm = (email: string) =>
  String(email || '')
    .trim()
    .toLowerCase()

/** "Chrome on macOS" from a user agent string. */
export function deviceLabel(
  ua: string = typeof navigator === 'undefined' ? '' : navigator.userAgent,
): string {
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /Chrome\//.test(ua)
      ? 'Chrome'
      : /Firefox\//.test(ua)
        ? 'Firefox'
        : /Safari\//.test(ua)
          ? 'Safari'
          : 'Browser'
  const os = /Mac OS X/.test(ua)
    ? 'macOS'
    : /Windows/.test(ua)
      ? 'Windows'
      : /Android/.test(ua)
        ? 'Android'
        : /iPhone|iPad/.test(ua)
          ? 'iOS'
          : /Linux/.test(ua)
            ? 'Linux'
            : ''
  return os ? `${browser} on ${os}` : browser
}

/** SHA-256 of `salt:pw` as hex; an FNV-1a digest where WebCrypto is unavailable. */
async function hash(salt: string, pw: string): Promise<string> {
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + ':' + pw))
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  } catch {
    let h = 2166136261
    for (const ch of salt + pw) {
      h ^= ch.charCodeAt(0)
      h = Math.imul(h, 16777619)
    }
    return 'f' + (h >>> 0).toString(16)
  }
}

const publicUser = (u: StoredUser): PublicUser => ({
  id: u.id,
  name: u.name,
  email: u.email,
  verified: !!u.verified,
  provider: u.provider || 'password',
  createdAt: u.createdAt,
})

export function createLocalAuthService(opts: LocalAuthOptions = {}): AuthService {
  // Resolved on use: touching window.localStorage throws where storage is blocked, and that
  // must surface inside the try blocks below rather than when the module loads.
  const local = (): Storage => opts.local ?? localStorage
  const sessionStore = (): Storage => opts.session ?? sessionStorage
  const now = opts.now ?? Date.now
  const random = opts.random ?? Math.random
  const latency = opts.latency ?? (() => wait(450 + random() * 350))
  const signOutDelay = opts.latency ?? (() => wait(200))
  const pending: Record<string, PendingCode> = {}

  const readUsers = (): Users => {
    try {
      return JSON.parse(local().getItem(AUTH_USERS_KEY) || '{}') as Users
    } catch {
      return {}
    }
  }
  const writeUsers = (users: Users) => {
    try {
      local().setItem(AUTH_USERS_KEY, JSON.stringify(users))
    } catch {
      throw new AuthError('storage', MSG.storage)
    }
  }
  const findById = (users: Users, userId: string) =>
    Object.values(users).find((x) => x.id === userId)
  const rid = (prefix: string) =>
    prefix + '_' + random().toString(36).slice(2, 10) + now().toString(36).slice(-4)
  const newSalt = () => random().toString(36).slice(2, 12)

  function issueCode(email: string, purpose: CodePurpose): string {
    const code = String(Math.floor(100000 + random() * 900000))
    pending[norm(email)] = { code, purpose, expiresAt: now() + CODE_TTL, sentAt: now() }
    return code
  }

  function clear() {
    try {
      local().removeItem(AUTH_SESSION_KEY)
      sessionStore().removeItem(AUTH_SESSION_KEY)
    } catch {
      /* ignore */
    }
  }

  function startSession(u: StoredUser, remember: boolean): Session {
    const ttl = remember ? TTL_REMEMBER : TTL_SESSION
    const session: Session = {
      userId: u.id,
      email: u.email,
      version: u.sessionVersion || 1,
      remember: !!remember,
      createdAt: now(),
      expiresAt: now() + ttl,
      device: deviceLabel(),
    }
    try {
      local().removeItem(AUTH_SESSION_KEY)
      sessionStore().removeItem(AUTH_SESSION_KEY)
      ;(remember ? local() : sessionStore()).setItem(AUTH_SESSION_KEY, JSON.stringify(session))
    } catch {
      /* storage unavailable: the session lives only in memory for this page */
    }
    return session
  }

  function ensureDemo() {
    const users = readUsers()
    if (users['demo@botanica.app']) return
    users['demo@botanica.app'] = {
      id: 'usr_demo',
      name: 'Demo Gardener',
      email: 'demo@botanica.app',
      salt: 'demo',
      hash: null,
      demoPw: 'terrarium1',
      verified: true,
      createdAt: now(),
      sessionVersion: 1,
    }
    try {
      writeUsers(users)
    } catch {
      /* blocked storage: getSession must still answer "signed out" */
    }
  }

  async function checkPassword(u: StoredUser, pw: string): Promise<boolean> {
    if (u.demoPw) return pw === u.demoPw
    return u.hash === (await hash(u.salt, pw))
  }

  function requireEmail(key: string, message: string = MSG.invalidEmail) {
    if (!EMAIL_RE.test(key)) throw new AuthError('invalid_email', message, { field: 'email' })
  }

  return {
    devCode: (email) => pending[norm(email)]?.code ?? null,

    getSession(): SessionCheck {
      ensureDemo()
      let s: Session | null = null
      try {
        s = JSON.parse(
          local().getItem(AUTH_SESSION_KEY) || sessionStore().getItem(AUTH_SESSION_KEY) || 'null',
        ) as Session | null
      } catch {
        s = null
      }
      if (!s) return { session: null, user: null }
      const u = readUsers()[norm(s.email)]
      if (!u || u.id !== s.userId) return { session: null, user: null, ended: 'missing' }
      if (now() > s.expiresAt) {
        clear()
        return { session: null, user: null, ended: 'expired' }
      }
      if ((u.sessionVersion || 1) !== s.version) {
        clear()
        return { session: null, user: null, ended: 'revoked' }
      }
      return { session: s, user: publicUser(u) }
    },

    async signIn({ email, password, remember }) {
      await latency()
      const key = norm(email)
      requireEmail(key)
      const users = readUsers()
      const u = users[key]
      if (!u)
        throw new AuthError('no_account', 'There’s no account with this email.', { field: 'email' })
      if (u.provider && u.provider !== 'password' && !u.hash && !u.demoPw) {
        throw new AuthError(
          'use_provider',
          `This account signs in with ${u.provider}. Use that button above.`,
        )
      }
      const lock = u.lockedUntil || 0
      if (now() < lock) throw new AuthError('locked', MSG.locked, { until: lock })
      if (!(await checkPassword(u, password))) {
        u.failed = (u.failed || 0) + 1
        if (u.failed >= MAX_FAILED) {
          u.lockedUntil = now() + LOCKOUT
          u.failed = 0
          writeUsers(users)
          throw new AuthError('locked', MSG.locked, { until: u.lockedUntil })
        }
        writeUsers(users)
        const left = MAX_FAILED - u.failed
        throw new AuthError(
          'wrong_password',
          `That password isn’t right. ${left} ${left === 1 ? 'try' : 'tries'} left before a short lockout.`,
          { field: 'password' },
        )
      }
      u.failed = 0
      u.lockedUntil = 0
      writeUsers(users)
      if (!u.verified) {
        issueCode(key, 'verify')
        throw new AuthError('not_verified', 'Confirm your email first. We sent you a new code.', {
          email: u.email,
        })
      }
      return { session: startSession(u, remember), user: publicUser(u) }
    },

    async signUp({ name, email, password }) {
      await latency()
      const key = norm(email)
      if (!name.trim()) throw new AuthError('invalid_name', MSG.name, { field: 'name' })
      requireEmail(key)
      if (!passwordStrength(password).ok) {
        throw new AuthError('weak_password', MSG.weak, { field: 'password' })
      }
      const users = readUsers()
      if (users[key]) {
        throw new AuthError('email_taken', 'An account with this email already exists.', {
          field: 'email',
        })
      }
      const salt = newSalt()
      users[key] = {
        id: rid('usr'),
        name: name.trim().slice(0, NAME_MAX),
        email: email.trim(),
        salt,
        hash: await hash(salt, password),
        verified: false,
        createdAt: now(),
        sessionVersion: 1,
      }
      writeUsers(users)
      issueCode(key, 'verify')
      return { email: users[key].email }
    },

    async verifyEmail({ email, code, remember }) {
      await latency()
      const key = norm(email)
      const p = pending[key]
      if (!p || p.purpose !== 'verify') throw new AuthError('bad_code', 'Request a new code.')
      if (now() > p.expiresAt) throw new AuthError('code_expired', MSG.codeExpired)
      if (p.code !== code) throw new AuthError('bad_code', MSG.badCode)
      delete pending[key]
      const users = readUsers()
      const u = users[key]
      if (!u) throw new AuthError('no_account', MSG.notFound)
      u.verified = true
      writeUsers(users)
      return { session: startSession(u, remember ?? true), user: publicUser(u), isNew: true }
    },

    async resendCode(email, purpose = 'verify') {
      await latency()
      const key = norm(email)
      const p = pending[key]
      if (p && now() - p.sentAt < RESEND_GAP) {
        throw new AuthError('rate_limited', 'Wait a few seconds before asking again.')
      }
      issueCode(key, purpose)
    },

    async requestPasswordReset(email) {
      await latency()
      const key = norm(email)
      requireEmail(key)
      // Same answer whether or not the account exists, as a real service would give
      if (readUsers()[key]) issueCode(key, 'reset')
    },

    async resetPassword({ email, code, password }) {
      await latency()
      const key = norm(email)
      const p = pending[key]
      if (!p || p.purpose !== 'reset' || p.code !== code) {
        throw new AuthError('bad_code', MSG.badCode, { field: 'code' })
      }
      if (now() > p.expiresAt) throw new AuthError('code_expired', MSG.codeExpired)
      if (!passwordStrength(password).ok) {
        throw new AuthError('weak_password', MSG.weak, { field: 'password' })
      }
      const users = readUsers()
      const u = users[key]
      if (!u) throw new AuthError('no_account', MSG.notFound)
      u.salt = newSalt()
      u.hash = await hash(u.salt, password)
      delete u.demoPw
      u.verified = true
      u.failed = 0
      u.lockedUntil = 0
      u.sessionVersion = (u.sessionVersion || 1) + 1 // a reset signs out every device
      writeUsers(users)
      delete pending[key]
    },

    async sendMagicLink(email) {
      await latency()
      const key = norm(email)
      requireEmail(key, 'Enter your email first.')
      issueCode(key, 'magic')
    },

    async completeMagicLink(email) {
      await latency()
      const key = norm(email)
      const p = pending[key]
      if (!p || p.purpose !== 'magic' || now() > p.expiresAt) {
        throw new AuthError('code_expired', 'This link has expired. Send a new one.')
      }
      delete pending[key]
      const users = readUsers()
      let isNew = false
      if (!users[key]) {
        users[key] = {
          id: rid('usr'),
          name: key.split('@')[0],
          email: email.trim(),
          salt: '',
          hash: null,
          provider: 'email link',
          verified: true,
          createdAt: now(),
          sessionVersion: 1,
        }
        isNew = true
      }
      const u = users[key]
      u.verified = true
      writeUsers(users)
      return { session: startSession(u, true), user: publicUser(u), isNew }
    },

    async signInWithProvider(provider, { email, name }) {
      await latency()
      const key = norm(email)
      requireEmail(key)
      const users = readUsers()
      let isNew = false
      if (!users[key]) {
        users[key] = {
          id: rid('usr'),
          name: (name || key.split('@')[0]).trim().slice(0, NAME_MAX),
          email: email.trim(),
          salt: '',
          hash: null,
          provider,
          verified: true,
          createdAt: now(),
          sessionVersion: 1,
        }
        isNew = true
      }
      writeUsers(users)
      const u = users[key]
      return { session: startSession(u, true), user: publicUser(u), isNew }
    },

    async updateProfile(userId, { name }) {
      await latency()
      const users = readUsers()
      const u = findById(users, userId)
      if (!u) throw new AuthError('no_account', MSG.notFound)
      if (!name.trim()) throw new AuthError('invalid_name', MSG.name, { field: 'name' })
      u.name = name.trim().slice(0, NAME_MAX)
      writeUsers(users)
      return publicUser(u)
    },

    async changePassword(userId, { current, next }) {
      await latency()
      const users = readUsers()
      const u = findById(users, userId)
      if (!u) throw new AuthError('no_account', MSG.notFound)
      if ((u.hash || u.demoPw) && !(await checkPassword(u, current))) {
        throw new AuthError('wrong_password', 'Your current password isn’t right.', {
          field: 'current',
        })
      }
      if (!passwordStrength(next).ok) {
        throw new AuthError('weak_password', MSG.weak, { field: 'next' })
      }
      u.salt = newSalt()
      u.hash = await hash(u.salt, next)
      delete u.demoPw
      writeUsers(users)
    },

    async signOut() {
      await signOutDelay()
      clear()
    },

    async signOutEverywhere(userId) {
      await latency()
      const users = readUsers()
      const u = findById(users, userId)
      if (u) {
        u.sessionVersion = (u.sessionVersion || 1) + 1
        writeUsers(users)
      }
      clear()
    },

    async deleteAccount(userId) {
      await latency()
      const users = readUsers()
      const key = Object.keys(users).find((k) => users[k].id === userId)
      if (key) {
        delete users[key]
        writeUsers(users)
      }
      clear()
    },
  }
}
