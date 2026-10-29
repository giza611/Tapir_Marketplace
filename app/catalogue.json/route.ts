import { getCatalog } from '@/lib/listings'
import {
  CATEGORIES,
  CATEGORY_DESCRIPTIONS,
  CATEGORY_LABELS,
  LICENSES,
  LIMITS,
  LISTING_TYPES,
  PRICING_MODELS,
} from '@/lib/schema'
import { REPO_NAME, REPO_OWNER, REPO_SLUG, SITE } from '@/lib/site'

/**
 * The machine-readable catalogue: the whole marketplace in one file.
 *
 * This exists for clients that are not a browser — chiefly the MCP server in
 * `mcp/`, which lets an AI assistant search listings and publish on its
 * author's behalf. The site itself does not use it; its pages read the
 * filesystem at build time.
 *
 * Deliberately a single document rather than a query API. It is prerendered
 * into the static output, so it costs nothing to serve, cannot fail at runtime
 * and can be cached by anything. A client that wants to filter downloads it
 * once and filters locally.
 *
 * READMEs are omitted — they are the bulk of the payload and are only needed
 * for one listing at a time. `/catalogue/<slug>` serves those.
 *
 * The response also describes the taxonomy and the submission limits, so a
 * client can validate a listing, and name a category, without having this
 * repository checked out.
 */

export const dynamic = 'force-static'

export function GET() {
  /*
   * Read straight from the environment rather than importing lib/auth.ts:
   * that module reaches for `next/headers`, which has no business being
   * pulled into a route that must prerender.
   *
   * This is the OAuth *client* ID, which is public by design — it travels in
   * the authorize URL of every sign-in. The client secret is never exposed,
   * and the device flow does not use one. Publishing it here is what lets the
   * MCP server authenticate a contributor against whichever deployment it is
   * pointed at, including a fork, with nothing to configure by hand.
   */
  const clientId = (process.env.GITHUB_CLIENT_ID ?? '').trim()

  return Response.json(
    {
      /** Bumped when the shape changes in a way a client could notice. */
      version: 1,
      generatedAt: new Date().toISOString(),
      site: SITE.url,
      repository: { owner: REPO_OWNER, name: REPO_NAME, slug: REPO_SLUG },
      /**
       * How a client obtains a token to publish with. `null` when the
       * deployment has no OAuth app configured, which means device-flow
       * sign-in is unavailable and a personal access token is the only route.
       */
      auth: clientId
        ? { githubClientId: clientId, scope: 'public_repo', deviceFlow: true }
        : null,
      limits: LIMITS,
      taxonomy: {
        categories: CATEGORIES.map((id) => ({
          id,
          label: CATEGORY_LABELS[id],
          description: CATEGORY_DESCRIPTIONS[id],
        })),
        types: LISTING_TYPES,
        licenses: LICENSES,
        pricingModels: PRICING_MODELS,
      },
      listings: getCatalog(),
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=86400',
        // Any origin may read it: it is the same data the pages already show.
        'Access-Control-Allow-Origin': '*',
      },
    },
  )
}
