import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowDownToLine,
  ArrowUpRight,
  Blocks,
  Globe,
  Heart,
  Mail,
  Scale,
  Video,
} from 'lucide-react'

import { ArchicadBadge, Badge } from '@/components/Badge'
import { Comments } from '@/components/Comments'
import { Markdown } from '@/components/Markdown'
import { ScreenshotGallery } from '@/components/ScreenshotGallery'
import { formatCount, formatDate, prettyUrl } from '@/lib/format'
import { getAllListings, getListing } from '@/lib/listings'
import { CATEGORY_LABELS, LISTING_TYPE_LABELS, type ResolvedListing } from '@/lib/schema'
import { REPO_URL } from '@/lib/site'

type Props = { params: Promise<{ slug: string }> }

/** Prerenders every listing at build time; the detail pages are pure static HTML. */
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
    openGraph: {
      title: listing.name,
      description: listing.summary,
      type: 'article',
    },
  }
}

export default async function ListingPage({ params }: Props) {
  const { slug } = await params
  const listing = getListing(slug)
  if (!listing) notFound()

  return (
    <article className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <nav aria-label="Breadcrumb" className="text-sm text-text-subtle">
        <Link href="/" className="transition-colors hover:text-text">
          Browse
        </Link>
        <span className="mx-1.5" aria-hidden>
          /
        </span>
        <span className="text-text-muted">{CATEGORY_LABELS[listing.category]}</span>
      </nav>

      <header className="mt-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="accent">{CATEGORY_LABELS[listing.category]}</Badge>
          <Badge>{LISTING_TYPE_LABELS[listing.type]}</Badge>
          <ArchicadBadge versions={listing.supportedArchicadVersions} />
          {listing.pricing.model !== 'free' && (
            <Badge tone="highlight">
              {listing.pricing.model === 'paid' ? 'Paid' : 'Accepts contributions'}
            </Badge>
          )}
        </div>

        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{listing.name}</h1>
        <p className="mt-3 max-w-2xl text-lg leading-relaxed text-text-muted">{listing.summary}</p>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-text-subtle">
          <span className="flex items-center gap-1.5">
            <ArrowDownToLine size={14} aria-hidden />
            {formatCount(listing.stats.downloads)} downloads
          </span>
          <span className="flex items-center gap-1.5">
            <Heart size={14} aria-hidden />
            {formatCount(listing.stats.reactions)} reactions
          </span>
          <span>Updated {formatDate(listing.updatedAt)}</span>
        </div>
      </header>

      <div className="mt-9 grid gap-9 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0">
          {listing.media.length > 0 && (
            <section className="mb-9">
              <h2 className="sr-only">Screenshots</h2>
              <ScreenshotGallery slug={listing.slug} media={listing.media} />
            </section>
          )}

          {listing.videoUrl && (
            <section className="mb-9">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-text-subtle">
                Video
              </h2>
              <a
                href={listing.videoUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-3 text-sm transition-colors hover:border-border-strong"
              >
                <Video size={16} aria-hidden className="text-text-subtle" />
                Watch on {prettyUrl(listing.videoUrl).split('/')[0]}
                <ArrowUpRight size={14} aria-hidden className="ml-auto text-text-subtle" />
              </a>
            </section>
          )}

          {listing.readme && (
            <section>
              <h2 className="sr-only">Description</h2>
              <Markdown>{listing.readme}</Markdown>
            </section>
          )}

          <VersionHistory listing={listing} />

          <section className="mt-12">
            <h2 className="text-lg font-semibold tracking-tight">Discussion</h2>
            <p className="mt-1 mb-5 text-sm text-text-muted">
              Questions and comments here are GitHub Discussions, so they also appear in the{' '}
              <Link href="/forum" className="text-accent underline underline-offset-2">
                community forum
              </Link>
              .
            </p>
            <Comments term={`listing:${listing.slug}`} />
          </section>
        </div>

        <Sidebar listing={listing} />
      </div>
    </article>
  )
}

function Sidebar({ listing }: { listing: ResolvedListing }) {
  const latest = listing.latestVersion

  return (
    <aside className="lg:sticky lg:top-24 lg:self-start">
      <div className="rounded-card border border-border bg-surface p-5">
        <a
          href={latest.downloadUrl}
          target="_blank"
          rel="noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover"
        >
          <ArrowDownToLine size={15} aria-hidden />
          Download v{latest.version}
        </a>

        {listing.pricing.model !== 'free' && listing.pricing.url && (
          <a
            href={listing.pricing.url}
            target="_blank"
            rel="noreferrer"
            className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-lg border border-highlight-border bg-highlight-subtle px-4 py-2.5 text-sm font-medium text-highlight transition-opacity hover:opacity-85"
          >
            <Heart size={15} aria-hidden />
            {listing.pricing.model === 'paid' ? 'Buy from the author' : 'Support the author'}
          </a>
        )}

        {listing.pricing.note && (
          <p className="mt-2.5 text-xs leading-relaxed text-text-subtle">{listing.pricing.note}</p>
        )}

        <p className="mt-3 text-xs leading-relaxed text-text-subtle">
          Downloads and payments go directly to the author. This site hosts the listing, not the
          transaction.
        </p>

        <dl className="mt-5 space-y-3 border-t border-border pt-5 text-sm">
          <Row label="Version">
            v{latest.version} · {formatDate(latest.releasedAt)}
          </Row>
          <Row label="Archicad">
            {latest.archicadVersions.map((v) => `AC ${v}`).join(', ')}
          </Row>
          {latest.minTapirVersion && (
            <Row label="Tapir Add-On">{latest.minTapirVersion} or newer</Row>
          )}
          <Row label="Licence">
            <span className="flex items-center gap-1.5">
              <Scale size={13} aria-hidden className="text-text-subtle" />
              {listing.license}
            </span>
          </Row>
        </dl>
      </div>

      <div className="mt-5 rounded-card border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold">Author</h2>
        <p className="mt-2 font-medium">{listing.author.name}</p>
        {listing.author.company && (
          <p className="text-sm text-text-muted">{listing.author.company}</p>
        )}

        <ul className="mt-3 space-y-2 text-sm">
          <li>
            <ExternalLink
              href={`https://github.com/${listing.authorGithub}`}
              icon={<Blocks size={13} aria-hidden />}
            >
              @{listing.authorGithub}
            </ExternalLink>
          </li>
          {listing.author.website && (
            <li>
              <ExternalLink href={listing.author.website} icon={<Globe size={13} aria-hidden />}>
                {prettyUrl(listing.author.website)}
              </ExternalLink>
            </li>
          )}
          {listing.author.email && (
            <li>
              <ExternalLink
                href={`mailto:${listing.author.email}`}
                icon={<Mail size={13} aria-hidden />}
              >
                {listing.author.email}
              </ExternalLink>
            </li>
          )}
          {listing.repositoryUrl && (
            <li>
              <ExternalLink
                href={listing.repositoryUrl}
                icon={<ArrowUpRight size={13} aria-hidden />}
              >
                Source repository
              </ExternalLink>
            </li>
          )}
        </ul>
      </div>

      {listing.tags.length > 0 && (
        <div className="mt-5">
          <h2 className="sr-only">Tags</h2>
          <div className="flex flex-wrap gap-1.5">
            {listing.tags.map((tag) => (
              <Badge key={tag} tone="outline">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <p className="mt-5 text-xs leading-relaxed text-text-subtle">
        Something wrong with this listing?{' '}
        <a
          href={`${REPO_URL}/issues/new?title=${encodeURIComponent(`Report: ${listing.name}`)}`}
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2"
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
    <section className="mt-12">
      <h2 className="text-lg font-semibold tracking-tight">Versions</h2>
      <ul className="mt-4 space-y-3">
        {listing.versions.map((version, index) => (
          <li
            key={version.version}
            className="rounded-card border border-border bg-surface p-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-medium">v{version.version}</span>
              {index === 0 && <Badge tone="accent">Latest</Badge>}
              <span className="text-xs text-text-subtle">{formatDate(version.releasedAt)}</span>
              <ArchicadBadge versions={version.archicadVersions} />
              <a
                href={version.downloadUrl}
                target="_blank"
                rel="noreferrer"
                className="ml-auto flex items-center gap-1 text-sm text-accent transition-opacity hover:opacity-80"
              >
                Download
                <ArrowDownToLine size={13} aria-hidden />
              </a>
            </div>
            {version.changelog && (
              <p className="mt-2 text-sm leading-relaxed text-text-muted">{version.changelog}</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-text-subtle">{label}</dt>
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
  icon: React.ReactNode
  children: React.ReactNode
}) {
  const isMailto = href.startsWith('mailto:')
  return (
    <a
      href={href}
      {...(isMailto ? {} : { target: '_blank', rel: 'noreferrer' })}
      className="flex items-center gap-2 text-text-muted transition-colors hover:text-accent"
    >
      <span className="text-text-subtle">{icon}</span>
      <span className="truncate">{children}</span>
    </a>
  )
}
