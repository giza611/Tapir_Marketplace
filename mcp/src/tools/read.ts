import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

import {
  CATEGORIES,
  CATEGORY_DESCRIPTIONS,
  CATEGORY_LABELS,
  LICENSES,
  LISTING_TYPES,
  PRICING_MODELS,
} from '../../../lib/schema'
import { getCatalogue, getFullListing, type CatalogueEntry } from '../catalogue'
import { MARKETPLACE_URL } from '../config'
import { listingDetail, listingLine } from '../format'
import { guard, text } from '../result'

/**
 * The read half: nothing here authenticates, writes, or has a side effect.
 * It is all one static JSON document, filtered locally.
 */

function haystack(listing: CatalogueEntry): string {
  return [
    listing.slug,
    listing.name,
    listing.summary,
    listing.tags.join(' '),
    listing.author.name,
    listing.authorGithub,
    listing.category,
    listing.type,
  ]
    .join(' ')
    .toLowerCase()
}

/**
 * Term frequency with a bonus for hits in the name, which is the field people
 * actually search by. Deliberately not a search engine: the catalogue is a few
 * hundred rows at most, and a dependency that had to be kept in step with the
 * site's own search would be worse than this.
 */
function score(listing: CatalogueEntry, terms: string[]): number {
  if (terms.length === 0) return 1
  const body = haystack(listing)
  const name = `${listing.slug} ${listing.name}`.toLowerCase()

  let total = 0
  for (const term of terms) {
    if (!body.includes(term)) return 0
    total += 1
    if (name.includes(term)) total += 2
  }
  return total
}

export function registerReadTools(server: McpServer): void {
  server.registerTool(
    'search_listings',
    {
      title: 'Search the Tapir marketplace',
      description:
        'Search published Tapir scripts and Archicad add-ons. Returns one line per match: ' +
        'slug, name, summary and key facts. Call get_listing with a slug for the full entry, ' +
        'including its download URL. Every argument is optional; with none, returns the most ' +
        'recently updated listings.',
      inputSchema: {
        query: z
          .string()
          .max(200)
          .optional()
          .describe('Free text, matched against name, summary, tags and author.'),
        category: z.enum(CATEGORIES).optional(),
        type: z.enum(LISTING_TYPES).optional(),
        archicadVersion: z
          .string()
          .regex(/^(?:2\d|3\d)$/)
          .optional()
          .describe('Archicad major version, e.g. "28". Keeps only listings that support it.'),
        license: z.enum(LICENSES).optional(),
        pricing: z.enum(PRICING_MODELS).optional(),
        author: z.string().max(100).optional().describe("The author's GitHub username."),
        tag: z.string().max(30).optional(),
        sort: z
          .enum(['relevance', 'downloads', 'updated'])
          .default('relevance')
          .describe('"relevance" falls back to most recently updated when there is no query.'),
        limit: z.number().int().min(1).max(50).default(10),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (args) =>
      guard(async () => {
        const catalogue = await getCatalogue()
        const terms = (args.query ?? '')
          .toLowerCase()
          .split(/\s+/)
          .map((term) => term.trim())
          .filter(Boolean)

        const tag = args.tag?.toLowerCase()
        const author = args.author?.toLowerCase()

        let matches = catalogue.listings.filter((listing) => {
          if (args.category && listing.category !== args.category) return false
          if (args.type && listing.type !== args.type) return false
          if (args.license && listing.license !== args.license) return false
          if (args.pricing && listing.pricing.model !== args.pricing) return false
          if (
            args.archicadVersion &&
            !listing.supportedArchicadVersions.includes(args.archicadVersion)
          ) {
            return false
          }
          if (author && listing.authorGithub.toLowerCase() !== author) return false
          if (tag && !listing.tags.some((entry) => entry.toLowerCase() === tag)) return false
          return score(listing, terms) > 0
        })

        if (args.sort === 'downloads') {
          matches = matches.sort((a, b) => b.stats.downloads - a.stats.downloads)
        } else if (args.sort === 'updated' || terms.length === 0) {
          matches = matches.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        } else {
          matches = matches.sort(
            (a, b) => score(b, terms) - score(a, terms) || b.updatedAt.localeCompare(a.updatedAt),
          )
        }

        const shown = matches.slice(0, args.limit)
        const total = catalogue.listings.length

        if (shown.length === 0) {
          return text(
            `No listing matches that. The marketplace has ${total} listings in total — ` +
              'try fewer filters, or list_categories to see what is covered.',
          )
        }

        const header =
          matches.length > shown.length
            ? `${shown.length} of ${matches.length} matches (${total} listings published):`
            : `${shown.length} match${shown.length === 1 ? '' : 'es'} (${total} listings published):`

        return text([header, '', ...shown.map(listingLine)].join('\n\n'))
      }),
  )

  server.registerTool(
    'get_listing',
    {
      title: 'Get one marketplace listing',
      description:
        'The full entry for one listing: every version with its download URL, Archicad ' +
        'compatibility, licence, author, integrity status and README. A download URL is ' +
        'withheld when integrity monitoring has flagged that version as changed or unreachable.',
      inputSchema: {
        slug: z.string().min(1).max(100).describe('Listing slug, e.g. "zone-area-auditor".'),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ slug }) =>
      guard(async () => {
        const listing = await getFullListing(slug)
        if (listing) return text(listingDetail(listing))

        // A wrong slug is the common failure here. Name the near misses rather
        // than making the model start its search over from nothing.
        const catalogue = await getCatalogue()
        const needle = slug.toLowerCase()
        const near = catalogue.listings
          .filter(
            (entry) =>
              entry.slug.includes(needle) ||
              needle.includes(entry.slug) ||
              entry.name.toLowerCase().includes(needle),
          )
          .slice(0, 5)

        return text(
          [
            `There is no listing with the slug "${slug}".`,
            '',
            ...(near.length > 0
              ? ['Did you mean:', ...near.map((entry) => `  ${entry.slug} — ${entry.name}`)]
              : ['Use search_listings to find one.']),
          ].join('\n'),
        )
      }),
  )

  server.registerTool(
    'list_categories',
    {
      title: 'List marketplace categories',
      description:
        'The marketplace taxonomy — categories, listing types, licences and pricing models — ' +
        'with the number of published listings in each category. These are the exact values a ' +
        'listing.json must use.',
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async () =>
      guard(async () => {
        const catalogue = await getCatalogue()
        const counts = new Map<string, number>()
        for (const listing of catalogue.listings) {
          counts.set(listing.category, (counts.get(listing.category) ?? 0) + 1)
        }

        return text(
          [
            'Categories — id, label, what belongs there, published count:',
            '',
            ...CATEGORIES.map(
              (id) =>
                `  ${id} (${counts.get(id) ?? 0}) — ${CATEGORY_LABELS[id]}: ` +
                CATEGORY_DESCRIPTIONS[id],
            ),
            '',
            `Types: ${LISTING_TYPES.join(', ')}`,
            `Licences: ${LICENSES.join(', ')}`,
            `Pricing models: ${PRICING_MODELS.join(', ')}`,
            '',
            `Browse: ${MARKETPLACE_URL}`,
          ].join('\n'),
        )
      }),
  )
}
