import { Octokit } from '@octokit/rest'

import { REPO_NAME, REPO_OWNER } from './site'

/**
 * Open authoring: how a stranger publishes to a repository they cannot push to.
 *
 *   1. Fork the marketplace into the contributor's own account
 *   2. Commit their listing to a branch on that fork
 *   3. Open a pull request back here
 *   4. CI validates it and merges it — see .github/workflows/validate-listing.yml
 *
 * Every write is made with the *contributor's* token, never a shared service
 * account. That is what makes this safe to run with no server secrets: the site
 * cannot write anything on its own behalf, and GitHub enforces exactly the
 * permissions that user already had.
 */

export type FileChange = {
  path: string
  /** UTF-8 text, or base64 for binary. `null` deletes the file. */
  content: string | null
  encoding?: 'utf-8' | 'base64'
}

export type PublishResult = {
  pullRequestUrl: string
  pullRequestNumber: number
  branch: string
}

function client(token: string): Octokit {
  return new Octokit({ auth: token })
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Returns the contributor's fork, creating it if needed.
 *
 * A freshly created fork is not immediately usable — GitHub copies it
 * asynchronously — so this polls until the repository answers.
 */
export async function ensureFork(token: string, login: string): Promise<void> {
  const octokit = client(token)

  try {
    await octokit.repos.get({ owner: login, repo: REPO_NAME })
    return
  } catch (error) {
    if ((error as { status?: number }).status !== 404) throw error
  }

  await octokit.repos.createFork({ owner: REPO_OWNER, repo: REPO_NAME })

  for (let attempt = 0; attempt < 12; attempt += 1) {
    await sleep(2000)
    try {
      await octokit.repos.get({ owner: login, repo: REPO_NAME })
      return
    } catch {
      // Still copying.
    }
  }

  throw new Error('Your fork is taking longer than usual to be created. Try again in a minute.')
}

/**
 * Writes a set of file changes to a new branch on the contributor's fork.
 *
 * Uses the git data API rather than the contents API so the whole listing —
 * metadata, README and every screenshot — lands as one atomic commit, and so
 * deletions work the same way as edits.
 */
export async function commitToFork(
  token: string,
  login: string,
  branch: string,
  message: string,
  changes: FileChange[],
): Promise<void> {
  const octokit = client(token)

  // Branch from upstream's current tip, not the fork's, so a stale fork never
  // silently reverts somebody else's listing.
  const { data: upstream } = await octokit.repos.get({ owner: REPO_OWNER, repo: REPO_NAME })
  const { data: upstreamRef } = await octokit.git.getRef({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    ref: `heads/${upstream.default_branch}`,
  })
  const baseSha = upstreamRef.object.sha

  // Forks share object storage with their parent, so the fork can reference an
  // upstream commit it never fetched.
  await octokit.git.createRef({
    owner: login,
    repo: REPO_NAME,
    ref: `refs/heads/${branch}`,
    sha: baseSha,
  })

  const tree = await Promise.all(
    changes.map(async (change) => {
      if (change.content === null) {
        // A null sha in a tree entry is how git records a deletion.
        return { path: change.path, mode: '100644' as const, type: 'blob' as const, sha: null }
      }
      const { data: blob } = await octokit.git.createBlob({
        owner: login,
        repo: REPO_NAME,
        content: change.content,
        encoding: change.encoding ?? 'utf-8',
      })
      return {
        path: change.path,
        mode: '100644' as const,
        type: 'blob' as const,
        sha: blob.sha,
      }
    }),
  )

  const { data: newTree } = await octokit.git.createTree({
    owner: login,
    repo: REPO_NAME,
    base_tree: baseSha,
    tree,
  })

  const { data: commit } = await octokit.git.createCommit({
    owner: login,
    repo: REPO_NAME,
    message,
    tree: newTree.sha,
    parents: [baseSha],
  })

  await octokit.git.updateRef({
    owner: login,
    repo: REPO_NAME,
    ref: `heads/${branch}`,
    sha: commit.sha,
  })
}

export async function openPullRequest(
  token: string,
  login: string,
  branch: string,
  title: string,
  body: string,
): Promise<PublishResult> {
  const octokit = client(token)
  const { data: upstream } = await octokit.repos.get({ owner: REPO_OWNER, repo: REPO_NAME })

  const { data: pull } = await octokit.pulls.create({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    title,
    body,
    head: `${login}:${branch}`,
    base: upstream.default_branch,
    maintainer_can_modify: true,
  })

  return { pullRequestUrl: pull.html_url, pullRequestNumber: pull.number, branch }
}

export type PendingSubmission = {
  number: number
  title: string
  url: string
  state: 'open'
  createdAt: string
  slugs: string[]
  needsReview: boolean
}

/**
 * The contributor's in-flight submissions — what the dashboard shows as
 * "pending" alongside their published listings.
 */
export async function listPendingSubmissions(
  token: string,
  login: string,
): Promise<PendingSubmission[]> {
  const octokit = client(token)

  const { data: pulls } = await octokit.pulls.list({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    state: 'open',
    per_page: 50,
  })

  const mine = pulls.filter((pull) => pull.user?.login.toLowerCase() === login.toLowerCase())

  return Promise.all(
    mine.map(async (pull) => {
      let slugs: string[] = []
      try {
        const { data: files } = await octokit.pulls.listFiles({
          owner: REPO_OWNER,
          repo: REPO_NAME,
          pull_number: pull.number,
          per_page: 100,
        })
        slugs = [
          ...new Set(
            files
              .map((file) => file.filename)
              .filter((name) => name.startsWith('listings/'))
              .map((name) => name.split('/')[1]),
          ),
        ]
      } catch {
        // Non-fatal: the row still renders, just without its slug list.
      }

      return {
        number: pull.number,
        title: pull.title,
        url: pull.html_url,
        state: 'open' as const,
        createdAt: pull.created_at,
        slugs,
        needsReview: pull.labels.some((label) => label.name === 'needs-review'),
      }
    }),
  )
}

/** Branch names must be unique per submission and safe for git refs. */
export function branchName(slug: string): string {
  return `listing/${slug}-${Date.now().toString(36)}`
}
