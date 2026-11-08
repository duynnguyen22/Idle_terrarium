import { createLocalAuthService } from './localAuthService'
import type { AuthService } from './types'

export {
  AUTH_SESSION_KEY,
  AUTH_USERS_KEY,
  EMAIL_RE,
  createLocalAuthService,
} from './localAuthService'
export { AuthError } from './AuthError'
export type { AuthErrorCode } from './AuthError'
export { passwordStrength } from './passwordStrength'
export type { PasswordStrength } from './passwordStrength'
export type * from './types'

/** The app's auth service. Swap this for a real provider; every caller codes against AuthService. */
export const authService: AuthService = createLocalAuthService()
