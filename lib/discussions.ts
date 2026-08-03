import crypto from 'node:crypto'
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
  /** GraphQL node ID, needed to attach a reaction. */
  id: string
  number: number
  title: string
  /** THUMBS_UP count. This is the vote a listing's rating is built from. */
  upvotes: number
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
          id
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
          reactionGroups { content reactors { totalCount } }
        }
      }
    }
  }
`

export type DiscussionNode = {
  id: string
  number: number
  title: string
  reactionGroups?: { content: string; reactors: { totalCount: number } }[]
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
    id: node.id,
    upvotes:
      node.reactionGroups?.find((group) => group.content === 'THUMBS_UP')?.reactors.totalCount ?? 0,
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

/**
 * The marker giscus uses to find a thread when `data-strict` is on.
 *
 * Strict mode does NOT match on the title. giscus computes the SHA-1 of the
 * mapping term and searches for that hash inside the discussion BODY, appended
 * as an HTML comment. Any thread we create for a listing has to carry the same
 * marker, otherwise giscus will not recognise it and will silently open a
 * second discussion for the same listing the first time somebody comments.
 */
export function giscusMarker(term: string): string {
  const sha1 = crypto.createHash('sha1').update(term).digest('hex')
  return `<!-- sha1: ${sha1} -->`
}

export type VoteState = { discussionId: string; upvotes: number; viewerHasVoted: boolean }

/** Reads the vote state of a listing's thread for the signed-in user. */
export async function fetchVoteState(
  token: string,
  owner: string,
  repo: string,
  number: number,
): Promise<VoteState | null> {
  const data = await graphql<{
    repository: {
      discussion: {
        id: string
        reactionGroups: {
          content: string
          viewerHasReacted: boolean
          reactors: { totalCount: number }
        }[]
      } | null
    } | null
  }>(
    token,
    `query($owner: String!, $repo: String!, $number: Int!) {
       repository(owner: $owner, name: $repo) {
         discussion(number: $number) {
           id
           reactionGroups { content viewerHasReacted reactors { totalCount } }
         }
       }
     }`,
    { owner, repo, number },
  )

  const discussion = data.repository?.discussion
  if (!discussion) return null

  const group = discussion.reactionGroups.find((g) => g.content === 'THUMBS_UP')
  return {
    discussionId: discussion.id,
    upvotes: group?.reactors.totalCount ?? 0,
    viewerHasVoted: group?.viewerHasReacted ?? false,
  }
}

/**
 * Creates the discussion that backs a listing's comments and votes.
 *
 * Titled and marked exactly the way giscus would create it, so the comment
 * widget adopts this thread rather than opening a rival one.
 */
export async function createListingDiscussion(
  token: string,
  repositoryId: string,
  categoryId: string,
  term: string,
  listingName: string,
  listingUrl: string,
): Promise<{ id: string; number: number; url: string }> {
  const body = [
    `Discussion for **${listingName}**.`,
    '',
    `Questions, problems and tips: ${listingUrl}`,
    '',
    giscusMarker(term),
  ].join('\n')

  const data = await graphql<{
    createDiscussion: { discussion: { id: string; number: number; url: string } }
  }>(
    token,
    `mutation($repositoryId: ID!, $categoryId: ID!, $title: String!, $body: String!) {
       createDiscussion(input: {
         repositoryId: $repositoryId, categoryId: $categoryId, title: $title, body: $body
       }) { discussion { id number url } }
     }`,
    { repositoryId, categoryId, title: term, body },
  )

  return data.createDiscussion.discussion
}

export async function setVote(
  token: string,
  subjectId: string,
  voted: boolean,
): Promise<number> {
  const mutation = voted
    ? `mutation($id: ID!) { addReaction(input: { subjectId: $id, content: THUMBS_UP }) {
         subject { reactionGroups { content reactors { totalCount } } } } }`
    : `mutation($id: ID!) { removeReaction(input: { subjectId: $id, content: THUMBS_UP }) {
         subject { reactionGroups { content reactors { totalCount } } } } }`

  const data = await graphql<Record<string, {
    subject: { reactionGroups: { content: string; reactors: { totalCount: number } }[] }
  }>>(token, mutation, { id: subjectId })

  const result = voted ? data.addReaction : data.removeReaction
  return (
    result.subject.reactionGroups.find((g) => g.content === 'THUMBS_UP')?.reactors.totalCount ?? 0
  )
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
