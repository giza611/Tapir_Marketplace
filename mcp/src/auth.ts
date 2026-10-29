import { chmodSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

import { Octokit } from '@octokit/rest'

import { ENV_TOKEN, MarketplaceError, USER_AGENT } from './config'
import { getCatalogue } from './catalogue'

/**
 * Getting a GitHub token without asking anyone to paste one.
 *
 * Publishing a listing is a write to a GitHub repository, and CI only accepts
 * it if the pull request comes from the account named in `authorGithub` — so
 * this server has to act as the contributor, not as a service. That rules out
 * a shared token baked into the package, which is the usual shortcut and here
 * would also be the whole attack.
 *
 * What is left is the OAuth device flow: the contributor opens a URL, types a
 * short code, and GitHub hands this process a token scoped to `public_repo`.
 * No client secret is involved, which is what makes it safe to run inside a
 * distributed CLI. The client ID comes from the marketplace's own
 * `/catalogue.json`, so a fork works with nothing configured by hand.
 *
 * The flow cannot complete inside one tool call — the person has to go and
 * approve it — so `sign_in` is resumable: the first call starts the flow and
 * reports the code, later calls poll the same pending request.
 */

export type Credentials = {
  token: string
  login: string
  obtainedAt: string
}

type PendingRequest = {
  deviceCode: string
  userCode: string
  verificationUri: string
  /** Epoch ms. GitHub gives roughly fifteen minutes. */
  expiresAt: number
  /** Seconds GitHub asks us to wait between polls. */
  interval: number
}

type Store = {
  credentials?: Credentials
  pending?: PendingRequest
}

const DEVICE_CODE_URL = 'https://github.com/login/device/code'
const ACCESS_TOKEN_URL = 'https://github.com/login/oauth/access_token'

/**
 * `~/.tapir-marketplace/credentials.json`, holding a token with write access
 * to the contributor's public repositories. Permissions are tightened to 0600
 * on platforms that have them; on Windows the file inherits the user profile's
 * ACL, which is already per-user.
 */
export function storePath(): string {
  return join(
    process.env.TAPIR_MARKETPLACE_HOME ?? join(homedir(), '.tapir-marketplace'),
    'credentials.json',
  )
}

function readStore(): Store {
  try {
    return JSON.parse(readFileSync(storePath(), 'utf8')) as Store
  } catch {
    return {}
  }
}

function writeStore(store: Store): void {
  const path = storePath()
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(store, null, 2)}\n`, { mode: 0o600 })
  try {
    chmodSync(path, 0o600)
  } catch {
    // No-op on Windows. The containing profile directory is already per-user.
  }
}

export function forgetCredentials(): boolean {
  const existed = Boolean(readStore().credentials)
  try {
    rmSync(storePath())
  } catch {
    // Nothing stored.
  }
  return existed
}

export function client(token: string): Octokit {
  return new Octokit({ auth: token, userAgent: USER_AGENT })
}

async function identify(token: string): Promise<string> {
  try {
    const { data } = await client(token).users.getAuthenticated()
    return data.login
  } catch (error) {
    throw new MarketplaceError(
      `GitHub rejected the token: ${(error as Error).message}. ` +
        'Run sign_in again, or check that TAPIR_GITHUB_TOKEN has the public_repo scope.',
    )
  }
}

/**
 * The token to publish with, or `null` when nobody is signed in.
 *
 * An environment token wins: someone who set one has said how they want this
 * to authenticate, and silently preferring a stale stored token over it would
 * publish as the wrong account.
 */
let envIdentity: Credentials | null = null

export async function currentCredentials(): Promise<Credentials | null> {
  if (ENV_TOKEN) {
    // Resolved once: the login behind a fixed token does not change, and every
    // write tool would otherwise spend a GitHub call asking who we are.
    envIdentity ??= {
      token: ENV_TOKEN,
      login: await identify(ENV_TOKEN),
      obtainedAt: 'from the environment',
    }
    return envIdentity
  }

  const stored = readStore().credentials
  return stored ?? null
}

export async function requireCredentials(): Promise<Credentials> {
  const credentials = await currentCredentials()
  if (credentials) return credentials

  throw new MarketplaceError(
    [
      'Not signed in to GitHub, so nothing can be published yet.',
      '',
      'Call sign_in to start: it returns a short code and a URL for the author to open.',
      'Alternatively, set TAPIR_GITHUB_TOKEN to a token with the public_repo scope.',
    ].join('\n'),
  )
}

async function clientId(): Promise<string> {
  const catalogue = await getCatalogue()
  if (!catalogue.auth?.deviceFlow || !catalogue.auth.githubClientId) {
    throw new MarketplaceError(
      [
        'This marketplace deployment does not advertise a GitHub client ID, so device-flow',
        'sign-in is unavailable.',
        '',
        'Set TAPIR_GITHUB_TOKEN to a personal access token with the public_repo scope instead.',
      ].join('\n'),
    )
  }
  return catalogue.auth.githubClientId
}

async function post<T>(url: string, body: Record<string, string>): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/x-www-form-urlencoded',
      'user-agent': USER_AGENT,
    },
    body: new URLSearchParams(body).toString(),
    signal: AbortSignal.timeout(20_000),
  })

  if (!response.ok) {
    throw new MarketplaceError(`GitHub returned ${response.status} from ${url}.`)
  }
  return (await response.json()) as T
}

export type SignInProgress =
  | { state: 'signed-in'; credentials: Credentials; wasAlready: boolean }
  | { state: 'waiting'; userCode: string; verificationUri: string; secondsLeft: number }

/**
 * Starts the device flow, or resumes one already in progress.
 *
 * Polls for a few seconds before giving up and reporting the code again, so a
 * person who approves promptly is signed in by the first call and nobody is
 * left waiting on a tool call for fifteen minutes.
 */
export async function signIn(options?: { pollMs?: number }): Promise<SignInProgress> {
  const existing = await currentCredentials()
  if (existing) return { state: 'signed-in', credentials: existing, wasAlready: true }

  const store = readStore()
  let pending = store.pending

  if (!pending || pending.expiresAt <= Date.now()) {
    const started = await post<{
      device_code: string
      user_code: string
      verification_uri: string
      expires_in: number
      interval: number
    }>(DEVICE_CODE_URL, { client_id: await clientId(), scope: 'public_repo' })

    pending = {
      deviceCode: started.device_code,
      userCode: started.user_code,
      verificationUri: started.verification_uri,
      expiresAt: Date.now() + started.expires_in * 1000,
      interval: Math.max(started.interval, 5),
    }
    writeStore({ ...store, pending })
  }

  const deadline = Date.now() + (options?.pollMs ?? 8000)
  let interval = pending.interval

  for (;;) {
    const result = await post<{
      access_token?: string
      error?: string
      error_description?: string
      interval?: number
    }>(ACCESS_TOKEN_URL, {
      client_id: await clientId(),
      device_code: pending.deviceCode,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    })

    if (result.access_token) {
      const login = await identify(result.access_token)
      const credentials: Credentials = {
        token: result.access_token,
        login,
        obtainedAt: new Date().toISOString(),
      }
      writeStore({ credentials })
      return { state: 'signed-in', credentials, wasAlready: false }
    }

    switch (result.error) {
      case 'authorization_pending':
        break
      case 'slow_down':
        interval = result.interval ?? interval + 5
        break
      case 'expired_token':
      case 'incorrect_device_code':
        writeStore({ ...readStore(), pending: undefined })
        throw new MarketplaceError(
          'That sign-in request expired before it was approved. Call sign_in again for a fresh code.',
        )
      case 'access_denied':
        writeStore({ ...readStore(), pending: undefined })
        throw new MarketplaceError('The sign-in request was declined on GitHub.')
      default:
        throw new MarketplaceError(
          `GitHub refused the sign-in: ${result.error_description ?? result.error ?? 'unknown error'}`,
        )
    }

    if (Date.now() + interval * 1000 > deadline) {
      return {
        state: 'waiting',
        userCode: pending.userCode,
        verificationUri: pending.verificationUri,
        secondsLeft: Math.max(0, Math.round((pending.expiresAt - Date.now()) / 1000)),
      }
    }

    await new Promise((resolve) => setTimeout(resolve, interval * 1000))
  }
}
