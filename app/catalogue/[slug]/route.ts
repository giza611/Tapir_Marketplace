import { getListing, getListingSlugs } from '@/lib/listings'

/**
 * One listing, in full, including its rendered-from-disk README.
 *
 * The companion to `/catalogue.json`, which omits READMEs to stay small. Both
 * are prerendered at build time; see that file for why this exists.
 */

export const dynamic = 'force-static'
/** Only published slugs resolve. Anything else is a 404, not a build-time fetch. */
export const dynamicParams = false

type Props = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return getListingSlugs().map((slug) => ({ slug }))
}

export async function GET(_request: Request, { params }: Props) {
  const { slug } = await params
  const listing = getListing(slug)

  if (!listing) {
    return Response.json({ error: `No listing "${slug}".` }, { status: 404 })
  }

  return Response.json(listing, {
    headers: {
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=86400',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
