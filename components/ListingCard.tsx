import Link from 'next/link'
import { ArrowDownToLine, Heart, MessageSquare } from 'lucide-react'

import { ArchicadBadge, Badge } from '@/components/Badge'
import { formatCount } from '@/lib/format'
import { mediaUrl } from '@/lib/media'
import { CATEGORY_LABELS, LISTING_TYPE_LABELS, type ResolvedListing } from '@/lib/schema'

type CatalogCardEntry = Omit<ResolvedListing, 'readme'>

export function ListingCard({ listing }: { listing: CatalogCardEntry }) {
  const cover = listing.media[0]

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-card border border-border bg-surface transition-shadow hover:shadow">
      <div className="relative aspect-[16/9] overflow-hidden bg-surface-2">
        {cover ? (
          // Screenshots are local files, already sized by the contributor and
          // capped at 500 KB by CI, so next/image would add cost without benefit.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mediaUrl(listing.slug, cover)}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <CoverFallback seed={listing.slug} />
        )}

        {listing.pricing.model !== 'free' && (
          <span className="absolute right-2 top-2">
            <Badge tone="highlight">
              {listing.pricing.model === 'paid' ? 'Paid' : 'Donation'}
            </Badge>
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center gap-2">
          <Badge tone="accent">{CATEGORY_LABELS[listing.category]}</Badge>
          <span className="text-xs text-text-subtle">
            {LISTING_TYPE_LABELS[listing.type]}
          </span>
        </div>

        <h3 className="mt-2.5 text-base font-semibold leading-snug tracking-tight">
          {/* The whole card is clickable via this stretched link, which keeps a
              single focusable target for keyboard and screen reader users
              instead of wrapping the article in an anchor. */}
          <Link href={`/scripts/${listing.slug}`} className="before:absolute before:inset-0">
            {listing.name}
          </Link>
        </h3>

        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-text-muted">
          {listing.summary}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <ArchicadBadge versions={listing.supportedArchicadVersions} />
          <Badge tone="outline">v{listing.latestVersion.version}</Badge>
        </div>

        <div className="mt-auto flex items-center gap-3.5 pt-4 text-xs text-text-subtle">
          <span className="flex items-center gap-1" title="Downloads">
            <ArrowDownToLine size={13} aria-hidden />
            {formatCount(listing.stats.downloads)}
          </span>
          <span className="flex items-center gap-1" title="Reactions">
            <Heart size={13} aria-hidden />
            {formatCount(listing.stats.reactions)}
          </span>
          <span className="flex items-center gap-1" title="Comments">
            <MessageSquare size={13} aria-hidden />
            {formatCount(listing.stats.commentCount)}
          </span>
          <span className="ml-auto truncate">{listing.author.name}</span>
        </div>
      </div>
    </article>
  )
}

/**
 * Most listings will have no screenshot, especially early on. Rather than an
 * empty grey box, derive a stable geometric mark from the slug so the grid
 * still reads as a set of distinct things.
 */
function CoverFallback({ seed }: { seed: string }) {
  const hash = [...seed].reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) % 360, 7)
  return (
    <div
      aria-hidden
      className="flex h-full w-full items-center justify-center"
      style={{
        background: `linear-gradient(135deg, oklch(0.92 0.04 ${hash}) 0%, oklch(0.86 0.06 ${(hash + 40) % 360}) 100%)`,
      }}
    >
      <svg width="52" height="52" viewBox="0 0 24 24" fill="none" opacity="0.5">
        <path
          d="M3 15.5c0-4.7 3.4-8.5 8-8.5h4.2c.6 0 1.1-.3 1.4-.8l.7-1.1c.4-.7 1.4-.7 1.8 0l1.6 2.7c.2.4.2.9 0 1.3l-1.9 3.2c-.2.3-.5.5-.9.5H16"
          stroke="oklch(0.35 0.05 260)"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M3 15.5V19" stroke="oklch(0.35 0.05 260)" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </div>
  )
}
