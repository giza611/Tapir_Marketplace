import fs from 'node:fs'
import path from 'node:path'

/**
 * The forum's data layer.
 *
 * Per-listing comment threads (created by giscus, titled `listing:<slug>`) and
 * free-standing community topics live in the same GitHub Discussions space, so
 * one query returns both and the "single searchable place" requirement needs no
 * extra storage.
 *
 * WHERE THE DATA COMES FROM, and why it matters:
 *
 * The daily GitHub Action fetches Discussions using the token Actions injects
 * automatically, and commits the result to `lib/discussions.generated.json`.
 * The site build then reads that file — no API call, no credential, no network.
 *
 * This is deliberate. The obvious alternative is a Personal Access Token on the
 * build, but PATs expire (a year at most). On a project nobody maintains, that
 * is a guaranteed silent failure at an unpredictable future date. The token
 * Actions provides is scoped to this repository, rotated every run, and never
 * needs a human.
 *
 * A live fetch is still supported when `GITHUB_TOKEN` is present, purely so
 * local development can see fresh data without waiting for the cron.
 */

export type Discussion = {
  number: number
  title: string
  url: string
  category: string
  categoryEmoji: string
  author: string | null
  authorAvatar: string | null
  createdAt: string
  updatedAt: string
  comments: number
  reactions: number
  answered: boolean
  excerpt: string
  /** Set when this thread is a listing's comment section rather than a topic. */
  listingSlug: string | null
}

export type DiscussionData = {
  available: boolean
  discussions: Discussion[]
  categories: string[]
}

const GENERATED_FILE = path.join(process.cwd(), 'lib', 'discussions.generated.json')

export const DISCUSSIONS_QUERY = `
  query($owner: String!, $repo: String!, $cursor: String) {
    repository(owner: $owner, name: $repo) {
      discussions(first: 100, after: $cursor, orderBy: { field: UPDATED_AT, direction: DESC }) {
        pageInfo { hasNextPage endCursor }
        nodes {
          number
          title
          url
          bodyText
          createdAt
          updatedAt
          isAnswered
          category { name emoji }
          author { login avatarUrl }
          comments { totalCount }
          reactions { totalCount }
        }
      }
    }
  }
`

export type DiscussionNode = {
  number: number
  title: string
  url: string
  bodyText: string
  createdAt: string
  updatedAt: string
  isAnswered: boolean | null
  category: { name: string; emoji: string } | null
  author: { login: string; avatarUrl: string } | null
  comments: { totalCount: number }
  reactions: { totalCount: number }
}

/** Shared by the build and the refresh script so both agree on the shape. */
export function toDiscussion(node: DiscussionNode): Discussion {
  const isListingThread = node.title.startsWith('listing:')
  const slug = isListingThread ? node.title.slice('listing:'.length) : null

  return {
    number: node.number,
    title: slug ?? node.title,
    url: node.url,
    category: node.category?.name ?? 'Uncategorised',
    categoryEmoji: node.category?.emoji ?? '',
    author: node.author?.login ?? null,
    authorAvatar: node.author?.avatarUrl ?? null,
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
    comments: node.comments.totalCount,
    reactions: node.reactions.totalCount,
    answered: node.isAnswered ?? false,
    excerpt: node.bodyText.slice(0, 240),
    listingSlug: slug,
  }
}

/** Pages through every discussion in a repository. Throws on any API failure. */
export async function fetchDiscussionsFromApi(
  token: string,
  owner: string,
  repo: string,
): Promise<Discussion[]> {
  const discussions: Discussion[] = []
  let cursor: string | null = null

  for (;;) {
    const response = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: DISCUSSIONS_QUERY, variables: { owner, repo, cursor } }),
    })

    if (!response.ok) throw new Error(`GitHub returned ${response.status}`)

    const payload = (await response.json()) as {
      data?: {
        repository: {
          discussions: {
            pageInfo: { hasNextPage: boolean; endCursor: string | null }
            nodes: DiscussionNode[]
          }
        } | null
      }
      errors?: { message: string }[]
    }

    if (payload.errors?.length) throw new Error(payload.errors[0].message)
    const page = payload.data?.repository?.discussions
    if (!page) throw new Error('Discussions are not enabled on this repository')

    discussions.push(...page.nodes.map(toDiscussion))

    if (!page.pageInfo.hasNextPage) break
    cursor = page.pageInfo.endCursor
  }

  return discussions
}

