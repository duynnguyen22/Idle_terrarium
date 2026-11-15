export const AUTH_USERS_KEY = 'botanica_auth_users_v1'
export const AUTH_SESSION_KEY = 'botanica_auth_session_v1'
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export const CODE_TTL = 10 * 60 * 1000
export const RESEND_GAP = 30 * 1000
export const MAX_FAILED = 5
export const LOCKOUT = 60 * 1000
export const TTL_REMEMBER = 30 * 24 * 3600 * 1000
export const TTL_SESSION = 12 * 3600 * 1000
export const NAME_MAX = 60

export const MSG = {
  storage: 'This browser is blocking storage, so accounts can’t be kept.',
  invalidEmail: 'Enter a valid email address.',
  weak: 'Use at least 8 characters with a letter and a number.',
  badCode: 'That code doesn’t match. Check the email and try again.',
  codeExpired: 'This code has expired. Send a new one.',
  notFound: 'Account not found.',
  name: 'Enter your name.',
  locked: 'Too many attempts.',
} as const
