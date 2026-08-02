import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowDownToLine, ArrowUpRight, Globe, Mail, ShieldAlert, Video } from 'lucide-react'

import { Badge } from '@/components/Badge'
import { Comments } from '@/components/Comments'
import { archicadRange, priceLabel } from '@/components/ListingCard'
import { Markdown } from '@/components/Markdown'
import { ScreenshotGallery } from '@/components/ScreenshotGallery'
import { formatCount, formatDate, formatRelative, prettyUrl } from '@/lib/format'
import { integrityNotice, isDownloadable } from '@/lib/integrity'
import { getAllListings, getListing } from '@/lib/listings'
import { CATEGORY_LABELS, LISTING_TYPE_LABELS, type ResolvedListing } from '@/lib/schema'
import { REPO_URL } from '@/lib/site'

type Props = { params: Promise<{ slug: string }> }

/** Prerenders every listing at build time; the detail pages are static HTML. */
export function generateStaticParams() {
  return getAllListings().map((listing) => ({ slug: listing.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const listing = getListing(slug)
  if (!listing) return { title: 'Not found' }

  return {
    title: listing.name,
    description: listing.summary,
    openGraph: { title: listing.name, description: listing.summary, type: 'article' },
  }
}

export default async function ListingPage({ params }: Props) {
  const { slug } = await params
  const listing = getListing(slug)
  if (!listing) notFound()

  const latest = listing.latestVersion

  return (
    <article className="mx-auto max-w-[1180px]">
      <nav
        aria-label="Breadcrumb"
        className="border-b border-border px-6 py-2.5 text-[11px] text-text-muted"
      >
        <Link href="/" className="hover:text-accent">
          Home
        </Link>
        <span className="mx-1.5" aria-hidden>
          /
        </span>
        <Link
          href={`/?category=${listing.category}`}
          className="hover:text-accent"
        >
          {CATEGORY_LABELS[listing.category]}
        </Link>
        <span className="mx-1.5" aria-hidden>
          /
        </span>
        <span className="text-text">{listing.name}</span>
      </nav>

      <div className="flex flex-col lg:flex-row">
        <div className="min-w-0 flex-1 border-border px-6 py-6 lg:border-r">
          <header className="flex items-start gap-4">
            <div className="h-16 w-16 shrink-0 border border-border bg-surface-2" aria-hidden />
            <div className="min-w-0">
              <h1 className="text-[22px] leading-tight">{listing.name}</h1>
              <p className="mt-1 text-[11px] text-text-muted">
                {listing.author.name}
                {listing.author.company ? `, ${listing.author.company}` : ''} · updated{' '}
                {formatRelative(listing.updatedAt)} · v{latest.version} ·{' '}
                {archicadRange(listing.supportedArchicadVersions)}
              </p>
            </div>
          </header>

          {listing.media.length > 0 && (
            <section className="mt-6">
              <h2 className="sr-only">Screenshots</h2>
              <ScreenshotGallery slug={listing.slug} media={listing.media} />
            </section>
          )}

          {listing.videoUrl && (
            <a
              href={listing.videoUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary mt-4"
            >
              <Video size={14} aria-hidden />
              Watch on {prettyUrl(listing.videoUrl).split('/')[0]}
            </a>
          )}

          <section className="mt-8">
            <h2 className="label-kicker">What it does</h2>
            <div className="mt-3">
              {listing.readme ? (
                <Markdown>{listing.readme}</Markdown>
              ) : (
                <p className="text-[13px] text-text-muted">{listing.summary}</p>
              )}
            </div>
          </section>

          <section className="mt-8">
            <h2 className="label-kicker">Requirements</h2>
            <ul className="mt-2.5 space-y-1 text-[11px] text-text-muted">
              <li>Archicad {listing.supportedArchicadVersions.join(', ')}</li>
              {latest.minTapirVersion && (
                <li>Tapir Add-On {latest.minTapirVersion} or newer</li>
              )}
              <li>{LISTING_TYPE_LABELS[listing.type]}</li>
              <li>Licensed {listing.license}</li>
            </ul>
          </section>

          <VersionHistory listing={listing} />

          <section className="mt-10 border-t-2 border-border-strong pt-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="label-kicker">Discussion</h2>
              <p className="text-[11px] text-text-muted">
                also listed in{' '}
                <Link href="/forum" className="text-accent-700 underline underline-offset-2">
                  Forum / {CATEGORY_LABELS[listing.category]}
                </Link>
              </p>
            </div>
            <div className="mt-4">
              <Comments term={`listing:${listing.slug}`} />
            </div>
          </section>
        </div>

        <Sidebar listing={listing} />
      </div>
    </article>
  )
}

function Sidebar({ listing }: { listing: ResolvedListing }) {
  const latest = listing.latestVersion
  const paid = listing.pricing.model === 'paid'
  const record = listing.integrity[latest.version]
  const blocked = !isDownloadable(record)
  const notice = integrityNotice(record)

  return (
    <aside className="w-full shrink-0 px-6 py-6 lg:w-[300px]">
      {blocked ? (
        <div className="border-2 border-accent bg-accent-subtle p-4">
          <p className="flex items-center gap-2 font-heading text-[13px] text-accent-800">
            <ShieldAlert size={15} aria-hidden />
            Download unavailable
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-accent-900">{notice}</p>
        </div>
      ) : (
        <a
          href={latest.downloadUrl}
          target="_blank"
          rel="noreferrer"
          className="btn btn-primary btn-block"
        >
          <ArrowDownToLine size={14} aria-hidden />
          {paid ? `Buy · v${latest.version}` : `Download v${latest.version}`}
        </a>
      )}

      {listing.pricing.model === 'donation' && listing.pricing.url && (
        <a
          href={listing.pricing.url}
          target="_blank"
          rel="noreferrer"
          className="btn btn-secondary btn-block mt-2"
        >
          Contribute, pay what you like
        </a>
      )}

      <p className="mt-2.5 text-[10.5px] leading-relaxed text-text-muted">
        {listing.pricing.note ??
          (paid
            ? 'Paid. Payment is handled by the author, not by this site.'
            : listing.pricing.model === 'donation'
              ? 'Free. The author accepts optional contributions.'
              : 'Free. Downloads go directly to the author’s release page.')}
      </p>

      <dl className="mt-5 border-t border-border pt-4 text-[11px]">
        <Row label="Rating">{formatCount(listing.stats.reactions)} reactions</Row>
        <Row label="Downloads">{formatCount(listing.stats.downloads)}</Row>
        <Row label="Category">{CATEGORY_LABELS[listing.category]}</Row>
        <Row label="Version">
          v{latest.version} · {formatDate(latest.releasedAt)}
        </Row>
        <Row label="Archicad">{archicadRange(listing.supportedArchicadVersions)}</Row>
        <Row label="Licence">{listing.license}</Row>
        <Row label="Price">{priceLabel(listing)}</Row>
      </dl>

      <div className="mt-5 border-t border-border pt-4">
        <h2 className="label-kicker">Author</h2>
        <p className="mt-2 font-heading text-[13px]">{listing.author.name}</p>
        {listing.author.company && (
          <p className="text-[11px] text-text-muted">{listing.author.company}</p>
        )}

        <ul className="mt-2.5 space-y-1.5 text-[11px]">
          <li>
            <ExternalLink href={`https://github.com/${listing.authorGithub}`}>
              @{listing.authorGithub}
            </ExternalLink>
          </li>
          {listing.author.website && (
            <li>
              <ExternalLink href={listing.author.website} icon={<Globe size={11} aria-hidden />}>
                {prettyUrl(listing.author.website)}
              </ExternalLink>
            </li>
          )}
          {listing.author.email && (
            <li>
              <ExternalLink
                href={`mailto:${listing.author.email}`}
                icon={<Mail size={11} aria-hidden />}
              >
                {listing.author.email}
              </ExternalLink>
            </li>
          )}
          {listing.repositoryUrl && (
            <li>
              <ExternalLink href={listing.repositoryUrl}>Source repository</ExternalLink>
            </li>
          )}
        </ul>
      </div>

      {listing.tags.length > 0 && (
        <div className="mt-5 border-t border-border pt-4">
          <h2 className="label-kicker">Tags</h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {listing.tags.map((tag) => (
              <Badge key={tag} tone="neutral">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <p className="mt-5 text-[10.5px] leading-relaxed text-text-muted">
        Something wrong with this listing?{' '}
        <a
          href={`${REPO_URL}/issues/new?title=${encodeURIComponent(`Report: ${listing.name}`)}`}
          target="_blank"
          rel="noreferrer"
          className="text-accent-700 underline underline-offset-2"
        >
          Report it
        </a>
        .
      </p>
    </aside>
  )
}

function VersionHistory({ listing }: { listing: ResolvedListing }) {
  return (
    <section className="mt-8">
      <h2 className="label-kicker">Versions</h2>
      <table className="table mt-2.5">
        <thead>
          <tr>
            <th>Version</th>
            <th>Released</th>
            <th>Archicad</th>
            <th className="text-right">File</th>
          </tr>
        </thead>
        <tbody>
          {listing.versions.map((version, index) => {
            const record = listing.integrity[version.version]
            const blocked = !isDownloadable(record)
            return (
            <tr key={version.version}>
              <td className="align-top">
                <span className="font-heading text-[13px]">v{version.version}</span>
                {index === 0 && (
                  <Badge tone="accent" className="ml-2">
                    Latest
                  </Badge>
                )}
                {blocked && (
                  <Badge tone="highlight" className="ml-2">
                    Flagged
                  </Badge>
                )}
                {version.changelog && (
                  <p className="mt-1 text-[11px] leading-relaxed text-text-muted">
                    {version.changelog}
                  </p>
                )}
                {blocked && (
                  <p className="mt-1 text-[11px] leading-relaxed text-accent-800">
                    {integrityNotice(record)}
                  </p>
                )}
              </td>
              <td className="align-top whitespace-nowrap text-[12px]">
                {formatDate(version.releasedAt)}
              </td>
              <td className="align-top whitespace-nowrap text-[12px]">
                {archicadRange(version.archicadVersions)}
              </td>
              <td className="align-top text-right">
                {blocked ? (
                  <span className="text-[12px] text-text-subtle">Unavailable</span>
                ) : (
                  <a
                    href={version.downloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[12px] text-accent-700 underline underline-offset-2"
                  >
                    Download
                  </a>
                )}
              </td>
            </tr>
            )
          })}
        </tbody>
      </table>
    </section>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border py-1.5 last:border-0">
      <dt className="shrink-0 text-text-muted">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  )
}

function ExternalLink({
  href,
  icon,
  children,
}: {
  href: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  const isMailto = href.startsWith('mailto:')
  return (
    <a
      href={href}
      {...(isMailto ? {} : { target: '_blank', rel: 'noreferrer' })}
      className="flex items-center gap-1.5 text-text-muted hover:text-accent"
    >
      {icon ?? <ArrowUpRight size={11} aria-hidden />}
      <span className="truncate">{children}</span>
    </a>
  )
}
