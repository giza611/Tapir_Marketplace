import Link from 'next/link'
import { ArrowDownToLine, Star } from 'lucide-react'

import { Badge } from '@/components/Badge'
import { formatCount } from '@/lib/format'
import { mediaUrl } from '@/lib/media'
import { CATEGORY_LABELS, type ResolvedListing } from '@/lib/schema'

type CatalogCardEntry = Omit<ResolvedListing, 'readme'>

/**
 * A cell in the card matrix.
 *
 * The visual pass treats the grid as one continuous ruled surface rather than a
 * row of separated boxes: the container draws the left rule, each cell draws
 * its own right and bottom rule. So this component carries no box of its own
 * and no shadow — nothing floats in this system.
 */
export function ListingCard({ listing }: { listing: CatalogCardEntry }) {
  const cover = listing.media[0]

  return (
    <article className="group relative flex min-h-[206px] flex-col border-b border-r border-border p-5 transition-colors hover:bg-neutral-100">
      <div className="flex items-start justify-between gap-3">
        <div className="h-9 w-9 shrink-0 overflow-hidden border border-border bg-surface-2">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element -- local, size-capped by CI
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

        <span className="tag tag-outline shrink-0">{priceLabel(listing)}</span>
      </div>

      <h3 className="mt-4 text-[16px] leading-tight">
        {/* One focusable target for the whole cell. */}
        <Link href={`/scripts/${listing.slug}`} className="before:absolute before:inset-0">
          {listing.name}
        </Link>
      </h3>

      <p className="mt-1 truncate text-[12px] text-text-muted">
        {listing.author.name}
        {listing.author.company ? `, ${listing.author.company}` : ''}
      </p>

      <p
        className="mt-2.5 text-[12.5px] leading-[1.5] text-text-muted"
        style={{ textWrap: 'pretty' }}
      >
        {listing.summary}
      </p>

      <div className="mt-3">
        <Badge tone="neutral">{CATEGORY_LABELS[listing.category]}</Badge>
      </div>

      <div className="mt-auto flex items-center gap-3.5 border-t border-border pt-3 text-[11px] text-text-muted">
        <span className="flex items-center gap-1 text-accent" title="Reactions">
          <Star size={11} aria-hidden />
          {formatCount(listing.stats.reactions)}
        </span>
        <span className="flex items-center gap-1" title="Downloads">
          <ArrowDownToLine size={11} aria-hidden />
          {formatCount(listing.stats.downloads)}
        </span>
        <span>{archicadRange(listing.supportedArchicadVersions)}</span>
        <span className="ml-auto shrink-0">v{listing.latestVersion.version}</span>
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
    'var(--color-neutral-300)',
    'var(--color-neutral-400)',
    'var(--color-neutral-500)',
    'var(--color-neutral-600)',
  ]
  return (
    <div
      aria-hidden
      className="flex h-full w-full items-center justify-center"
      style={{ background: shades[step % shades.length] }}
    >
      <span className="font-heading text-[14px] text-bg">{seed.charAt(0).toUpperCase()}</span>
    </div>
  )
}
