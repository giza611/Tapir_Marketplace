import { REPO_SLUG } from '../../lib/site'
import pkg from '../package.json'

/**
 * Where this server reads from and writes to.
 *
 * Reading is always HTTP against a deployed marketplace; the server never needs
 * a checkout. Writing goes to the GitHub repository behind that deployment.
 *
 * Those two are configured separately — the site URL here, the repository by
 * `lib/site.ts` — which means they can disagree. They must not: a pull request
 * aimed at the wrong repository is a submission sent to a stranger. Nothing
 * stops that automatically, so `assertSameRepository` below is called before
 * every write.
 */

function clean(raw: string | undefined): string | undefined {
  const cleaned = raw?.replace(/^\ufeff/, '').trim()
  return cleaned && cleaned.length > 0 ? cleaned : undefined
}

export const VERSION: string = pkg.version

export const USER_AGENT = `tapir-marketplace-mcp/${VERSION}`

/** Trailing slashes removed so paths can be appended without doubling up. */
export const MARKETPLACE_URL = (
  clean(process.env.TAPIR_MARKETPLACE_URL) ??
  clean(process.env.NEXT_PUBLIC_SITE_URL) ??
  'https://tapir-marketplace.vercel.app'
).replace(/\/+$/, '')

/**
 * The repository `lib/github.ts` will fork and open a pull request against,
 * from `NEXT_PUBLIC_REPO_OWNER` / `NEXT_PUBLIC_REPO_NAME` or its defaults.
 */
export const TARGET_REPO = REPO_SLUG

/**
 * A token supplied by the environment, for people who would rather manage one
 * themselves than sign in — and for anything running unattended. Needs the
 * `public_repo` scope. When absent, `sign_in` obtains one by device flow.
 */
export const ENV_TOKEN = clean(process.env.TAPIR_GITHUB_TOKEN) ?? clean(process.env.GITHUB_TOKEN)

export class MarketplaceError extends Error {}

/**
 * Refuses to write when the catalogue being read and the repository being
 * written to are not the same project.
 *
 * This is the footgun it exists for: point the server at a fork's website
 * without also setting `NEXT_PUBLIC_REPO_OWNER`, and every submission would be
 * read from the fork and filed against the original.
 */
export function assertSameRepository(catalogueRepoSlug: string): void {
  if (catalogueRepoSlug.toLowerCase() === TARGET_REPO.toLowerCase()) return

  throw new MarketplaceError(
    [
      `Refusing to publish: ${MARKETPLACE_URL} is served from ${catalogueRepoSlug}, but this ` +
        `server would open a pull request against ${TARGET_REPO}.`,
      '',
      'Set both to the same project, or unset TAPIR_MARKETPLACE_URL to use the defaults:',
      `  NEXT_PUBLIC_REPO_OWNER=${catalogueRepoSlug.split('/')[0]}`,
      `  NEXT_PUBLIC_REPO_NAME=${catalogueRepoSlug.split('/')[1]}`,
    ].join('\n'),
  )
}
