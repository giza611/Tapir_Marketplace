/**
 * Collects everything the site needs from the GitHub API and writes it to disk:
 *
 *   lib/stats.generated.json        download counts, reactions, comment counts
 *   lib/discussions.generated.json  the forum index
 *
 * Run daily by .github/workflows/refresh-stats.yml, which commits both files
 * and triggers a rebuild.
 *
 * This is why the site needs no API credential of its own. Inside Actions the
 * token is injected automatically, scoped to this repository and rotated every
 * run — unlike a Personal Access Token, which expires and would eventually
 * break the forum on a project nobody is watching.
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

import { fetchDiscussionsFromApi, type Discussion } from '../lib/discussions'
import { EMPTY_STATS, parseListingJson, validateListing, type ListingStats } from '../lib/schema'

const ROOT = process.cwd()
const LISTINGS_DIR = path.join(ROOT, 'listings')
const STATS_FILE = path.join(ROOT, 'lib', 'stats.generated.json')
const DISCUSSIONS_FILE = path.join(ROOT, 'lib', 'discussions.generated.json')

const REPO_OWNER = process.env.REPO_OWNER ?? 'giza611'
const REPO_NAME = process.env.REPO_NAME ?? 'Tapir_Marketplace'

const token = process.env.GITHUB_TOKEN
if (!token) {
  console.error('GITHUB_TOKEN is required. Inside GitHub Actions, pass ${{ github.token }}.')
  process.exit(1)
}

const octokit = new Octokit({ auth: token })

type ReleaseAssetRef = { owner: string; repo: string; tag: string; asset: string }

/**
 * Recognises a GitHub release asset URL, the only download shape where an
 * exact count is available. Plain repository links have no download metric,
 * so those listings report zero rather than a fabricated number.
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

function readJson<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as T
  } catch {
    return fallback
  }
}

/** Writes only when the content actually changed, so the daily job produces no empty commits. */
function writeIfChanged(file: string, value: unknown): boolean {
  const serialised = `${JSON.stringify(value, null, 2)}\n`
  if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === serialised) return false
  fs.writeFileSync(file, serialised)
  return true
}

async function main() {
  // ---- Forum index -------------------------------------------------------
  let discussions: Discussion[] | null = null
  try {
    discussions = await fetchDiscussionsFromApi(token!, REPO_OWNER, REPO_NAME)
    const changed = writeIfChanged(DISCUSSIONS_FILE, discussions)
    console.log(
      `${changed ? 'Updated' : 'No change to'} forum index (${discussions.length} thread(s))`,
    )
  } catch (error) {
    // Discussions not enabled yet is the normal case on a fresh repository.
    console.warn(`Could not read discussions: ${(error as Error).message}`)
    // Seed an empty index so the forum page renders its "no threads" state
    // rather than the setup prompt once Discussions is switched on.
    if (!fs.existsSync(DISCUSSIONS_FILE)) writeIfChanged(DISCUSSIONS_FILE, [])
  }

  // ---- Per-listing stats -------------------------------------------------
  if (!fs.existsSync(LISTINGS_DIR)) {
    console.log('No listings/ directory; nothing further to refresh.')
    return
  }

  const previous = readJson<Record<string, ListingStats>>(STATS_FILE, {})
  const bySlug = new Map<string, Discussion>()
  for (const discussion of discussions ?? []) {
    // The `listing:` title prefix is what identifies a listing's thread, which
    // is why this does not also filter by discussion category.
    if (discussion.listingSlug) bySlug.set(discussion.listingSlug, discussion)
  }

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
        parseListingJson(fs.readFileSync(path.join(LISTINGS_DIR, slug, 'listing.json'), 'utf8')),
      )
      if (parsed.ok) downloadUrls = parsed.listing.versions.map((v) => v.downloadUrl)
    } catch {
      console.warn(`Skipping ${slug}: listing.json unreadable`)
    }

    const downloads = await countDownloads(downloadUrls)
    const thread = bySlug.get(slug)

    next[slug] = {
      downloads: downloads ?? previousStats.downloads,
      reactions: thread?.reactions ?? previousStats.reactions,
      commentCount: thread?.comments ?? previousStats.commentCount,
    }
  }

  const changed = writeIfChanged(STATS_FILE, next)
  console.log(`${changed ? 'Updated' : 'No change to'} stats for ${slugs.length} listing(s)`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