export type DiscussionCategory = {
  id: string
  name: string
  emoji: string
  description: string
  /** Answerable categories render as Q&A on GitHub. */
  isAnswerable: boolean
}

async function graphql<T>(token: string, query: string, variables: object): Promise<T> {
  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  })

  const payload = (await response.json()) as { data?: T; errors?: { message: string }[] }
  if (payload.errors?.length) throw new Error(payload.errors[0].message)
  if (!response.ok || !payload.data) throw new Error(`GitHub returned ${response.status}`)
  return payload.data
}

/** Categories a topic can be filed under. Needs a token; used on the compose page. */
export async function fetchCategories(
  token: string,
  owner: string,
  repo: string,
): Promise<DiscussionCategory[]> {
  const data = await graphql<{
    repository: {
      discussionCategories: { nodes: DiscussionCategory[] }
    } | null
  }>(
    token,
    `query($owner: String!, $repo: String!) {
       repository(owner: $owner, name: $repo) {
         discussionCategories(first: 25) {
           nodes { id name emoji description isAnswerable }
         }
       }
     }`,
    { owner, repo },
  )

  return data.repository?.discussionCategories.nodes ?? []
}

/** The repository's node ID, required by createDiscussion. */
export async function fetchRepositoryId(
  token: string,
  owner: string,
  repo: string,
): Promise<string> {
  const data = await graphql<{ repository: { id: string } | null }>(
    token,
    `query($owner: String!, $repo: String!) { repository(owner: $owner, name: $repo) { id } }`,
    { owner, repo },
  )
  if (!data.repository) throw new Error('Repository not found')
  return data.repository.id
}

/**
 * Creates a discussion as the signed-in user.
 *
 * The token belongs to the person posting, never to the site, so a topic is
 * attributable to a real GitHub account and GitHub's own abuse limits apply.
 * There is no rate limiting here because there is nowhere to keep a counter —
 * and none is needed while posting requires an account GitHub already polices.
 */
export async function createDiscussion(
  token: string,
  repositoryId: string,
  categoryId: string,
  title: string,
  body: string,
): Promise<{ number: number; url: string }> {
  const data = await graphql<{
    createDiscussion: { discussion: { number: number; url: string } }
  }>(
    token,
    `mutation($repositoryId: ID!, $categoryId: ID!, $title: String!, $body: String!) {
       createDiscussion(input: {
         repositoryId: $repositoryId,
         categoryId: $categoryId,
         title: $title,
         body: $body
       }) {
         discussion { number url }
       }
     }`,
    { repositoryId, categoryId, title, body },
  )

  return data.createDiscussion.discussion
}

/** Reads one discussion live. Used for a thread not yet in the daily index. */
export async function fetchDiscussionByNumber(
  token: string,
  owner: string,
  repo: string,
  number: number,
): Promise<Discussion | null> {
  const data = await graphql<{ repository: { discussion: DiscussionNode | null } | null }>(
    token,
    `query($owner: String!, $repo: String!, $number: Int!) {
       repository(owner: $owner, name: $repo) {
         discussion(number: $number) {
           number title url bodyText createdAt updatedAt isAnswered
           category { name emoji }
           author { login avatarUrl }
           comments { totalCount }
           reactions { totalCount }
         }
       }
     }`,
    { owner, repo, number },
  )

  const node = data.repository?.discussion
  return node ? toDiscussion(node) : null
}

function summarise(discussions: Discussion[]): DiscussionData {
  return {
    available: true,
    discussions,
    categories: [...new Set(discussions.map((d) => d.category))].sort(),
  }
}

export async function getDiscussions(): Promise<DiscussionData> {
  // Preferred path: the file the daily Action commits. No network, no secret.
  try {
    const raw = fs.readFileSync(GENERATED_FILE, 'utf8')
    return summarise(JSON.parse(raw) as Discussion[])
  } catch {
    // Not generated yet — fall through.
  }

  // Development convenience only. Never required in production.
  const token = process.env.GITHUB_TOKEN
  if (token) {
    const { REPO_NAME, REPO_OWNER } = await import('./site')
    try {
      return summarise(await fetchDiscussionsFromApi(token, REPO_OWNER, REPO_NAME))
    } catch (error) {
      console.warn(`[forum] live fetch failed: ${(error as Error).message}`)
    }
  }

  return { available: false, discussions: [], categories: [] }
}
