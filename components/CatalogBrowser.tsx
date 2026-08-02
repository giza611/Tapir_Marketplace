'use client'

import MiniSearch from 'minisearch'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { useDeferredValue, useMemo, useState } from 'react'

import { ListingCard } from '@/components/ListingCard'
import {
  CATEGORIES,
  CATEGORY_LABELS,
  LISTING_TYPES,
  LISTING_TYPE_LABELS,
  type Category,
  type ListingType,
  type ResolvedListing,
} from '@/lib/schema'

type Entry = Omit<ResolvedListing, 'readme'>

const SORTS = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  downloads: 'Most downloaded',
  rating: 'Highest rated',
  name: 'Name (A–Z)',
} as const

type SortKey = keyof typeof SORTS

/**
 * The entire browse experience runs in the browser against a JSON payload
 * baked in at build time. No API, no database, no loading spinner — and it
 * keeps working if every service this project depends on goes down.
 *
 * That holds while the catalogue is in the hundreds. Past a few thousand
 * listings the payload becomes the bottleneck and this should move to
 * paginated static pages per category.
 */
export function CatalogBrowser({ entries }: { entries: Entry[] }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<Category | 'all'>('all')
  const [type, setType] = useState<ListingType | 'all'>('all')
  const [archicad, setArchicad] = useState<string>('all')
  const [sort, setSort] = useState<SortKey>('newest')

  // Keeps typing responsive: the input updates every keystroke while the
  // (more expensive) search and re-render can lag a frame behind.
  const deferredQuery = useDeferredValue(query)

  const archicadOptions = useMemo(() => {
    const all = new Set<string>()
    for (const entry of entries) {
      for (const version of entry.supportedArchicadVersions) all.add(version)
    }
    return [...all].sort((a, b) => Number(b) - Number(a))
  }, [entries])

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

  const visible = useMemo(() => {
    let result = entries

    const trimmed = deferredQuery.trim()
    if (trimmed.length > 0) {
      const ranked = index.search(trimmed)
      const order = new Map(ranked.map((hit, position) => [hit.id as string, position]))
      result = result
        .filter((entry) => order.has(entry.slug))
        .sort((a, b) => order.get(a.slug)! - order.get(b.slug)!)
    }

    if (category !== 'all') result = result.filter((entry) => entry.category === category)
    if (type !== 'all') result = result.filter((entry) => entry.type === type)
    if (archicad !== 'all') {
      result = result.filter((entry) => entry.supportedArchicadVersions.includes(archicad))
    }

    // A search ranks by relevance; imposing a sort on top would throw that away.
    if (trimmed.length > 0) return result

    return [...result].sort((a, b) => {
      switch (sort) {
        case 'oldest':
          return a.latestVersion.releasedAt.localeCompare(b.latestVersion.releasedAt)
        case 'downloads':
          return b.stats.downloads - a.stats.downloads
        case 'rating':
          return b.stats.reactions - a.stats.reactions
        case 'name':
          return a.name.localeCompare(b.name)
        case 'newest':
        default:
          return b.latestVersion.releasedAt.localeCompare(a.latestVersion.releasedAt)
      }
    })
  }, [entries, deferredQuery, index, category, type, archicad, sort])

  const filtersActive = category !== 'all' || type !== 'all' || archicad !== 'all'

  function clearFilters() {
    setCategory('all')
    setType('all')
    setArchicad('all')
  }

  return (
    <div>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
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
            placeholder="Search scripts, tags or authors…"
            aria-label="Search the marketplace"
            className="w-full rounded-lg border border-border bg-surface py-2.5 pl-9 pr-3 text-sm placeholder:text-text-subtle focus:border-accent focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            label="Category"
            value={category}
            onChange={(value) => setCategory(value as Category | 'all')}
            options={[
              { value: 'all', label: 'All categories' },
              ...CATEGORIES.map((value) => ({ value, label: CATEGORY_LABELS[value] })),
            ]}
          />
          <Select
            label="Type"
            value={type}
            onChange={(value) => setType(value as ListingType | 'all')}
            options={[
              { value: 'all', label: 'All types' },
              ...LISTING_TYPES.map((value) => ({ value, label: LISTING_TYPE_LABELS[value] })),
            ]}
          />
          <Select
            label="Archicad version"
            value={archicad}
            onChange={setArchicad}
            options={[
              { value: 'all', label: 'Any Archicad' },
              ...archicadOptions.map((value) => ({ value, label: `Archicad ${value}` })),
            ]}
          />
          <Select
            label="Sort by"
            value={sort}
            onChange={(value) => setSort(value as SortKey)}
            disabled={deferredQuery.trim().length > 0}
            options={Object.entries(SORTS).map(([value, label]) => ({ value, label }))}
          />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3 text-sm text-text-muted">
        <span>
          {visible.length} {visible.length === 1 ? 'script' : 'scripts'}
          {filtersActive || deferredQuery.trim() ? ` of ${entries.length}` : ''}
        </span>
        {filtersActive && (
          <button
            type="button"
            onClick={clearFilters}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-accent transition-colors hover:bg-accent-subtle"
          >
            <X size={12} aria-hidden />
            Clear filters
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          hasQuery={deferredQuery.trim().length > 0}
          onClear={() => {
            setQuery('')
            clearFilters()
          }}
        />
      ) : (
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((entry) => (
            <ListingCard key={entry.slug} listing={entry} />
          ))}
        </div>
      )}
    </div>
  )
}

function Select({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  disabled?: boolean
}) {
  return (
    <label className="relative">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        title={disabled ? 'Results are ranked by relevance while searching' : label}
        className="appearance-none rounded-lg border border-border bg-surface py-2.5 pl-3 pr-8 text-sm text-text transition-colors hover:border-border-strong focus:border-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <svg
        aria-hidden
        width="10"
        height="6"
        viewBox="0 0 10 6"
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 fill-none stroke-current text-text-subtle"
      >
        <path d="M1 1l4 4 4-4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </label>
  )
}

function EmptyState({ hasQuery, onClear }: { hasQuery: boolean; onClear: () => void }) {
  return (
    <div className="mt-6 rounded-card border border-dashed border-border bg-surface-2 px-6 py-16 text-center">
      <SlidersHorizontal size={22} aria-hidden className="mx-auto text-text-subtle" />
      <p className="mt-3 font-medium">Nothing matches that yet</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-text-muted">
        {hasQuery
          ? 'Try a broader search term, or clear the filters to see the whole catalogue.'
          : 'No listings match these filters. Clear them to see everything.'}
      </p>
      <button
        type="button"
        onClick={onClear}
        className="mt-4 rounded-lg border border-border bg-surface px-3.5 py-2 text-sm font-medium transition-colors hover:border-border-strong"
      >
        Reset
      </button>
    </div>
  )
}
