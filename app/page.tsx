import Link from 'next/link'
import { Suspense } from 'react'

import { CatalogBrowser } from '@/components/CatalogBrowser'
import { getCatalog } from '@/lib/listings'

/**
 * Home is the browse grid, per the handoff: header bar, left category rail,
 * content column. There is deliberately no marketing hero — the strapline sits
 * in the header and the pitch lives on /submit, so the first thing a visitor
 * sees is the catalogue itself.
 */
export default function HomePage() {
  const catalog = getCatalog()

  if (catalog.length === 0) return <FirstListingPrompt />

  return (
    <Suspense fallback={<GridSkeleton />}>
      <div className="mx-auto max-w-[1180px]">
        <CatalogBrowser entries={catalog} />
      </div>
    </Suspense>
  )
}

function GridSkeleton() {
  return (
    <div className="mx-auto max-w-[1180px] px-5 py-5">
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="min-h-[180px] border border-border bg-surface" />
        ))}
      </div>
    </div>
  )
}

/** The day-one state, before anything has been published. */
function FirstListingPrompt() {
  return (
    <div className="mx-auto max-w-[1180px] px-5 py-24 text-center">
      <h1 className="text-[32px]">The catalogue is empty</h1>
      <p className="mx-auto mt-3 max-w-md text-[13px] leading-relaxed text-text-muted">
        Nothing has been published yet. If you have a Tapir script or an Archicad add-on you use in
        practice, it is almost certainly useful to someone else.
      </p>
      <Link href="/submit" className="btn btn-primary btn-centered mt-6">
        Publish the first one
      </Link>
    </div>
  )
}
