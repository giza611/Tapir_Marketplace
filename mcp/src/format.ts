import { integrityNotice, isDownloadable } from '../../lib/integrity'
import { CATEGORY_LABELS, LISTING_TYPE_LABELS, type Category, type ListingType } from '../../lib/schema'
import type { ResolvedListing } from '../../lib/schema'
import { MARKETPLACE_URL } from './config'
import type { CatalogueEntry } from './catalogue'

/**
 * Listings as text for a model to read.
 *
 * Search results are one line each, because a result set is scanned and mostly
 * discarded — spending twenty lines on a listing the model will not pick is
 * just context it has to carry. The detail view is where everything lands.
 */

function categoryLabel(id: string): string {
  return CATEGORY_LABELS[id as Category] ?? id
}

function typeLabel(id: string): string {
  return LISTING_TYPE_LABELS[id as ListingType] ?? id
}

function archicadRange(versions: string[]): string {
  if (versions.length === 0) return 'Archicad version unstated'
  const sorted = [...versions].sort((a, b) => Number(a) - Number(b))
  const first = sorted[0]
  const last = sorted[sorted.length - 1]
  return first === last ? `AC${first}` : `AC${first}-${last}`
}

function price(listing: CatalogueEntry | ResolvedListing): string {
  switch (listing.pricing.model) {
    case 'free':
      return 'free'
    case 'donation':
      return 'free, donations welcome'
    case 'paid':
      return 'paid'
  }
}

export function listingUrl(slug: string): string {
  return `${MARKETPLACE_URL}/scripts/${slug}`
}

/** One line per listing: enough to choose, not enough to act. */
export function listingLine(listing: CatalogueEntry): string {
  const facts = [
    typeLabel(listing.type),
    categoryLabel(listing.category),
    archicadRange(listing.supportedArchicadVersions),
    listing.license,
    price(listing),
    `v${listing.latestVersion.version}`,
  ]
  if (listing.stats.downloads > 0) facts.push(`${listing.stats.downloads} downloads`)

  return [
    `${listing.slug} — ${listing.name}`,
    `  ${listing.summary}`,
    `  ${facts.join(' · ')} · by @${listing.authorGithub}`,
  ].join('\n')
}

const README_BUDGET = 4000

export function listingDetail(listing: ResolvedListing): string {
  const lines: string[] = []

  lines.push(`# ${listing.name}  (${listing.slug})`)
  lines.push('')
  lines.push(listing.summary)
  lines.push('')
  lines.push(`- Type: ${typeLabel(listing.type)}`)
  lines.push(`- Category: ${categoryLabel(listing.category)}`)
  lines.push(`- Author: ${listing.author.name} (@${listing.authorGithub})`)
  if (listing.author.company) lines.push(`- Company: ${listing.author.company}`)
  lines.push(`- Licence: ${listing.license}`)
  lines.push(`- Price: ${price(listing)}${listing.pricing.url ? ` — ${listing.pricing.url}` : ''}`)
  if (listing.tags.length > 0) lines.push(`- Tags: ${listing.tags.join(', ')}`)
  lines.push(`- Archicad: ${archicadRange(listing.supportedArchicadVersions)}`)
  lines.push(`- Updated: ${listing.updatedAt} (first published ${listing.createdAt})`)
  lines.push(
    `- Stats: ${listing.stats.downloads} downloads, ${listing.stats.reactions} ratings, ` +
      `${listing.stats.commentCount} comments`,
  )
  if (listing.repositoryUrl) lines.push(`- Source: ${listing.repositoryUrl}`)
  if (listing.homepageUrl) lines.push(`- Homepage: ${listing.homepageUrl}`)
  if (listing.videoUrl) lines.push(`- Video: ${listing.videoUrl}`)
  lines.push(`- Marketplace page: ${listingUrl(listing.slug)}`)

  lines.push('')
  lines.push('## Versions')
  for (const version of listing.versions) {
    const record = listing.integrity[version.version]
    const blocked = !isDownloadable(record)
    const notice = integrityNotice(record)

    lines.push('')
    lines.push(`### ${version.version} — released ${version.releasedAt}`)
    lines.push(`- Archicad: ${version.archicadVersions.map((v) => `AC${v}`).join(', ')}`)
    if (version.minTapirVersion) lines.push(`- Needs Tapir add-on ${version.minTapirVersion}+`)
    /*
     * The download URL is withheld when integrity monitoring has flagged the
     * version. The site hides the button in that case; handing the URL to an
     * agent anyway would route around the one control that catches a file
     * being swapped after review.
     */
    if (blocked) {
      lines.push(`- Download: WITHHELD — ${notice ?? 'flagged by integrity monitoring'}`)
    } else {
      lines.push(`- Download: ${version.downloadUrl}`)
      if (record?.status === 'verified') {
        lines.push(`- Integrity: verified, unchanged since ${record.firstSeen}`)
      } else {
        lines.push('- Integrity: not yet checked (published recently)')
      }
    }
    if (version.changelog) lines.push(`- Changelog: ${version.changelog}`)
  }

  if (listing.readme.trim()) {
    lines.push('')
    lines.push('## README')
    lines.push('')
    const readme = listing.readme.trim()
    if (readme.length > README_BUDGET) {
      lines.push(readme.slice(0, README_BUDGET))
      lines.push('')
      lines.push(
        `[...truncated ${readme.length - README_BUDGET} characters. ` +
          `Full text at ${listingUrl(listing.slug)}]`,
      )
    } else {
      lines.push(readme)
    }
  }

  return lines.join('\n')
}
