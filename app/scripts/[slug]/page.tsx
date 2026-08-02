import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowDownToLine, ArrowUpRight, Globe, Mail, ShieldAlert } from 'lucide-react'

import { Badge } from '@/components/Badge'
import { Comments } from '@/components/Comments'
import { archicadRange, priceLabel } from '@/components/ListingCard'
import { Markdown } from '@/components/Markdown'
import { ScreenshotGallery } from '@/components/ScreenshotGallery'
import { VideoEmbed } from '@/components/VideoEmbed'
import { formatCount, formatDate, formatRelative, prettyUrl } from '@/lib/format'
import { integrityNotice, isDownloadable } from '@/lib/integrity'
import { getAllListings, getListing } from '@/lib/listings'
import { CATEGORY_LABELS, type ResolvedListing } from '@/lib/schema'
import { REPO_URL } from '@/lib/site'
import { parseVideo } from '@/lib/video'

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
  const video = parseVideo(listing.videoUrl)
  const related = getAllListings()
    .filter((other) => other.category === listing.category && other.slug !== listing.slug)
    .slice(0, 4)

  return (
    <article className="mx-auto max-w-[1180px]">
      <nav
        aria-label="Breadcrumb"
        className="border-b border-border px-6 py-2.5 text-[11px] text-text-muted"
      >
        <Link href="/" className="hover:text-accent">
          Scripts
        </Link>
        <span className="mx-1.5" aria-hidden>
          /
        </span>
        <Link href={`/?category=${listing.category}`} className="hover:text-accent">
          {CATEGORY_LABELS[listing.category]}
        </Link>
        <span className="mx-1.5" aria-hidden>
          /
        </span>
        <span className="text-text">{listing.name}</span>
      </nav>

      {/* Header block: title and metadata left, the download stack top right. */}
      <div className="grid gap-8 border-b-2 border-border-strong px-6 py-8 lg:grid-cols-[1fr_280px]">
        <div className="min-w-0">
          <h1 className="text-[30px] leading-[1.05] tracking-[-0.02em] sm:text-[38px]">
            {listing.name}
          </h1>

          <p className="mt-3 text-[12px] text-text-muted">
            <Link
              href={`/authors/${listing.authorGithub.toLowerCase()}`}
              className="hover:text-accent"
            >
              {listing.author.name}
              {listing.author.company ? `, ${listing.author.company}` : ''}
            </Link>{' '}
            · updated {formatRelative(listing.updatedAt)} · v{latest.version}
          </p>

          <div className="mt-4 flex flex-wrap gap-1.5">
            <Badge tone="accent">{CATEGORY_LABELS[listing.category]}</Badge>
            <Badge tone="neutral">{archicadRange(listing.supportedArchicadVersions)}</Badge>
            <Badge tone="neutral">{listing.license}</Badge>
            <Badge tone="outline">{priceLabel(listing)}</Badge>
          </div>

          <p className="mt-4 max-w-[60ch] text-[13.5px] leading-relaxed text-text-muted">
            {listing.summary}
          </p>
        </div>

        <DownloadStack listing={listing} />
      </div>

      <StatStrip listing={listing} />

      <div className="flex flex-col lg:flex-row">
        <div className="min-w-0 flex-1 border-border-strong px-6 py-8 lg:border-r-2">
          {listing.media.length > 0 && (
            <section className="mb-8">
              <h2 className="label-kicker mb-2.5">Screenshots</h2>
              <ScreenshotGallery slug={listing.slug} media={listing.media} />
            </section>
          )}

          {video && (
            <section className="mb-8">
              <h2 className="label-kicker mb-2.5">Video</h2>
              <VideoEmbed video={video} title={listing.name} />
            </section>
          )}

          <section>
            <h2 className="label-kicker">What it does</h2>
            <div className="mt-3">
              {listing.readme ? (
                <Markdown>{listing.readme}</Markdown>
              ) : (
                <p className="text-[13px] text-text-muted">{listing.summary}</p>
              )}
            </div>
            <p className="mt-4 max-w-[66ch] text-[11.5px] leading-relaxed text-text-muted">
              Requires the Tapir add-on
              {latest.minTapirVersion ? ` ${latest.minTapirVersion} or newer` : ''}. Tested on
              Archicad {listing.supportedArchicadVersions.join(', ')}.
            </p>
          </section>

          <section className="mt-10 border-t-2 border-border-strong pt-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="label-kicker">Discussion</h2>
              <Link
                href="/forum"
                className="text-[11px] text-accent-700 underline underline-offset-2"
              >
                Open in Forum
              </Link>
            </div>
            <div className="mt-4">
              <Comments term={`listing:${listing.slug}`} />
            </div>
          </section>
        </div>

        <Sidebar listing={listing} related={related} />
      </div>
    </article>
  )
}

