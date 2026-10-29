import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

import { listingSchema } from '../../../lib/schema'
import { currentCredentials } from '../auth'
import { getCatalogue } from '../catalogue'
import { assemble, check, PLACEHOLDER_AUTHOR, type ListingInput } from '../listing'
import { guard, text } from '../result'

/** The listing contract, as JSON Schema, for a client that wants the fields. */
export const LISTING_SCHEMA_URI = 'tapir://listing.schema.json'

/**
 * Field guide repeated in both write-adjacent tool descriptions.
 *
 * Kept short on purpose: the authoritative list is the resource above, and the
 * validator's errors name every missing field precisely. This is the shape a
 * caller needs before the first attempt.
 */
export const LISTING_SHAPE = [
  'A listing is: slug (lowercase-hyphenated, becomes the URL), name, summary (10-200 chars), ',
  'category and type (see list_categories), tags, author {name, company?, city?, email?, ',
  'website?, bio?}, license (SPDX id or Proprietary), pricing {model: free|donation|paid, url?}, ',
  'and versions[] of {version, releasedAt (ISO date), downloadUrl (public https), ',
  'archicadVersions (e.g. ["28","29"]), changelog?, minTapirVersion?}. ',
  'Optional: repositoryUrl, homepageUrl, videoUrl (YouTube or Vimeo). ',
  'authorGithub, media, createdAt and updatedAt are filled in automatically — do not set them.',
].join('')

export function registerValidationTools(server: McpServer): void {
  server.registerResource(
    'listing-schema',
    LISTING_SCHEMA_URI,
    {
      title: 'Tapir marketplace listing schema',
      description:
        'JSON Schema for listings/<slug>/listing.json, generated from the marketplace’s own ' +
        'Zod contract. This is what CI validates every submission against.',
      mimeType: 'application/schema+json',
    },
    () => ({
      contents: [
        {
          uri: LISTING_SCHEMA_URI,
          mimeType: 'application/schema+json',
          text: JSON.stringify(
            z.toJSONSchema(listingSchema, { io: 'input', unrepresentable: 'any' }),
            null,
            2,
          ),
        },
      ],
    }),
  )

  server.registerTool(
    'validate_listing',
    {
      title: 'Check a listing before publishing',
      description:
        'Validates a draft listing against the marketplace contract and reports exactly what ' +
        'CI would reject, without publishing anything or needing a GitHub account. Use this ' +
        'to iterate on a draft, then publish_listing once it passes. ' +
        LISTING_SHAPE,
      inputSchema: {
        listing: z
          .record(z.string(), z.unknown())
          .describe('The draft listing.json contents, as an object.'),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ listing }) =>
      guard(async () => {
        const credentials = await currentCredentials()
        const slug = typeof listing.slug === 'string' ? listing.slug : ''

        // Validate against what publishing would actually commit, so a draft
        // that passes here does not then fail on a field this tool filled in
        // differently.
        const catalogue = await getCatalogue()
        const existing = catalogue.listings.find((entry) => entry.slug === slug) ?? null

        const { candidate } = assemble(listing as ListingInput, {
          authorGithub: credentials?.login ?? PLACEHOLDER_AUTHOR,
          existing,
        })

        const result = check(candidate)
        if (!result.ok) return text(result.report)

        const notes: string[] = ['This listing is valid. publish_listing would accept it.']

        if (!credentials) {
          notes.push(
            '',
            'Nobody is signed in, so authorGithub was checked against a placeholder; publishing ' +
              'sets it to the signed-in account.',
          )
        }
        if (existing) {
          notes.push(
            '',
            `"${slug}" is already published by @${existing.authorGithub}` +
              (credentials && existing.authorGithub.toLowerCase() !== credentials.login.toLowerCase()
                ? ' — only they can change it, so this would be rejected.'
                : ', so publishing would submit an update to it.'),
          )
        }
        if (result.listing.media.length === 0) {
          notes.push(
            '',
            'No screenshots. Pass screenshots to publish_listing to add some — listings with ' +
              'images get noticed.',
          )
        }

        return text(notes.join('\n'))
      }),
  )
}
