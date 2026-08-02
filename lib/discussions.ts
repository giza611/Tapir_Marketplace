import { REPO_NAME, REPO_OWNER } from './site'

/**
 * Reads GitHub Discussions at build time.
 *
 * This is the whole forum. Per-listing comment threads (created by giscus,
 * titled `listing:<slug>`) and free-standing community topics live in the same
 * Discussions space, so one query returns both and the "single searchable
 * place" requirement needs no extra storage.
 *
 * Degrades quietly: without a token, or before Discussions is enabled, this
 * returns an empty set and the forum page renders a setup prompt instead of
 * failing the build. A half-configured deploy should still ship.
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

const QUERY = `
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

type GraphQLNode = {
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

export async function getDiscussions(): Promise<DiscussionData> {
  const token = process.env.GITHUB_TOKEN
  if (!token) {
    return { available: false, discussions: [], categories: [] }
  }

  const discussions: Discussion[] = []
  let cursor: string | null = null

  try {
    for (;;) {
      const response = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: QUERY,
          variables: { owner: REPO_OWNER, repo: REPO_NAME, cursor },
        }),
      })

      if (!response.ok) throw new Error(`GitHub returned ${response.status}`)

      const payload = (await response.json()) as {
        data?: {
          repository: {
            discussions: {
              pageInfo: { hasNextPage: boolean; endCursor: string | null }
              nodes: GraphQLNode[]
            }
          } | null
        }
        errors?: { message: string }[]
      }

      if (payload.errors?.length) throw new Error(payload.errors[0].message)
      const page = payload.data?.repository?.discussions
      if (!page) throw new Error('Discussions are not enabled on this repository')

      for (const node of page.nodes) {
        const isListingThread = node.title.startsWith('listing:')
        discussions.push({
          number: node.number,
          title: isListingThread ? node.title.slice('listing:'.length) : node.title,
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
          listingSlug: isListingThread ? node.title.slice('listing:'.length) : null,
        })
      }

      if (!page.pageInfo.hasNextPage) break
      cursor = page.pageInfo.endCursor
    }
  } catch (error) {
    console.warn(`[forum] ${(error as Error).message} — rendering setup prompt instead.`)
    return { available: false, discussions: [], categories: [] }
  }

  const categories = [...new Set(discussions.map((d) => d.category))].sort()
  return { available: true, discussions, categories }
}
