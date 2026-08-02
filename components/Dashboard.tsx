'use client'

import { ArrowUpRight, Clock, ExternalLink, Pencil, Plus } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

import { Badge } from '@/components/Badge'
import { formatDate, formatRelative } from '@/lib/format'
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
    return (
      <div className="rounded-card border border-border bg-danger-subtle p-5 text-sm text-danger">
        {error}
      </div>
    )
  }

  if (!data) {
    return <div className="h-40 animate-pulse rounded-card bg-surface-2" aria-label="Loading" />
  }

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">My listings</h1>
          <p className="mt-2 text-text-muted">
            Signed in as @{data.login}. Changes are published as pull requests to the marketplace
            repository and merge automatically once they pass validation.
          </p>
        </div>
        <Link
          href="/dashboard/new"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover"
        >
          <Plus size={15} aria-hidden />
          New listing
        </Link>
      </header>

      {data.pending.length > 0 && (
        <section className="mt-9">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-text-subtle">
            Awaiting checks
          </h2>
          <ul className="mt-3 space-y-2.5">
            {data.pending.map((submission) => (
              <li
                key={submission.number}
                className="flex flex-wrap items-center gap-3 rounded-card border border-border bg-surface p-4"
              >
                <Clock size={15} aria-hidden className="text-text-subtle" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{submission.title}</p>
                  <p className="mt-0.5 text-xs text-text-subtle">
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
                  className="flex items-center gap-1 text-sm text-accent transition-opacity hover:opacity-80"
                >
                  View
                  <ExternalLink size={12} aria-hidden />
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-2.5 text-xs leading-relaxed text-text-subtle">
            A submission marked <strong>Needs a fix</strong> has a comment on it explaining what to
            change. Anything else merges on its own, usually within a couple of minutes.
          </p>
        </section>
      )}

      <section className="mt-9">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-text-subtle">
          Published
        </h2>

        {data.live.length === 0 ? (
          <div className="mt-3 rounded-card border border-dashed border-border bg-surface-2 px-6 py-14 text-center">
            <p className="font-medium">You have not published anything yet</p>
            <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-text-muted">
              If you have a script you rely on in practice, it is almost certainly useful to
              somebody else working in Archicad.
            </p>
            <Link
              href="/dashboard/new"
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover"
            >
              <Plus size={15} aria-hidden />
              Publish your first script
            </Link>
          </div>
        ) : (
          <ul className="mt-3 space-y-2.5">
            {data.live.map((listing) => (
              <li
                key={listing.slug}
                className="flex flex-wrap items-center gap-3 rounded-card border border-border bg-surface p-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{listing.name}</p>
                  <p className="mt-0.5 text-xs text-text-subtle">
                    {CATEGORY_LABELS[listing.category]} · v{listing.latestVersion.version} ·
                    updated {formatDate(listing.updatedAt)}
                  </p>
                </div>
                <Link
                  href={`/scripts/${listing.slug}`}
                  className="flex items-center gap-1 text-sm text-text-muted transition-colors hover:text-text"
                >
                  View
                  <ArrowUpRight size={13} aria-hidden />
                </Link>
                <Link
                  href={`/dashboard/edit/${listing.slug}`}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm transition-colors hover:border-border-strong"
                >
                  <Pencil size={13} aria-hidden />
                  Edit
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
