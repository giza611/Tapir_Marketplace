'use client'

import { ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

import { Badge } from '@/components/Badge'
import { DeleteListingDialog } from '@/components/DeleteListingDialog'
import { formatCount, formatRelative } from '@/lib/format'
import type { PendingSubmission } from '@/lib/github'
import { CATEGORY_LABELS, type ResolvedListing } from '@/lib/schema'

type Payload = {
  login: string
  live: ResolvedListing[]
  pending: PendingSubmission[]
}

export function Dashboard() {
  const [data, setData] = useState<Payload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<ResolvedListing | null>(null)
  const [removed, setRemoved] = useState<{ name: string; url: string } | null>(null)

  useEffect(() => {
    fetch('/api/listings/mine')
      .then(async (response) => {
        if (!response.ok) throw new Error((await response.json()).error ?? 'Could not load')
        return response.json() as Promise<Payload>
      })
      .then(setData)
      .catch((cause: Error) => setError(cause.message))
  }, [])

  if (error) {
    return <div className="border border-accent bg-accent-subtle p-4 text-[13px]">{error}</div>
  }

  if (!data) {
    return <div className="h-40 border border-border bg-surface" aria-label="Loading" />
  }

  const downloads = data.live.reduce((total, listing) => total + listing.stats.downloads, 0)
  const comments = data.live.reduce((total, listing) => total + listing.stats.commentCount, 0)

  return (
    <div>
      {removed && (
        <div className="mb-5 border border-accent bg-accent-subtle p-4 text-[13px]">
          <p className="font-semibold text-accent-800">Removal submitted</p>
          <p className="mt-1 leading-relaxed text-accent-900">
            {removed.name} will disappear from the marketplace once the checks pass, usually within
            a couple of minutes.{' '}
            <a
              href={removed.url}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
            >
              Track the pull request
            </a>
            .
          </p>
        </div>
      )}

      {pendingDelete && (
        <DeleteListingDialog
          listing={pendingDelete}
          onCancel={() => setPendingDelete(null)}
          onDeleted={(url) => {
            setRemoved({ name: pendingDelete.name, url })
            // Drop it from the table straight away. The listing is still on the
            // site until the pull request merges, but leaving a row the author
            // has just deleted invites a confused second attempt.
            setData((current) =>
              current
                ? {
                    ...current,
                    live: current.live.filter((item) => item.slug !== pendingDelete.slug),
                  }
                : current,
            )
            setPendingDelete(null)
          }}
        />
      )}

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[15px]">My scripts</h1>
          <p className="mt-0.5 text-[10.5px] text-text-muted">@{data.login}</p>
        </div>
        <Link href="/dashboard/new" className="btn btn-primary btn-centered">
          Upload new script
        </Link>
      </header>

      {/* The design specifies Published / Draft / Downloads / Unread comments.
          There are no drafts in this architecture — a listing is either merged
          or an open pull request — so that cell reports pending submissions. */}
      <div className="mt-5 grid grid-cols-2 border border-border sm:grid-cols-4">
        <Stat label="Published" value={String(data.live.length)} />
        <Stat label="Pending" value={String(data.pending.length)} />
        <Stat label="Downloads" value={formatCount(downloads)} />
        <Stat label="Comments" value={formatCount(comments)} />
      </div>

      {data.pending.length > 0 && (
        <section className="mt-8">
          <h2 className="label-kicker">Awaiting checks</h2>
          <ul className="mt-2.5 border-t border-border">
            {data.pending.map((submission) => (
              <li
                key={submission.number}
                className="flex flex-wrap items-center gap-3 border-b border-border py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px]">{submission.title}</p>
                  <p className="mt-0.5 text-[10.5px] text-text-muted">
                    opened {formatRelative(submission.createdAt)}
                    {submission.slugs.length > 0 && ` · ${submission.slugs.join(', ')}`}
                  </p>
                </div>
                {submission.needsReview ? (
                  <Badge tone="highlight">Needs a fix</Badge>
                ) : (
                  <Badge tone="outline">Validating</Badge>
                )}
                <a
                  href={submission.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-[12px] text-accent-700 underline underline-offset-2"
                >
                  View
                  <ExternalLink size={11} aria-hidden />
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[10.5px] leading-relaxed text-text-muted">
            A submission marked <strong>Needs a fix</strong> has a comment on it explaining what to
            change. Anything else merges on its own, usually within a couple of minutes.
          </p>
        </section>
      )}

      <section className="mt-8">
        <h2 className="label-kicker">Published</h2>

        {data.live.length === 0 ? (
          <div className="mt-2.5 border border-border bg-surface px-6 py-12 text-center">
            <p className="font-heading text-[15px]">You have not published anything yet</p>
            <p className="mx-auto mt-1.5 max-w-sm text-[12px] leading-relaxed text-text-muted">
              If you have a script you rely on in practice, it is almost certainly useful to
              somebody else working in Archicad.
            </p>
            <Link href="/dashboard/new" className="btn btn-primary btn-centered mt-4">
              Publish your first script
            </Link>
          </div>
        ) : (
          <>
            <table className="table mt-2.5">
              <thead>
                <tr>
                  <th>Script</th>
                  <th>Category</th>
                  <th>Ver</th>
                  <th>DL</th>
                  <th>Rating</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.live.map((listing) => (
                  <tr key={listing.slug}>
                    <td>
                      <Link href={`/scripts/${listing.slug}`} className="hover:text-accent">
                        {listing.name}
                      </Link>
                    </td>
                    <td className="text-[12px] text-text-muted">
                      {CATEGORY_LABELS[listing.category]}
                    </td>
                    <td className="whitespace-nowrap text-[12px]">
                      v{listing.latestVersion.version}
                    </td>
                    <td className="text-[12px]">{formatCount(listing.stats.downloads)}</td>
                    <td className="text-[12px]">{formatCount(listing.stats.reactions)}</td>
                    <td className="text-right whitespace-nowrap">
                      <Badge tone="accent" className="mr-2">
                        Published
                      </Badge>
                      <Link
                        href={`/dashboard/edit/${listing.slug}`}
                        className="text-[12px] text-accent-700 underline underline-offset-2"
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => setPendingDelete(listing)}
                        className="ml-3 text-[12px] text-text-muted underline underline-offset-2 hover:text-accent-700"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-[10.5px] leading-relaxed text-text-muted">
              Editing a published script opens a pull request. Old versions stay downloadable
              because every version keeps its own link.
            </p>
          </>
        )}
      </section>
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
