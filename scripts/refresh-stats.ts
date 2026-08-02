/**
 * Collects download counts and discussion activity into lib/stats.generated.json.
 *
 * Run daily by .github/workflows/refresh-stats.yml, which commits the result
 * and triggers a rebuild. That is why the public site can show real numbers
 * while still being entirely static: the numbers are baked in, refreshed on a
 * schedule, and cost nothing per visitor.
 *
 *   GITHUB_TOKEN=... npx tsx scripts/refresh-stats.ts
 *
 * Failure policy: never destroy good data. If the API is unreachable or a
 * lookup fails, the previous value is kept rather than written back as zero —
 * a transient outage must not make every listing look abandoned.
 */

import fs from 'node:fs'
import path from 'node:path'

import { Octokit } from '@octokit/rest'

import { EMPTY_STATS, validateListing, type ListingStats } from '../lib/schema'

const ROOT = process.cwd()
const LISTINGS_DIR = path.join(ROOT, 'listings')
const OUTPUT_FILE = path.join(ROOT, 'lib', 'stats.generated.json')

const REPO_OWNER = process.env.REPO_OWNER ?? 'giza611'
const REPO_NAME = process.env.REPO_NAME ?? 'Tapir_Marketplace'

const token = process.env.GITHUB_TOKEN
if (!token) {
  console.error('GITHUB_TOKEN is required. Without it the API rate limit is 60 requests/hour.')
  process.exit(1)
}

const octokit = new Octokit({ auth: token })

type ReleaseAssetRef = { owner: string; repo: string; tag: string; asset: string }

/**
 * Recognises a GitHub release asset URL, the only download shape where an
 * exact count is available. Plain repository links have no download metric,
 * so those listings simply report zero rather than a fabricated number.
 */
function parseReleaseAsset(url: string): ReleaseAssetRef | null {
  const match = url.match(
    /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/releases\/download\/([^/]+)\/(.+)$/,
  )
  if (!match) return null
  return { owner: match[1], repo: match[2], tag: match[3], asset: decodeURIComponent(match[4]) }
}

async function countDownloads(urls: string[]): Promise<number | null> {
  const refs = urls.map(parseReleaseAsset).filter((ref): ref is ReleaseAssetRef => ref !== null)
  if (refs.length === 0) return 0

  let total = 0
  let anySucceeded = false

  for (const ref of refs) {
    try {
      const { data } = await octokit.repos.getReleaseByTag({
        owner: ref.owner,
        repo: ref.repo,
        tag: ref.tag,
      })
      const asset = data.assets.find((candidate) => candidate.name === ref.asset)
      if (asset) {
        total += asset.download_count
        anySucceeded = true
      }
    } catch {
      // Release deleted, repo gone private, or rate limited. Skip this one.
    }
  }

  return anySucceeded ? total : null
}

type DiscussionSummary = { reactions: number; comments: number }

/**
 * giscus is configured with `data-mapping="specific"`, so each listing's
 * discussion is titled exactly `listing:<slug>`. One query pulls the whole
 * category; matching happens locally.
 */
async function fetchDiscussions(): Promise<Map<string, DiscussionSummary> | null> {
  const query = `
    query($owner: String!, $repo: String!, $cursor: String) {
      repository(owner: $owner, name: $repo) {
        discussions(first: 100, after: $cursor) {
          pageInfo { hasNextPage endCursor }
          nodes {
            title
            category { name }
            reactions { totalCount }
            comments { totalCount }
          }
        }
      }
    }
  `

  const summaries = new Map<string, DiscussionSummary>()
  let cursor: string | null = null

  try {
    for (;;) {
      const response: {
        repository: {
          discussions: {
            pageInfo: { hasNextPage: boolean; endCursor: string | null }
            nodes: {
              title: string
              category: { name: string } | null
              reactions: { totalCount: number }
              comments: { totalCount: number }
            }[]
          }
        }
      } = await octokit.graphql(query, { owner: REPO_OWNER, repo: REPO_NAME, cursor })

      for (const node of response.repository.discussions.nodes) {
        // The `listing:` title prefix is what identifies a listing's thread, so
        // filtering by category as well would only add a way to misconfigure it.
        if (!node.title.startsWith('listing:')) continue
        summaries.set(node.title.slice('listing:'.length), {
          reactions: node.reactions.totalCount,
          comments: node.comments.totalCount,
        })
      }

      if (!response.repository.discussions.pageInfo.hasNextPage) break
      cursor = response.repository.discussions.pageInfo.endCursor
    }
  } catch (error) {
    // Discussions not enabled yet is the common case on a fresh repo.
    console.warn(`Could not read discussions: ${(error as Error).message}`)
    return null
  }

  return summaries
}

function readPreviousStats(): Record<string, ListingStats> {
  try {
    return JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8')) as Record<string, ListingStats>
  } catch {
    return {}
  }
}

async function main() {
  if (!fs.existsSync(LISTINGS_DIR)) {
    console.log('No listings/ directory; nothing to refresh.')
    return
  }

  const previous = readPreviousStats()
  const discussions = await fetchDiscussions()
  const next: Record<string, ListingStats> = {}

  const slugs = fs
    .readdirSync(LISTINGS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => entry.name)

  for (const slug of slugs) {
    const previousStats = previous[slug] ?? EMPTY_STATS

    let downloadUrls: string[] = []
    try {
      const parsed = validateListing(
        JSON.parse(fs.readFileSync(path.join(LISTINGS_DIR, slug, 'listing.json'), 'utf8')),
      )
      if (parsed.ok) downloadUrls = parsed.listing.versions.map((v) => v.downloadUrl)
    } catch {
      console.warn(`Skipping ${slug}: listing.json unreadable`)
    }

    const downloads = await countDownloads(downloadUrls)
    const discussion = discussions?.get(slug)

    next[slug] = {
      downloads: downloads ?? previousStats.downloads,
      reactions: discussion?.reactions ?? previousStats.reactions,
      commentCount: discussion?.comments ?? previousStats.commentCount,
    }
  }

  const serialised = `${JSON.stringify(next, null, 2)}\n`
  const unchanged = fs.existsSync(OUTPUT_FILE) && fs.readFileSync(OUTPUT_FILE, 'utf8') === serialised

  fs.writeFileSync(OUTPUT_FILE, serialised)
  console.log(
    `${unchanged ? 'No change to' : 'Updated'} stats for ${slugs.length} listing(s) → lib/stats.generated.json`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
