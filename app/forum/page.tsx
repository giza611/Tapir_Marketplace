import type { Metadata } from 'next'

import { ForumBrowser } from '@/components/ForumBrowser'
import { getDiscussions } from '@/lib/discussions'
import { getAllListings } from '@/lib/listings'
import { CATEGORY_LABELS } from '@/lib/schema'
import { REPO_URL, newDiscussionUrl } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Forum',
  description:
    'Ask questions, share techniques and discuss Archicad automation with the community. Every script comment appears here too.',
}

export default async function ForumPage() {
  const { available, discussions } = await getDiscussions()

  // A script-bound thread should show the listing's own category, not the
  // GitHub Discussions category it technically lives in.
  const listings = getAllListings()
  const categoryBySlug = Object.fromEntries(
    listings.map((listing) => [listing.slug, CATEGORY_LABELS[listing.category]]),
  )
  const scriptNameBySlug = Object.fromEntries(
    listings.map((listing) => [listing.slug, listing.name]),
  )

  return (
    <div className="mx-auto max-w-[900px] px-6 py-6">
      <div className="mb-4 flex justify-end">
        <a
          href={newDiscussionUrl()}
          target="_blank"
          rel="noreferrer"
          className="btn btn-primary btn-centered"
        >
          New topic
        </a>
      </div>

      {available ? (
        <ForumBrowser
          discussions={discussions}
          categoryBySlug={categoryBySlug}
          scriptNameBySlug={scriptNameBySlug}
        />
      ) : (
        <NotConfigured />
      )}
    </div>
  )
}

/**
 * Reached before the daily job has produced a forum index. The conversation
 * itself is live on GitHub regardless, so send people there rather than showing
 * a dead end.
 */
function NotConfigured() {
  return (
    <div className="border border-border bg-surface px-6 py-14 text-center">
      <h1 className="text-[20px]">The forum index is not built yet</h1>
      <p className="mx-auto mt-2 max-w-md text-[12px] leading-relaxed text-text-muted">
        This page mirrors GitHub Discussions, refreshed daily by a scheduled job. It fills in once
        Discussions is enabled on the repository and that job has run once.
      </p>
      <a
        href={`${REPO_URL}/discussions`}
        target="_blank"
        rel="noreferrer"
        className="btn btn-secondary btn-centered mt-5"
      >
        Open Discussions on GitHub
      </a>
    </div>
  )
}
