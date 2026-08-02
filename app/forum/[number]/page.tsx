import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowUpRight, CheckCircle2 } from 'lucide-react'

import { Badge } from '@/components/Badge'
import { Comments } from '@/components/Comments'
import { getDiscussions } from '@/lib/discussions'
import { formatRelative } from '@/lib/format'

type Props = { params: Promise<{ number: string }> }

/**
 * A forum thread, read and replied to without leaving the site.
 *
 * giscus is mounted with `mapping="number"`, which attaches it to an existing
 * discussion rather than creating one. So the replies below are the real GitHub
 * Discussion, posting works in place, and nobody has to be sent to github.com
 * to take part.
 *
 * Starting a brand new topic still goes to GitHub: giscus can only create a
 * discussion implicitly, titled after its mapping key, so there is no way to
 * give a new topic a proper title from here.
 */
export async function generateStaticParams() {
  const { discussions } = await getDiscussions()
  return discussions
    .filter((discussion) => discussion.listingSlug === null)
    .map((discussion) => ({ number: String(discussion.number) }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { number } = await params
  const { discussions } = await getDiscussions()
  const thread = discussions.find((d) => String(d.number) === number)
  if (!thread) return { title: 'Thread not found' }
  return { title: thread.title, description: thread.excerpt.slice(0, 160) }
}

export default async function ThreadPage({ params }: Props) {
  const { number } = await params
  const { discussions } = await getDiscussions()
  const thread = discussions.find((d) => String(d.number) === number)
  if (!thread) notFound()

  return (
    <div className="mx-auto max-w-[900px] px-6 py-8">
      <nav aria-label="Breadcrumb" className="text-[11px] text-text-muted">
        <Link href="/forum" className="hover:text-accent">
          Forum
        </Link>
        <span className="mx-1.5" aria-hidden>
          /
        </span>
        <span className="text-text">{thread.category}</span>
      </nav>

      <header className="mt-4 border-b-2 border-border-strong pb-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="accent">
            {thread.categoryEmoji} {thread.category}
          </Badge>
          {thread.answered && (
            <span className="flex items-center gap-1 text-[11px] text-accent">
              <CheckCircle2 size={12} aria-hidden />
              Answered
            </span>
          )}
        </div>

        <h1 className="mt-3 text-[26px] leading-tight tracking-[-0.02em]">{thread.title}</h1>

        <p className="mt-2 flex flex-wrap items-center gap-x-3 text-[11px] text-text-muted">
          {thread.author && (
            <Link href={`/authors/${thread.author.toLowerCase()}`} className="hover:text-accent">
              @{thread.author}
            </Link>
          )}
          <span>started {formatRelative(thread.createdAt)}</span>
          <span>
            {thread.comments} {thread.comments === 1 ? 'reply' : 'replies'}
          </span>
          <a
            href={thread.url}
            target="_blank"
            rel="noreferrer"
            className="ml-auto flex items-center gap-1 hover:text-accent"
          >
            View on GitHub
            <ArrowUpRight size={11} aria-hidden />
          </a>
        </p>
      </header>

      <div className="mt-6">
        <Comments term={String(thread.number)} mapping="number" />
      </div>
    </div>
  )
}
