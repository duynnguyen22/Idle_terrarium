export type AuthErrorCode =
  | 'storage'
  | 'invalid_email'
  | 'no_account'
  | 'use_provider'
  | 'locked'
  | 'wrong_password'
  | 'not_verified'
  | 'invalid_name'
  | 'weak_password'
  | 'email_taken'
  | 'bad_code'
  | 'code_expired'
  | 'rate_limited'

export interface AuthErrorExtra {
  /** The form field the message belongs under. */
  field?: string
  /** Lockout end, ms since epoch (code 'locked'). */
  until?: number
  /** The account's email as typed at sign-up (code 'not_verified'). */
  email?: string
}

/** A failure the auth screens can show as is: `message` is user-facing copy. */
export class AuthError extends Error {
  readonly code: AuthErrorCode
  field?: string
  until?: number
  email?: string

  constructor(code: AuthErrorCode, message: string, extra: AuthErrorExtra = {}) {
    super(message)
    this.name = 'AuthError'
    this.code = code
    if (extra.field !== undefined) this.field = extra.field
    if (extra.until !== undefined) this.until = extra.until
    if (extra.email !== undefined) this.email = extra.email
  }
}
