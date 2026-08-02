'use client'

import MiniSearch from 'minisearch'
import { ArrowUpRight, CheckCircle2, MessageSquare, Search } from 'lucide-react'
import Link from 'next/link'
import { useDeferredValue, useMemo, useState } from 'react'

import { Badge } from '@/components/Badge'
import type { Discussion } from '@/lib/discussions'
import { formatRelative } from '@/lib/format'

type Filter = 'all' | 'topics' | 'listings'

/**
 * One search box over every thread in the repository — free-standing forum
 * topics and per-listing comment threads alike. They are the same GitHub
 * primitive, so unifying them costs nothing.
 */
export function ForumBrowser({
  discussions,
  categories,
}: {
  discussions: Discussion[]
  categories: string[]
}) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [kind, setKind] = useState<Filter>('all')

  const deferredQuery = useDeferredValue(query)

  const index = useMemo(() => {
    const search = new MiniSearch<{ id: number; title: string; excerpt: string; author: string }>({
      fields: ['title', 'excerpt', 'author'],
      storeFields: ['id'],
      searchOptions: { prefix: true, fuzzy: 0.2, boost: { title: 3 } },
    })
    search.addAll(
      discussions.map((discussion) => ({
        id: discussion.number,
        title: discussion.title,
        excerpt: discussion.excerpt,
        author: discussion.author ?? '',
      })),
    )
    return search
  }, [discussions])

  const visible = useMemo(() => {
    let result = discussions

    const trimmed = deferredQuery.trim()
    if (trimmed) {
      const ranked = index.search(trimmed)
      const order = new Map(ranked.map((hit, position) => [hit.id as number, position]))
      result = result
        .filter((discussion) => order.has(discussion.number))
        .sort((a, b) => order.get(a.number)! - order.get(b.number)!)
    }

    if (category !== 'all') result = result.filter((d) => d.category === category)
    if (kind === 'topics') result = result.filter((d) => d.listingSlug === null)
    if (kind === 'listings') result = result.filter((d) => d.listingSlug !== null)

    return result
  }, [discussions, deferredQuery, index, category, kind])

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            size={16}
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-subtle"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search every discussion and comment…"
            aria-label="Search discussions"
            className="w-full rounded-lg border border-border bg-surface py-2.5 pl-9 pr-3 text-sm placeholder:text-text-subtle focus:border-accent focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={kind}
            onChange={(event) => setKind(event.target.value as Filter)}
            aria-label="Thread type"
            className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm focus:border-accent focus:outline-none"
          >
            <option value="all">Everything</option>
            <option value="topics">Forum topics</option>
            <option value="listings">Script comments</option>
          </select>

          {categories.length > 1 && (
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              aria-label="Category"
              className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm focus:border-accent focus:outline-none"
            >
              <option value="all">All categories</option>
              {categories.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <p className="mt-4 text-sm text-text-muted">
        {visible.length} {visible.length === 1 ? 'thread' : 'threads'}
      </p>

      {visible.length === 0 ? (
        <div className="mt-5 rounded-card border border-dashed border-border bg-surface-2 px-6 py-14 text-center">
          <MessageSquare size={22} aria-hidden className="mx-auto text-text-subtle" />
          <p className="mt-3 font-medium">No threads match</p>
          <p className="mt-1 text-sm text-text-muted">
            Try a different search, or start the conversation yourself.
          </p>
        </div>
      ) : (
        <ul className="mt-5 divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
          {visible.map((discussion) => (
            <li key={discussion.number}>
              <ThreadRow discussion={discussion} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ThreadRow({ discussion }: { discussion: Discussion }) {
  // A listing's comment thread is more useful opened on the listing page,
  // where the reader can see what is being discussed.
  const href = discussion.listingSlug
    ? `/scripts/${discussion.listingSlug}`
    : discussion.url
  const external = discussion.listingSlug === null

  const content = (
    <div className="flex gap-3.5 px-4 py-4 transition-colors hover:bg-surface-2">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {discussion.listingSlug ? (
            <Badge tone="accent">Script</Badge>
          ) : (
            <Badge tone="outline">
              {discussion.categoryEmoji} {discussion.category}
            </Badge>
          )}
          {discussion.answered && (
            <span className="flex items-center gap-1 text-xs text-accent">
              <CheckCircle2 size={12} aria-hidden />
              Answered
            </span>
          )}
        </div>

        <p className="mt-1.5 font-medium leading-snug">{discussion.title}</p>

        {discussion.excerpt && (
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-text-muted">
            {discussion.excerpt}
          </p>
        )}

        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-subtle">
          {discussion.author && <span>@{discussion.author}</span>}
          <span>updated {formatRelative(discussion.updatedAt)}</span>
          <span className="flex items-center gap-1">
            <MessageSquare size={11} aria-hidden />
            {discussion.comments}
          </span>
        </p>
      </div>

      {external && <ArrowUpRight size={15} aria-hidden className="mt-1 shrink-0 text-text-subtle" />}
    </div>
  )

  return external ? (
    <a href={href} target="_blank" rel="noreferrer" className="block">
      {content}
    </a>
  ) : (
    <Link href={href} className="block">
      {content}
    </Link>
  )
}
