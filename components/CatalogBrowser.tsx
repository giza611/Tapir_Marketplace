'use client'

import MiniSearch from 'minisearch'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useMemo } from 'react'

import { ListingCard } from '@/components/ListingCard'
import {
  CATEGORIES,
  CATEGORY_LABELS,
  type Category,
  type ResolvedListing,
} from '@/lib/schema'

type Entry = Omit<ResolvedListing, 'readme'>

const SORTS = {
  newest: 'Newest',
  oldest: 'Oldest',
  rating: 'Rating',
  downloads: 'Downloads',
} as const

type SortKey = keyof typeof SORTS

/**
 * The browse experience: a fixed category rail, sort chips and the card grid.
 *
 * All state lives in the URL (`?category=&sort=&q=`), as the handoff requires,
 * so a filtered view is shareable and the back button works. Filtering itself
 * runs in the browser against a JSON payload baked in at build time — no API,
 * no database, and it keeps working if every service this project depends on
 * goes down.
 *
 * That holds while the catalogue is in the hundreds. Past a few thousand
 * listings the payload becomes the bottleneck and this should move to
 * paginated static pages per category.
 */
export function CatalogBrowser({ entries }: { entries: Entry[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const category = (searchParams.get('category') ?? 'all') as Category | 'all'
  const sort = (searchParams.get('sort') ?? 'newest') as SortKey
  const query = searchParams.get('q') ?? ''

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(searchParams.toString())
      if (value === null || value === '' || value === 'all') next.delete(key)
      else next.set(key, value)
      const search = next.toString()
      router.push(search ? `${pathname}?${search}` : pathname, { scroll: false })
    },
    [pathname, router, searchParams],
  )

  const index = useMemo(() => {
    const search = new MiniSearch<{
      id: string
      name: string
      summary: string
      tags: string
      category: string
      author: string
    }>({
      fields: ['name', 'summary', 'tags', 'category', 'author'],
      storeFields: ['id'],
      searchOptions: { prefix: true, fuzzy: 0.2, boost: { name: 3, tags: 2 } },
    })
    search.addAll(
      entries.map((entry) => ({
        id: entry.slug,
        name: entry.name,
        summary: entry.summary,
        tags: entry.tags.join(' '),
        category: CATEGORY_LABELS[entry.category],
        author: entry.author.name,
      })),
    )
    return search
  }, [entries])

  /** Counts ignore the active category so the rail shows the whole catalogue. */
  const counts = useMemo(() => {
    const map = new Map<string, number>()
    for (const entry of entries) {
      map.set(entry.category, (map.get(entry.category) ?? 0) + 1)
    }
    return map
  }, [entries])

  const visible = useMemo(() => {
    let result = entries

    const trimmed = query.trim()
    if (trimmed) {
      const ranked = index.search(trimmed)
      const order = new Map(ranked.map((hit, position) => [hit.id as string, position]))
      result = result
        .filter((entry) => order.has(entry.slug))
        .sort((a, b) => order.get(a.slug)! - order.get(b.slug)!)
    }

    if (category !== 'all') result = result.filter((entry) => entry.category === category)

    // A search ranks by relevance; imposing a sort on top would throw that away.
    if (trimmed) return result

    return [...result].sort((a, b) => {
      switch (sort) {
        case 'oldest':
          return a.latestVersion.releasedAt.localeCompare(b.latestVersion.releasedAt)
        case 'downloads':
          return b.stats.downloads - a.stats.downloads
        case 'rating':
          return b.stats.reactions - a.stats.reactions
        case 'newest':
        default:
          return b.latestVersion.releasedAt.localeCompare(a.latestVersion.releasedAt)
      }
    })
  }, [entries, query, index, category, sort])

  const activeLabel = category === 'all' ? 'All' : CATEGORY_LABELS[category]

  return (
    <div className="flex">
      <nav
        aria-label="Categories"
        className="hidden w-[216px] shrink-0 border-r border-border px-[18px] py-5 md:block"
      >
        <p className="label-kicker">Category</p>
        <ul className="mt-2.5">
          <RailRow
            label="All"
            count={entries.length}
            active={category === 'all'}
            onSelect={() => setParam('category', null)}
          />
          {CATEGORIES.map((value) => (
            <RailRow
              key={value}
              label={CATEGORY_LABELS[value]}
              count={counts.get(value) ?? 0}
              active={category === value}
              onSelect={() => setParam('category', value)}
            />
          ))}
        </ul>
      </nav>

      <div className="min-w-0 flex-1 px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[12px] text-text-muted">
            {visible.length} {visible.length === 1 ? 'script' : 'scripts'} in {activeLabel}
            {query.trim() && (
              <>
                {' '}
                matching <span className="text-text">“{query.trim()}”</span>
              </>
            )}
          </p>

          <div className="flex items-center gap-2">
            <span className="label-kicker">Sort</span>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(SORTS) as SortKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setParam('sort', key === 'newest' ? null : key)}
                  disabled={Boolean(query.trim())}
                  aria-pressed={sort === key}
                  title={
                    query.trim() ? 'Results are ranked by relevance while searching' : undefined
                  }
                  className={
                    sort === key && !query.trim()
                      ? 'tag tag-outline cursor-pointer disabled:cursor-not-allowed disabled:opacity-45'
                      : 'tag tag-quiet cursor-pointer hover:border-border-strong disabled:cursor-not-allowed disabled:opacity-45'
                  }
                >
                  {SORTS[key]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile category select. The design is desktop-first at 1280px, but a
            rail hidden below md would otherwise strand the filter entirely. */}
        <label className="mt-4 block md:hidden">
          <span className="sr-only">Category</span>
          <select
            value={category}
            onChange={(event) => setParam('category', event.target.value)}
            className="input"
          >
            <option value="all">All categories ({entries.length})</option>
            {CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {CATEGORY_LABELS[value]} ({counts.get(value) ?? 0})
              </option>
            ))}
          </select>
        </label>

        {visible.length === 0 ? (
          <EmptyState
            hasQuery={Boolean(query.trim())}
            onReset={() => router.push(pathname, { scroll: false })}
          />
        ) : (
          <div className="mt-4 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((entry) => (
              <ListingCard key={entry.slug} listing={entry} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function RailRow({
  label,
  count,
  active,
  onSelect,
}: {
  label: string
  count: number
  active: boolean
  onSelect: () => void
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-current={active ? 'true' : undefined}
        className={[
          'flex w-full items-center justify-between gap-2 px-2 py-[5px] text-left text-[12px]',
          active
            ? 'border border-accent bg-accent-subtle text-accent-800'
            : 'border border-transparent text-text-muted hover:bg-surface-2 hover:text-text',
        ].join(' ')}
      >
        <span className="truncate">{label}</span>
        <span className="shrink-0 text-[10.5px] tabular-nums">{count}</span>
      </button>
    </li>
  )
}

function EmptyState({ hasQuery, onReset }: { hasQuery: boolean; onReset: () => void }) {
  return (
    <div className="mt-4 border border-border bg-surface px-6 py-14 text-center">
      <p className="font-heading text-[16px]">Nothing matches that yet</p>
      <p className="mx-auto mt-1.5 max-w-sm text-[12px] leading-relaxed text-text-muted">
        {hasQuery
          ? 'Try a broader search term, or clear the filters to see the whole catalogue.'
          : 'No listings in this category yet. Clear the filter to see everything.'}
      </p>
      <button type="button" onClick={onReset} className="btn btn-secondary btn-centered mt-4">
        Reset
      </button>
    </div>
  )
}
