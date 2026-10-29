import { readFileSync } from 'node:fs'

import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

import {
  branchName,
  commitToFork,
  ensureFork,
  listPendingSubmissions,
  openPullRequest,
  type FileChange,
} from '../../../lib/github'
import { requireCredentials } from '../auth'
import { getCatalogue, getFullListing, invalidateCatalogue } from '../catalogue'
import { assertSameRepository, MarketplaceError, TARGET_REPO, VERSION } from '../config'
import { assemble, check, resolveScreenshots, type ListingInput } from '../listing'
import { guard, text } from '../result'
import { LISTING_SHAPE } from './validate'

/**
 * The write half.
 *
 * Every step of the actual publish — fork, commit, pull request — is
 * `lib/github.ts`, unchanged, the same code path the website's dashboard uses.
 * What this file adds is the checks that stop an automated caller doing damage
 * a person filling in a form would not: it refuses to publish as anyone other
 * than the signed-in account, refuses to touch a listing somebody else owns,
 * refuses to queue submissions without limit, and records in the pull request
 * that an assistant produced it.
 */

/**
 * How many open submissions one author may have at once.
 *
 * A human opens one pull request and waits for it. A loop opens them until
 * something stops it, and each one costs the repository a CI run. Three is
 * enough for a person publishing a few listings in an afternoon and low
 * enough that a runaway caller is a nuisance rather than an outage.
 */
const MAX_OPEN_SUBMISSIONS = 3

