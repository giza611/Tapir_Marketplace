import fs from 'node:fs'
import path from 'node:path'

import {
  EMPTY_STATS,
  parseListingJson,
  sortVersions,
  validateListing,
  type ListingStats,
  type ResolvedListing,
} from './schema'

/**
 * Build-time reader for the `listings/` directory — the marketplace database.
 *
 * Server-only. Everything here runs during `next build` (or `next dev`) and the
 * result is baked into the static output, so the public site makes zero runtime
 * queries and cannot be taken down by a quota or a paused service.
 */

const LISTINGS_DIR = path.join(process.cwd(), 'listings')
const STATS_FILE = path.join(process.cwd(), 'lib', 'stats.generated.json')

/** Read once per process. `next build` renders many pages; don't re-read per page. */
let cache: ResolvedListing[] | null = null

function readStats(): Record<string, ListingStats> {
  try {
    return JSON.parse(fs.readFileSync(STATS_FILE, 'utf8')) as Record<string, ListingStats>
  } catch {
    // Expected before scripts/refresh-stats.ts has ever run.
    return {}
  }
}

function readListing(slug: string, stats: Record<string, ListingStats>): ResolvedListing {
  const dir = path.join(LISTINGS_DIR, slug)
  const jsonPath = path.join(dir, 'listing.json')

  let raw: unknown
  try {
    raw = parseListingJson(fs.readFileSync(jsonPath, 'utf8'))
  } catch (error) {
    throw new Error(
      `listings/${slug}/listing.json is missing or is not valid JSON: ${(error as Error).message}`,
    )
  }

  const result = validateListing(raw)
  if (!result.ok) {
    // CI should have blocked this before it reached main. Failing the build is
    // the correct response: a malformed listing must never render half-broken.
    throw new Error(
      `listings/${slug}/listing.json failed validation:\n  ${result.errors.join('\n  ')}`,
    )
  }

  const listing = result.listing
  if (listing.slug !== slug) {
    throw new Error(
      `listings/${slug}/listing.json declares slug "${listing.slug}" but lives in folder "${slug}"`,
    )
  }

  const readmePath = path.join(dir, 'README.md')
  const readme = fs.existsSync(readmePath) ? fs.readFileSync(readmePath, 'utf8') : ''

  const versions = sortVersions(listing.versions)
  const supported = [...new Set(versions.flatMap((v) => v.archicadVersions))].sort(
    (a, b) => Number(b) - Number(a),
  )

  return {
    ...listing,
    versions,
    readme,
    latestVersion: versions[0],
    supportedArchicadVersions: supported,
    stats: stats[slug] ?? EMPTY_STATS,
  }
}

export function getAllListings(): ResolvedListing[] {
  if (cache) return cache

  if (!fs.existsSync(LISTINGS_DIR)) {
    cache = []
    return cache
  }

  const stats = readStats()
  const slugs = fs
    .readdirSync(LISTINGS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => entry.name)

  cache = slugs
    .map((slug) => readListing(slug, stats))
    .sort((a, b) => b.latestVersion.releasedAt.localeCompare(a.latestVersion.releasedAt))

  return cache
}

export function getListingSlugs(): string[] {
  return getAllListings().map((listing) => listing.slug)
}

export function getListing(slug: string): ResolvedListing | undefined {
  return getAllListings().find((listing) => listing.slug === slug)
}

/**
 * The shape shipped to the browser for the grid: everything needed to filter,
 * sort and search, with the README stripped out. READMEs are the bulk of the
 * payload and are only ever needed on a detail page.
 */
export type CatalogEntry = Omit<ResolvedListing, 'readme'> & { readme?: never }

export function getCatalog(): CatalogEntry[] {
  return getAllListings().map((listing) => {
    const entry: Record<string, unknown> = { ...listing }
    delete entry.readme
    return entry as CatalogEntry
  })
}