/** Four cells under the header, divided by 1px rules. Only rating is accent. */
function StatStrip({ listing }: { listing: ResolvedListing }) {
  return (
    <dl className="grid grid-cols-2 border-b-2 border-border-strong sm:grid-cols-4">
      <StatCell label="Reactions" value={formatCount(listing.stats.reactions)} accent />
      <StatCell label="Downloads" value={formatCount(listing.stats.downloads)} />
      <StatCell label="Discussion posts" value={formatCount(listing.stats.commentCount)} />
      <StatCell label="Versions" value={String(listing.versions.length)} />
    </dl>
  )
}

function StatCell({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div className="border-border px-6 py-4 not-last:border-r">
      <dd className={`font-heading text-[24px] leading-none ${accent ? 'text-accent' : ''}`}>
        {value}
      </dd>
      <dt className="mt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">
        {label}
      </dt>
    </div>
  )
}

function DownloadStack({ listing }: { listing: ResolvedListing }) {
  const latest = listing.latestVersion
  const paid = listing.pricing.model === 'paid'
  const record = listing.integrity[latest.version]
  const blocked = !isDownloadable(record)

  if (blocked) {
    return (
      <div className="border-2 border-accent bg-accent-subtle p-4 lg:self-start">
        <p className="flex items-center gap-2 font-heading text-[13px] text-accent-800">
          <ShieldAlert size={15} aria-hidden />
          Download unavailable
        </p>
        <p className="mt-2 text-[11px] leading-relaxed text-accent-900">
          {integrityNotice(record)}
        </p>
      </div>
    )
  }

  return (
    <div className="lg:self-start">
      <a
        href={latest.downloadUrl}
        target="_blank"
        rel="noreferrer"
        className="btn btn-primary btn-block"
      >
        <ArrowDownToLine size={14} aria-hidden />
        {paid ? `Buy · v${latest.version}` : `Download v${latest.version}`}
      </a>

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
    </div>
  )
}

function Sidebar({
  listing,
  related,
}: {
  listing: ResolvedListing
  related: ResolvedListing[]
}) {
  return (
    <aside className="w-full shrink-0 px-6 py-8 lg:w-[300px]">
      <SidebarSection title="Author" first>
        <Link
          href={`/authors/${listing.authorGithub.toLowerCase()}`}
          className="block font-heading text-[14px] hover:text-accent"
        >
          {listing.author.name}
        </Link>
        {(listing.author.company || listing.author.city) && (
          <p className="mt-0.5 text-[11px] text-text-muted">
            {[listing.author.company, listing.author.city].filter(Boolean).join(', ')}
          </p>
        )}
        <ul className="mt-2.5 space-y-1.5 text-[11px]">
          <li>
            <Link
              href={`/authors/${listing.authorGithub.toLowerCase()}`}
              className="flex items-center gap-1.5 text-text-muted hover:text-accent"
            >
              <ArrowUpRight size={11} aria-hidden />
              All scripts by @{listing.authorGithub}
            </Link>
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
      </SidebarSection>

      <SidebarSection title="Version history">
        <ul>
          {listing.versions.map((version, index) => {
            const blocked = !isDownloadable(listing.integrity[version.version])
            return (
              <li
                key={version.version}
                className="flex items-baseline justify-between gap-2 border-b border-border py-2 text-[11.5px] last:border-0"
              >
                <span className="font-heading">v{version.version}</span>
                <span className="text-text-muted">{formatDate(version.releasedAt)}</span>
                {blocked ? (
                  <span className="text-text-subtle">Unavailable</span>
                ) : (
                  <a
                    href={version.downloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-accent-700 underline underline-offset-2"
                  >
                    {index === 0 ? 'Latest' : 'Get'}
                  </a>
                )}
              </li>
            )
          })}
        </ul>
      </SidebarSection>

      {listing.tags.length > 0 && (
        <SidebarSection title="Tags">
          <div className="flex flex-wrap gap-1.5">
            {listing.tags.map((tag) => (
              <Badge key={tag} tone="neutral">
                {tag}
              </Badge>
            ))}
          </div>
        </SidebarSection>
      )}

      {related.length > 0 && (
        <SidebarSection title="Related">
          <ul>
            {related.map((other) => (
              <li key={other.slug} className="border-b border-border py-2 last:border-0">
                <Link
                  href={`/scripts/${other.slug}`}
                  className="block text-[12px] hover:text-accent"
                >
                  {other.name}
                </Link>
              </li>
            ))}
          </ul>
        </SidebarSection>
      )}

      <p className="mt-6 text-[10.5px] leading-relaxed text-text-muted">
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

/** Each sidebar section sits under its own 2px rule with a tracked label. */
function SidebarSection({
  title,
  first,
  children,
}: {
  title: string
  first?: boolean
  children: React.ReactNode
}) {
  return (
    <section className={first ? '' : 'mt-7'}>
      <h2 className="label-kicker border-t-2 border-border-strong pt-2.5">{title}</h2>
      <div className="mt-2.5">{children}</div>
    </section>
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