export function registerPublishTools(server: McpServer): void {
  server.registerTool(
    'publish_listing',
    {
      title: 'Publish or update a marketplace listing',
      description:
        'Publishes a listing to the Tapir marketplace, as a pull request from the signed-in ' +
        "author's GitHub account. Automated checks validate it and merge it, usually within a " +
        'couple of minutes, so this is a public, self-merging submission — not a draft. ' +
        'Requires sign_in first. Publishing an existing slug submits an update, and only its ' +
        'own author may do that. ' +
        'downloadUrl must be a link the author gave you to their own release: never invent, ' +
        'guess or substitute one — it is what people run inside Archicad. ' +
        'Run validate_listing first to see problems without submitting anything. ' +
        LISTING_SHAPE,
      inputSchema: {
        listing: z
          .record(z.string(), z.unknown())
          .describe('The listing.json contents, as an object.'),
        readme: z
          .string()
          .max(100_000)
          .optional()
          .describe(
            'Markdown body of the listing page. Keeps the published README when omitted on ' +
              'an update. Raw HTML is escaped, not rendered.',
          ),
        screenshots: z
          .array(
            z.object({
              name: z
                .string()
                .max(120)
                .describe('Filename to publish it under, e.g. "overview.png".'),
              path: z.string().describe('Absolute path to the image file on this machine.'),
            }),
          )
          .optional()
          .describe(
            'Screenshots to commit, read from local files. Replaces the published set; omit ' +
              'to leave existing screenshots alone.',
          ),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    },
    async ({ listing, readme, screenshots }) =>
      guard(async () => {
        const credentials = await requireCredentials()
        const catalogue = await getCatalogue({ fresh: true })

        // Never file a submission against a repository other than the one the
        // catalogue being read belongs to.
        assertSameRepository(catalogue.repository.slug)

        const slug = typeof listing.slug === 'string' ? listing.slug.trim() : ''
        if (!slug) {
          throw new MarketplaceError(
            'The listing needs a slug: lowercase words separated by hyphens, e.g. "zone-area-auditor".',
          )
        }

        const existing = catalogue.listings.find((entry) => entry.slug === slug) ?? null
        if (existing && existing.authorGithub.toLowerCase() !== credentials.login.toLowerCase()) {
          throw new MarketplaceError(
            `"${slug}" is published by @${existing.authorGithub}, and only they can change it. ` +
              `You are signed in as @${credentials.login}. Publish under a different slug instead.`,
          )
        }

        const resolved = screenshots ? resolveScreenshots(screenshots) : undefined

        const { candidate, droppedMedia } = assemble({ ...listing, slug } as ListingInput, {
          authorGithub: credentials.login,
          existing,
          screenshotNames: resolved?.map((shot) => shot.name),
        })

        const validated = check(candidate)
        if (!validated.ok) {
          return text(
            `${validated.report}\n\nNothing was submitted. Fix these and call publish_listing again.`,
          )
        }
        const listingToPublish = validated.listing

        // One author, a handful of open submissions. Checked before the fork so
        // a runaway caller does not leave debris behind either.
        const pending = await listPendingSubmissions(credentials.token, credentials.login)
        if (pending.length >= MAX_OPEN_SUBMISSIONS) {
          throw new MarketplaceError(
            [
              `@${credentials.login} already has ${pending.length} open submissions to ` +
                `${TARGET_REPO}, which is the limit.`,
              '',
              ...pending.map((item) => `  #${item.number} ${item.title} — ${item.url}`),
              '',
              'Wait for those to merge, or close one, before submitting another.',
            ].join('\n'),
          )
        }

        /*
         * Keep the published README when the caller did not supply one. The
         * dashboard can afford to default to a bare heading because its form
         * always carries the current text; here, omitting the argument on a
         * metadata-only update would silently delete the author's page.
         */
        let body = readme?.trim()
        if (!body && existing) {
          const published = await getFullListing(slug)
          body = published?.readme.trim()
        }

        const changes: FileChange[] = [
          {
            path: `listings/${slug}/listing.json`,
            content: `${JSON.stringify(listingToPublish, null, 2)}\n`,
          },
          {
            path: `listings/${slug}/README.md`,
            content: body ? `${body}\n` : `# ${listingToPublish.name}\n`,
          },
          ...(resolved ?? []).map((shot) => ({
            path: `listings/${slug}/media/${shot.name}`,
            content: readFileSync(shot.path).toString('base64'),
            encoding: 'base64' as const,
          })),
          // A screenshot no longer declared must also leave the repository: CI
          // rejects any file in media/ the listing does not list.
          ...droppedMedia.map((item) => ({ path: `listings/${slug}/${item}`, content: null })),
        ]

        const title = existing
          ? `Update ${listingToPublish.name}`
          : `Add ${listingToPublish.name}`

        await ensureFork(credentials.token, credentials.login)
        const branch = branchName(slug)
        await commitToFork(credentials.token, credentials.login, branch, title, changes)

        const pull = await openPullRequest(
          credentials.token,
          credentials.login,
          branch,
          title,
          [
            existing
              ? `@${credentials.login} is updating their listing \`${slug}\`.`
              : `@${credentials.login} is publishing a new listing, \`${slug}\`.`,
            '',
            'Submitted through the marketplace MCP server, by an AI assistant acting for the',
            'author. Automated checks run as usual; if they pass, this merges on its own.',
            '',
            `Submitted-Via: tapir-marketplace-mcp ${VERSION}`,
          ].join('\n'),
        )

        invalidateCatalogue()

        return text(
          [
            existing
              ? `Update submitted for "${listingToPublish.name}".`
              : `"${listingToPublish.name}" submitted.`,
            '',
            `  Pull request: ${pull.pullRequestUrl}`,
            `  Author:       @${credentials.login}`,
            `  Screenshots:  ${listingToPublish.media.length}`,
            droppedMedia.length > 0 ? `  Removed:      ${droppedMedia.join(', ')}` : '',
            '',
            'Automated checks validate it and merge it, usually within a couple of minutes; the ' +
              'listing goes live once the site rebuilds. If a check fails it comments on the ' +
              'pull request with what to change. list_my_submissions shows what is still open.',
          ]
            .filter(Boolean)
            .join('\n'),
        )
      }),
  )

  server.registerTool(
    'list_my_submissions',
    {
      title: 'List my open submissions',
      description:
        'The signed-in author’s submissions that have not merged yet, with whether each one is ' +
        'waiting on a maintainer. Published listings are not shown here — search_listings has ' +
        'those.',
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async () =>
      guard(async () => {
        const credentials = await requireCredentials()
        const pending = await listPendingSubmissions(credentials.token, credentials.login)

        if (pending.length === 0) {
          return text(
            `@${credentials.login} has no open submissions to ${TARGET_REPO}. ` +
              'Anything submitted earlier has either merged or been closed.',
          )
        }

        return text(
          [
            `${pending.length} open submission${pending.length === 1 ? '' : 's'} by @${credentials.login}:`,
            '',
            ...pending.map((item) =>
              [
                `  #${item.number} ${item.title}`,
                `    ${item.url}`,
                `    opened ${item.createdAt.slice(0, 10)}` +
                  (item.slugs.length > 0 ? ` · ${item.slugs.join(', ')}` : '') +
                  (item.needsReview ? ' · needs a maintainer: a check did not pass' : ''),
              ].join('\n'),
            ),
          ].join('\n'),
        )
      }),
  )
}
