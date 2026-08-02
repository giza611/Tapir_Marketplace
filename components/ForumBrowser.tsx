'use client'

import MiniSearch from 'minisearch'
import { Search } from 'lucide-react'
import Link from 'next/link'
import { useDeferredValue, useMemo, useState } from 'react'

import type { Discussion } from '@/lib/discussions'
import { formatRelative } from '@/lib/format'

/**
 * One searchable place for every conversation — free-standing forum topics and
 * per-listing comment threads alike. They are the same GitHub Discussions
 * primitive, so unifying them costs nothing.
 *
 * `categoryBySlug` lets a script-bound thread display the listing's own
 * category rather than the GitHub Discussions category it happens to live in,
 * which is what the handoff's meta line format expects.
 */
export function ForumBrowser({
  discussions,
  categoryBySlug,
  scriptNameBySlug,
}: {
  discussions: Discussion[]
  categoryBySlug: Record<string, string>
  scriptNameBySlug: Record<string, string>
}) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')

  const deferredQuery = useDeferredValue(query)

  function categoryOf(discussion: Discussion): string {
    if (discussion.listingSlug) {
      return categoryBySlug[discussion.listingSlug] ?? discussion.category
    }
    return discussion.category
  }

  const chips = useMemo(() => {
    const present = new Set(discussions.map(categoryOf))
    return ['all', ...[...present].sort()]
    // eslint-disable-next-line react-hooks/exhaustive-deps -- categoryOf is derived from props above
  }, [discussions, categoryBySlug])

  const index = useMemo(() => {
    const search = new MiniSearch<{ id: number; title: string; excerpt: string; author: string }>({
      fields: ['title', 'excerpt', 'author'],
      storeFields: ['id'],
      searchOptions: { prefix: true, fuzzy: 0.2, boost: { title: 3 } },
    })
    search.addAll(
      discussions.map((discussion) => ({
        id: discussion.number,
        title: discussion.listingSlug
          ? (scriptNameBySlug[discussion.listingSlug] ?? discussion.title)
          : discussion.title,
        excerpt: discussion.excerpt,
        author: discussion.author ?? '',
      })),
    )
    return search
  }, [discussions, scriptNameBySlug])

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

    if (filter !== 'all') result = result.filter((d) => categoryOf(d) === filter)

    return result
    // eslint-disable-next-line react-hooks/exhaustive-deps -- categoryOf is derived from props above
  }, [discussions, deferredQuery, index, filter, categoryBySlug])

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b-2 border-border-strong pb-4">
        <h1 className="mr-auto text-[16px]">Forum</h1>
        <div className="relative">
          <Search
            size={14}
            aria-hidden
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-subtle"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="search all discussion"
            aria-label="Search discussions"
            className="input w-[220px] pl-8 text-[13px]"
          />
        </div>
      </div>

      {chips.length > 1 && (
        <div className="flex flex-wrap gap-1.5 border-b border-border py-3">
          {chips.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              aria-pressed={filter === value}
              className={
                filter === value
                  ? 'tag tag-outline cursor-pointer'
                  : 'tag tag-quiet cursor-pointer hover:border-border-strong'
              }
            >
              {value === 'all' ? 'All' : value}
            </button>
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <div className="border border-border bg-surface px-6 py-14 text-center">
          <p className="font-heading text-[15px]">No threads yet</p>
          <p className="mt-1.5 text-[12px] text-text-muted">
            {deferredQuery.trim()
              ? 'Nothing matches that search.'
              : 'Ask the first question, or leave a comment on any script.'}
          </p>
        </div>
      ) : (
        <ul>
          {visible.map((discussion) => (
            <li key={discussion.number} className="border-b border-border">
              <ThreadRow
                discussion={discussion}
                category={categoryOf(discussion)}
                scriptName={
                  discussion.listingSlug
                    ? (scriptNameBySlug[discussion.listingSlug] ?? discussion.title)
                    : null
                }
              />
            </li>
          ))}
        </ul>
      )}

      <p className="mt-5 text-[10.5px] leading-relaxed text-text-muted">
        Threads tied to a script carry its name as a tag, so a question asked on a script card is
        findable here.
      </p>
    </div>
  )
}

function ThreadRow({
  discussion,
  category,
  scriptName,
}: {
  discussion: Discussion
  category: string
  scriptName: string | null
}) {
  // Both destinations stay on this site. A listing's comment thread is most
  // useful on the listing page, where the reader can see what is being
  // discussed; a standalone topic gets its own thread page, where giscus
  // renders the real discussion and replying works in place.
  const href = discussion.listingSlug
    ? `/scripts/${discussion.listingSlug}`
    : `/forum/${discussion.number}`

  const content = (
    <div className="flex items-start gap-3 px-6 py-4 transition-colors hover:bg-surface-2">
      {discussion.authorAvatar ? (
        // eslint-disable-next-line @next/next/no-img-element -- remote avatar, already small
        <img
          src={discussion.authorAvatar}
          alt=""
          width={28}
          height={28}
          className="mt-0.5 h-7 w-7 shrink-0 rounded-full border border-border"
        />
      ) : (
        <span className="mt-0.5 h-7 w-7 shrink-0 rounded-full bg-surface-3" aria-hidden />
      )}

      <div className="min-w-0 flex-1">
        <p className="text-[13px] leading-snug">{scriptName ?? discussion.title}</p>
        <p className="mt-0.5 text-[10.5px] text-text-muted">
          {category} · {scriptName ? `on ${scriptName}` : 'topic'}
          {discussion.author ? ` · ${discussion.author}` : ''}
        </p>
      </div>

      <div className="shrink-0 text-right text-[10.5px] text-text-muted">
        <p>
          {discussion.comments} {discussion.comments === 1 ? 'reply' : 'replies'}
        </p>
        <p>{formatRelative(discussion.updatedAt)}</p>
      </div>
    </div>
  )

  return (
    <Link href={href} className="block">
      {content}
    </Link>
  )
}
