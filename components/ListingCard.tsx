import Link from 'next/link'
import { ArrowDownToLine, Star } from 'lucide-react'

import { formatCount } from '@/lib/format'
import { mediaUrl } from '@/lib/media'
import { CATEGORY_LABELS, type ResolvedListing } from '@/lib/schema'

type CatalogCardEntry = Omit<ResolvedListing, 'readme'>

/**
 * The browse-grid card, per the handoff's "script card anatomy":
 *
 *   1. icon square · name over author+company · price badge, right aligned
 *   2. short description, 2–3 lines
 *   3. pinned to the bottom behind a 1px rule: category left / version right,
 *      then a metrics row — rating, downloads, Archicad range
 *
 * The whole card is the link target; hover raises the border to full strength.
 */
export function ListingCard({ listing }: { listing: CatalogCardEntry }) {
  const cover = listing.media[0]

  return (
    <article className="card card-interactive relative flex min-h-[180px] flex-col gap-2.5 p-3.5 transition-colors">
      <div className="flex items-start gap-2.5">
        <div className="h-[34px] w-[34px] shrink-0 overflow-hidden border border-border bg-surface-2">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mediaUrl(listing.slug, cover)}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <IconFallback seed={listing.slug} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="font-heading text-[13px] leading-tight">
            {/* One focusable target for the whole card. */}
            <Link href={`/scripts/${listing.slug}`} className="before:absolute before:inset-0">
              {listing.name}
            </Link>
          </h3>
          <p className="mt-0.5 truncate text-[10.5px] text-text-muted">
            {listing.author.name}
            {listing.author.company ? `, ${listing.author.company}` : ''}
          </p>
        </div>

        <span className="tag tag-outline shrink-0">{priceLabel(listing)}</span>
      </div>

      <p
        className="text-[11px] leading-[1.55] text-text-muted"
        style={{ textWrap: 'pretty' }}
      >
        {listing.summary}
      </p>

      <div className="mt-auto border-t border-border pt-2.5">
        <div className="flex items-center justify-between gap-2 text-[10.5px]">
          <span className="truncate text-text-muted">{CATEGORY_LABELS[listing.category]}</span>
          <span className="shrink-0 font-heading">v{listing.latestVersion.version}</span>
        </div>

        <div className="mt-1.5 flex items-center gap-3 text-[10.5px] text-text-muted">
          <span className="flex items-center gap-1" title="Reactions on the discussion thread">
            <Star size={11} aria-hidden />
            {formatCount(listing.stats.reactions)}
          </span>
          <span className="flex items-center gap-1" title="Downloads">
            <ArrowDownToLine size={11} aria-hidden />
            {formatCount(listing.stats.downloads)}
          </span>
          <span className="ml-auto shrink-0">{archicadRange(listing.supportedArchicadVersions)}</span>
        </div>
      </div>
    </article>
  )
}

export function priceLabel(listing: Pick<CatalogCardEntry, 'pricing'>): string {
  if (listing.pricing.model === 'paid') return 'Paid'
  if (listing.pricing.model === 'donation') return 'Free +'
  return 'Free'
}

/** "AC 26-28" from a version list, collapsing a contiguous run into a range. */
export function archicadRange(versions: string[]): string {
  if (versions.length === 0) return ''
  const numbers = [...versions].map(Number).sort((a, b) => a - b)
  const lowest = numbers[0]
  const highest = numbers[numbers.length - 1]
  const contiguous = numbers.length === highest - lowest + 1
  if (numbers.length === 1) return `AC ${lowest}`
  return contiguous ? `AC ${lowest}-${highest}` : `AC ${numbers.join(', ')}`
}

/**
 * Most listings have no screenshot, especially early on. A flat mark derived
 * from the slug keeps the grid reading as a set of distinct things without
 * inventing decoration the system does not have.
 */
function IconFallback({ seed }: { seed: string }) {
  const step = [...seed].reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) % 9, 3)
  const shades = [
    'var(--color-neutral-200)',
    'var(--color-neutral-300)',
    'var(--color-neutral-400)',
    'var(--color-neutral-500)',
  ]
  return (
    <div
      aria-hidden
      className="flex h-full w-full items-center justify-center"
      style={{ background: shades[step % shades.length] }}
    >
      <span className="font-heading text-[13px] text-bg">{seed.charAt(0).toUpperCase()}</span>
    </div>
  )
}
