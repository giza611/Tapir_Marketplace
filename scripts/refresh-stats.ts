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

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

import { Octokit } from '@octokit/rest'

import { fetchDiscussionsFromApi, type Discussion } from '../lib/discussions'
import { integrityKey, type IntegrityIndex } from '../lib/integrity'
import {
  EMPTY_STATS,
  parseListingJson,
  validateListing,
  type Listing,
  type ListingStats,
} from '../lib/schema'

const ROOT = process.cwd()
const LISTINGS_DIR = path.join(ROOT, 'listings')
const STATS_FILE = path.join(ROOT, 'lib', 'stats.generated.json')
const DISCUSSIONS_FILE = path.join(ROOT, 'lib', 'discussions.generated.json')
const INTEGRITY_FILE = path.join(ROOT, 'lib', 'integrity.generated.json')

/** Refuse to hash anything implausibly large for a script or add-on. */
const MAX_DOWNLOAD_BYTES = 128 * 1024 * 1024

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

/**
 * Streams a URL and returns its SHA-256 without ever holding the whole file in
 * memory. Bounded so a hostile or mistaken link cannot exhaust the runner.
 */
async function hashDownload(
  url: string,
): Promise<{ sha256: string } | { error: string } | { skip: string }> {
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      headers: { 'User-Agent': 'tapir-marketplace-integrity-check' },
    })
    if (!response.ok) return { error: `HTTP ${response.status}` }
    if (!response.body) return { error: 'empty response' }

    // A web page is not an artifact, and hashing one is worse than useless:
    // pages carry per-request tokens and timestamps, so the hash differs on
    // every fetch and the listing would be flagged as drifted forever. Skip
    // them rather than punish an author for linking a landing page.
    const contentType = response.headers.get('content-type') ?? ''
    if (contentType.includes('text/html')) {
      return { skip: 'link points at a web page rather than a file' }
    }

    const declared = Number(response.headers.get('content-length') ?? '0')
    if (declared > MAX_DOWNLOAD_BYTES) return { error: 'file too large to verify' }

    const hash = crypto.createHash('sha256')
    let total = 0
    for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
      total += chunk.byteLength
      if (total > MAX_DOWNLOAD_BYTES) return { error: 'file too large to verify' }
      hash.update(chunk)
    }
    return { sha256: hash.digest('hex') }
  } catch (error) {
    return { error: (error as Error).message }
  }
}

/**
 * Trust on first use. A version's hash is accepted the first time it is seen
 * and compared every run after that.
 *
 * Two things count as drift, and both are the same attack: the bytes changed
 * under a published version, or the URL was repointed for a version that has
 * already been published. An author with a legitimately different file should
 * publish a new version — that is what versions are for.
 */
async function checkIntegrity(
  listings: { slug: string; listing: Listing }[],
  previous: IntegrityIndex,
  today: string,
): Promise<IntegrityIndex> {
  const next: IntegrityIndex = {}

  for (const { slug, listing } of listings) {
    for (const version of listing.versions) {
      const key = integrityKey(slug, version.version)
      const known = previous[key]

      // Already condemned. Do not re-hash: a drifted record must not be able to
      // launder itself clean by changing again on a later run.
      if (known?.status === 'drifted') {
        next[key] = known
        continue
      }

      if (known && known.url !== version.downloadUrl) {
        next[key] = {
          ...known,
          status: 'drifted',
          note: `URL changed for a published version (was ${known.url})`,
          lastVerified: today,
        }
        console.warn(`DRIFT ${key}: download URL was repointed`)
        continue
      }

      const result = await hashDownload(version.downloadUrl)

      if ('skip' in result) {
        // Not verifiable, but not suspicious either. Left downloadable — see
        // isDownloadable() — with the reason recorded so it is visible.
        next[key] = {
          url: version.downloadUrl,
          sha256: '',
          firstSeen: known?.firstSeen ?? today,
          lastVerified: today,
          status: 'unverified',
          note: result.skip,
        }
        console.log(`SKIPPED  ${key}: ${result.skip}`)
        continue
      }

      if ('error' in result) {
        next[key] = known
          ? { ...known, status: 'unreachable', note: result.error, lastVerified: today }
          : {
              url: version.downloadUrl,
              sha256: '',
              firstSeen: today,
              lastVerified: today,
              status: 'unreachable',
              note: result.error,
            }
        console.warn(`UNREACHABLE ${key}: ${result.error}`)
        continue
      }

      if (!known || !known.sha256) {
        next[key] = {
          url: version.downloadUrl,
          sha256: result.sha256,
          firstSeen: known?.firstSeen ?? today,
          lastVerified: today,
          status: 'verified',
        }
        console.log(`RECORDED ${key}: ${result.sha256.slice(0, 12)}…`)
        continue
      }

      if (known.sha256 !== result.sha256) {
        next[key] = {
          ...known,
          status: 'drifted',
          note: 'file contents changed after publication',
          lastVerified: today,
        }
        console.warn(`DRIFT ${key}: contents changed since ${known.firstSeen}`)
        continue
      }

      next[key] = { ...known, status: 'verified', lastVerified: today, note: undefined }
    }
  }

  return next
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
  const parsedListings: { slug: string; listing: Listing }[] = []
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
      if (parsed.ok) {
        downloadUrls = parsed.listing.versions.map((v) => v.downloadUrl)
        parsedListings.push({ slug, listing: parsed.listing })
      }
    } catch {
      console.warn(`Skipping ${slug}: listing.json unreadable`)
    }

    const downloads = await countDownloads(downloadUrls)
    const thread = bySlug.get(slug)

    next[slug] = {
      downloads: downloads ?? previousStats.downloads,
      // THUMBS_UP specifically, not every reaction type: this is the number the
      // vote button on the listing page adds to, so the two must agree.
      reactions: thread?.upvotes ?? previousStats.reactions,
      commentCount: thread?.comments ?? previousStats.commentCount,
    }
  }

  const changed = writeIfChanged(STATS_FILE, next)
  console.log(`${changed ? 'Updated' : 'No change to'} stats for ${slugs.length} listing(s)`)

  // ---- Download integrity ------------------------------------------------
  // This is what makes accepting a download link on any host defensible: the
  // file itself is watched, rather than the hostname being vetted.
  const today = new Date().toISOString().slice(0, 10)
  const integrity = await checkIntegrity(
    parsedListings,
    readJson<IntegrityIndex>(INTEGRITY_FILE, {}),
    today,
  )
  const integrityChanged = writeIfChanged(INTEGRITY_FILE, integrity)

  const drifted = Object.entries(integrity).filter(([, r]) => r.status === 'drifted')
  console.log(
    `${integrityChanged ? 'Updated' : 'No change to'} integrity for ${
      Object.keys(integrity).length
    } version(s)${drifted.length > 0 ? ` — ${drifted.length} FLAGGED` : ''}`,
  )
  for (const [key, record] of drifted) {
    console.warn(`  flagged: ${key} — ${record.note ?? 'changed'}`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
