import { AuthError } from '../AuthError'
import { EMAIL_RE, MSG } from './constants'

export const norm = (email: string) =>
  String(email || '')
    .trim()
    .toLowerCase()

export function requireEmail(key: string, message: string = MSG.invalidEmail) {
  if (!EMAIL_RE.test(key)) throw new AuthError('invalid_email', message, { field: 'email' })
}
