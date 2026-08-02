import crypto from 'node:crypto'
import { cookies } from 'next/headers'

/**
 * Stateless GitHub sessions.
 *
 * There is no session store because there is no database. The whole session —
 * including the user's GitHub access token — lives inside one encrypted cookie.
 *
 * Two properties matter:
 *
 *   httpOnly   page JavaScript cannot read the cookie, so an XSS bug in the
 *              marketplace cannot be escalated into "write to every public repo
 *              this user owns". Every GitHub call is made server-side instead.
 *
 *   encrypted  the cookie is AES-256-GCM sealed with AUTH_SECRET. A cookie
 *              lifted off disk or out of a log is useless without the server
 *              key, rather than being a bearer token someone can replay
 *              directly against api.github.com.
 *
 * The token is scoped to `public_repo` only. Even fully compromised it cannot
 * touch a private repository.
 */

const COOKIE_NAME = 'tm_session'
const STATE_COOKIE = 'tm_oauth_state'
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7

export type Session = {
  token: string
  login: string
  name: string | null
  avatarUrl: string
}

export const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID ?? ''
export const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET ?? ''

/** Auth is optional: the public site works fully without it. */
export const isAuthConfigured = Boolean(
  GITHUB_CLIENT_ID && GITHUB_CLIENT_SECRET && process.env.AUTH_SECRET,
)

function key(): Buffer {
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new Error('AUTH_SECRET is not set')
  // A hash, not the raw value, so any length of secret yields a valid 32-byte key.
  return crypto.createHash('sha256').update(secret).digest()
}

function seal(payload: object): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv)
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(payload), 'utf8'),
    cipher.final(),
  ])
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url')
}

function unseal<T>(value: string): T | null {
  try {
    const raw = Buffer.from(value, 'base64url')
    const iv = raw.subarray(0, 12)
    const tag = raw.subarray(12, 28)
    const decipher = crypto.createDecipheriv('aes-256-gcm', key(), iv)
    decipher.setAuthTag(tag)
    const decrypted = Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()])
    return JSON.parse(decrypted.toString('utf8')) as T
  } catch {
    // Tampered, truncated, or sealed with a rotated AUTH_SECRET.
    return null
  }
}

export async function createSession(session: Session): Promise<void> {
  const store = await cookies()
  store.set(COOKIE_NAME, seal(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  })
}

export async function getSession(): Promise<Session | null> {
  if (!isAuthConfigured) return null
  const store = await cookies()
  const raw = store.get(COOKIE_NAME)?.value
  if (!raw) return null

  const session = unseal<Session>(raw)
  if (!session?.token || !session.login) return null
  return session
}

export async function destroySession(): Promise<void> {
  const store = await cookies()
  store.delete(COOKIE_NAME)
}

/**
 * CSRF defence for the OAuth round trip: a random value is handed to GitHub
 * and simultaneously stored in a short-lived cookie. A callback that cannot
 * present both is not a callback we started.
 */
export async function issueOAuthState(): Promise<string> {
  const state = crypto.randomBytes(16).toString('base64url')
  const store = await cookies()
  store.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  })
  return state
}

export async function consumeOAuthState(candidate: string | null): Promise<boolean> {
  const store = await cookies()
  const expected = store.get(STATE_COOKIE)?.value
  store.delete(STATE_COOKIE)

  if (!expected || !candidate) return false
  const a = Buffer.from(expected)
  const b = Buffer.from(candidate)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}
