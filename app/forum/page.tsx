import type { Metadata } from 'next'
import { MessageSquarePlus } from 'lucide-react'

import { ForumBrowser } from '@/components/ForumBrowser'
import { getDiscussions } from '@/lib/discussions'
import { REPO_URL, newDiscussionUrl } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Forum',
  description:
    'Ask questions, share techniques and discuss Archicad automation with the community. Every script comment appears here too.',
}

export default async function ForumPage() {
  const { available, discussions, categories } = await getDiscussions()

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Forum</h1>
          <p className="mt-2 max-w-xl text-text-muted">
            Questions, techniques and announcements — plus every comment left on every script,
            because they are all the same GitHub Discussions thread underneath.
          </p>
        </div>
        <a
          href={newDiscussionUrl()}
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover"
        >
          <MessageSquarePlus size={15} aria-hidden />
          Start a topic
        </a>
      </header>

      <div className="mt-8">
        {available ? (
          <ForumBrowser discussions={discussions} categories={categories} />
        ) : (
          <NotConfigured />
        )}
      </div>
    </div>
  )
}

/**
 * Reached when Discussions is off, or when the build had no GITHUB_TOKEN.
 * The forum still works on GitHub itself, so send people there rather than
 * showing a dead end.
 */
function NotConfigured() {
  return (
    <div className="rounded-card border border-dashed border-border bg-surface-2 px-6 py-14 text-center">
      <h2 className="font-medium">The forum index is not built yet</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-text-muted">
        This page mirrors GitHub Discussions at build time. It fills in once Discussions is enabled
        on the repository and the build has a <code className="text-xs">GITHUB_TOKEN</code> to read
        them with. In the meantime the conversation itself is live on GitHub.
      </p>
      <a
        href={`${REPO_URL}/discussions`}
        target="_blank"
        rel="noreferrer"
        className="mt-5 inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-medium transition-colors hover:border-border-strong"
      >
        Open Discussions on GitHub
      </a>
    </div>
  )
}
