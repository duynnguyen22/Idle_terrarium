/** The account as the app sees it: never carries the salt, hash or lockout state. */
export interface PublicUser {
  id: string
  name: string
  email: string
  verified: boolean
  provider: string
  createdAt: number
}

export interface Session {
  userId: string
  email: string
  /** Matches the user's sessionVersion; a bump (reset, sign out everywhere) revokes it. */
  version: number
  remember: boolean
  createdAt: number
  expiresAt: number
  /** "Chrome on macOS", for the account screen. */
  device: string
}

export type SessionEnd = 'missing' | 'expired' | 'revoked'

export interface SessionCheck {
  session: Session | null
  user: PublicUser | null
  ended?: SessionEnd
}

export type CodePurpose = 'verify' | 'reset' | 'magic'

/** The swap point for a real backend (Supabase Auth, Firebase Auth, Clerk, Auth.js). */
export interface AuthService {
  getSession(): SessionCheck
  signIn(i: {
    email: string
    password: string
    remember: boolean
  }): Promise<{ session: Session; user: PublicUser }>
  signUp(i: { name: string; email: string; password: string }): Promise<{ email: string }>
  verifyEmail(i: {
    email: string
    code: string
    remember?: boolean
  }): Promise<{ session: Session; user: PublicUser; isNew: true }>
  resendCode(email: string, purpose?: CodePurpose): Promise<void>
  requestPasswordReset(email: string): Promise<void>
  resetPassword(i: { email: string; code: string; password: string }): Promise<void>
  sendMagicLink(email: string): Promise<void>
  completeMagicLink(email: string): Promise<{ session: Session; user: PublicUser; isNew: boolean }>
  signInWithProvider(
    provider: string,
    i: { email: string; name: string },
  ): Promise<{ session: Session; user: PublicUser; isNew: boolean }>
  updateProfile(userId: string, i: { name: string }): Promise<PublicUser>
  changePassword(userId: string, i: { current: string; next: string }): Promise<void>
  signOut(): Promise<void>
  signOutEverywhere(userId: string): Promise<void>
  deleteAccount(userId: string): Promise<void>
  /** Prototype only: the pending code for an email, so the UI can show the "Prototype inbox". */
  devCode(email: string): string | null
}
