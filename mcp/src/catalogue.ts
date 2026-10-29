import { MARKETPLACE_URL, MarketplaceError, USER_AGENT } from './config'
import type { LIMITS, ResolvedListing } from '../../lib/schema'

/**
 * Read side: the static catalogue published by the site.
 *
 * `/catalogue.json` is one prerendered file holding every listing, so there is
 * nothing to query and nothing that can be down independently of the site.
 * It is fetched once per process and kept briefly — a session that searches
 * five times should not pull the catalogue five times, and a session that runs
 * for hours should not serve yesterday's.
 */

export type CatalogueEntry = Omit<ResolvedListing, 'readme'>

export type Catalogue = {
  version: number
  generatedAt: string
  site: string
  repository: { owner: string; name: string; slug: string }
  auth: { githubClientId: string; scope: string; deviceFlow: boolean } | null
  limits: typeof LIMITS
  taxonomy: {
    categories: { id: string; label: string; description: string }[]
    types: readonly string[]
    licenses: readonly string[]
    pricingModels: readonly string[]
  }
  listings: CatalogueEntry[]
}

const TTL_MS = 5 * 60 * 1000

let cached: { at: number; catalogue: Catalogue } | null = null

async function getJson<T>(path: string): Promise<T> {
  const url = `${MARKETPLACE_URL}${path}`

  let response: Response
  try {
    response = await fetch(url, {
      headers: { accept: 'application/json', 'user-agent': USER_AGENT },
      signal: AbortSignal.timeout(20_000),
    })
  } catch (error) {
    throw new MarketplaceError(
      `Could not reach ${url}: ${(error as Error).message}. ` +
        'Check the network, or set TAPIR_MARKETPLACE_URL if the marketplace lives elsewhere.',
    )
  }

  if (response.status === 404) {
    throw new MarketplaceError(`Not found: ${url}`)
  }
  if (!response.ok) {
    throw new MarketplaceError(`${url} returned ${response.status} ${response.statusText}.`)
  }

  try {
    return (await response.json()) as T
  } catch (error) {
    throw new MarketplaceError(`${url} did not return JSON: ${(error as Error).message}`)
  }
}

export async function getCatalogue(options?: { fresh?: boolean }): Promise<Catalogue> {
  if (!options?.fresh && cached && Date.now() - cached.at < TTL_MS) {
    return cached.catalogue
  }

  const catalogue = await getJson<Catalogue>('/catalogue.json')

  if (!Array.isArray(catalogue?.listings)) {
    throw new MarketplaceError(
      `${MARKETPLACE_URL}/catalogue.json is not a marketplace catalogue. ` +
        'Is TAPIR_MARKETPLACE_URL pointing at the right site?',
    )
  }

  cached = { at: Date.now(), catalogue }
  return catalogue
}

/** One listing in full, README included. */
export async function getFullListing(slug: string): Promise<ResolvedListing | null> {
  try {
    return await getJson<ResolvedListing>(`/catalogue/${encodeURIComponent(slug)}`)
  } catch (error) {
    if (error instanceof MarketplaceError && error.message.startsWith('Not found:')) return null
    throw error
  }
}

/** Drops the cache so the next read reflects a listing just published. */
export function invalidateCatalogue(): void {
  cached = null
}
