import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Globe, Mail } from 'lucide-react'

import { Badge } from '@/components/Badge'
import { archicadRange } from '@/components/ListingCard'
import { formatCount, formatRelative, prettyUrl } from '@/lib/format'
import { getAuthor, getAuthorLogins } from '@/lib/authors'
import { getDiscussions } from '@/lib/discussions'
import { CATEGORY_LABELS } from '@/lib/schema'

type Props = { params: Promise<{ login: string }> }

export function generateStaticParams() {
  return getAuthorLogins().map((login) => ({ login }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { login } = await params
  const author = getAuthor(login)
  if (!author) return { title: 'Contributor not found' }

  return {
    title: author.profile.name,
    description:
      author.profile.bio ??
      `${author.profile.name} has published ${author.listings.length} script${
        author.listings.length === 1 ? '' : 's'
      } to the marketplace.`,
  }
}

export default async function AuthorPage({ params }: Props) {
  const { login } = await params
  const author = getAuthor(login)
  if (!author) notFound()

  const { discussions } = await getDiscussions()
  const activity = discussions
    .filter((d) => d.author?.toLowerCase() === author.login.toLowerCase())
    .slice(0, 6)

  const social = author.profile.social ?? {}
  const socialLinks = Object.entries(social).filter(([, url]) => Boolean(url)) as [string, string][]

  return (
    <div className="mx-auto max-w-[820px] px-6 py-8">
      <header className="flex flex-wrap items-start gap-5">
        {/* eslint-disable-next-line @next/next/no-img-element -- GitHub avatar redirect, no API call */}
        <img
          src={author.avatarUrl}
          alt=""
          width={72}
          height={72}
          className="h-[72px] w-[72px] shrink-0 rounded-full border border-border"
        />

        <div className="min-w-0 flex-1">
          <h1 className="text-[19px] leading-tight">{author.profile.name}</h1>

          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-text-muted">
            {author.profile.company && <span>{author.profile.company}</span>}
            {author.profile.city && <span>· {author.profile.city}</span>}
            <a
              href={`https://github.com/${author.login}`}
              target="_blank"
              rel="noreferrer"
              className="hover:text-accent"
            >
              · @{author.login}
            </a>
            {author.profile.website && (
              <a
                href={author.profile.website}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 hover:text-accent"
              >
                <Globe size={11} aria-hidden />
                {prettyUrl(author.profile.website)}
              </a>
            )}
            {socialLinks.map(([name, url]) => (
              <a
                key={name}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="capitalize hover:text-accent"
              >
                {name}
              </a>
            ))}
          </p>

          {author.profile.bio && (
            <p className="mt-2.5 max-w-[56ch] text-[12.5px] leading-[1.65] text-text-muted">
              {author.profile.bio}
            </p>
          )}
        </div>

        {author.profile.email && (
          <a href={`mailto:${author.profile.email}`} className="btn btn-secondary btn-centered">
            <Mail size={13} aria-hidden />
            Contact
          </a>
        )}
      </header>

      <div className="mt-7 grid grid-cols-3 border border-border">
        <Stat label="Scripts" value={String(author.listings.length)} />
        <Stat label="Downloads" value={formatCount(author.totalDownloads)} />
        <Stat label="Reactions" value={formatCount(author.totalReactions)} />
      </div>

      <section className="mt-8">
        <h2 className="label-kicker">Scripts</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {author.listings.map((listing) => (
            <Link
              key={listing.slug}
              href={`/scripts/${listing.slug}`}
              className="card card-interactive flex items-start gap-2.5 p-3 transition-colors"
            >
              <span
                className="mt-0.5 h-7 w-7 shrink-0 border border-border bg-surface-2"
                aria-hidden
              />
              <span className="min-w-0">
                <span className="block text-[12.5px] font-heading leading-tight">
                  {listing.name}
                </span>
                <span className="mt-0.5 block text-[10.5px] text-text-muted">
                  {CATEGORY_LABELS[listing.category]} · v{listing.latestVersion.version} ·{' '}
                  {formatCount(listing.stats.downloads)} dl ·{' '}
                  {archicadRange(listing.supportedArchicadVersions)}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {activity.length > 0 && (
        <section className="mt-8 border-t-2 border-border-strong pt-5">
          <h2 className="label-kicker">Recent forum activity</h2>
          <ul className="mt-3">
            {activity.map((discussion) => (
              <li key={discussion.number} className="border-b border-border py-2.5">
                <a
                  href={discussion.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block hover:text-accent"
                >
                  <span className="block text-[12.5px] leading-snug">{discussion.title}</span>
                  <span className="mt-0.5 block text-[10.5px] text-text-muted">
                    {discussion.category} · {discussion.comments}{' '}
                    {discussion.comments === 1 ? 'reply' : 'replies'} ·{' '}
                    {formatRelative(discussion.updatedAt)}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-6 text-[10.5px] text-text-muted">
        This profile is assembled from {author.login}&rsquo;s published listings. There is no
        separate account to maintain — <Badge tone="neutral">publishing is membership</Badge>
      </p>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-border px-4 py-3 not-last:border-r">
      <p className="font-heading text-[18px] leading-none">{value}</p>
      <p className="label-kicker mt-1.5">{label}</p>
    </div>
  )
}
