import Link from 'next/link'
import { Suspense } from 'react'

import { CatalogBrowser } from '@/components/CatalogBrowser'
import { PosterBand } from '@/components/PosterBand'
import { formatCount } from '@/lib/format'
import { getCatalog } from '@/lib/listings'

/**
 * Home, per the visual pass (`2a`): hero over a 2px rule, then the category
 * rail and the card matrix, closing on the poster band.
 */
export default function HomePage() {
  const catalog = getCatalog()
  const authors = new Set(catalog.map((entry) => entry.authorGithub.toLowerCase())).size
  const downloads = catalog.reduce((total, entry) => total + entry.stats.downloads, 0)

  return (
    <>
      <section className="border-b-2 border-border-strong">
        <div className="mx-auto grid max-w-[1180px] gap-10 px-6 py-14 lg:grid-cols-[1.35fr_1fr] lg:gap-12">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-accent">
              Tapir scripts and add-ons
            </p>
            <h1 className="mt-4 max-w-[14ch] text-[40px] leading-[1.02] tracking-[-0.03em] sm:text-[54px]">
              Tools the community built
            </h1>
            <p className="mt-5 max-w-[52ch] text-[15px] leading-relaxed text-text-muted">
              Made by architects. Free to download, open to
              discussion, credited to the people who made them.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="#catalogue" className="btn btn-primary btn-centered">
                Browse all scripts
              </Link>
              <Link href="/submit" className="btn btn-secondary btn-centered">
                Publish yours
              </Link>
            </div>
          </div>

          {/* Three stats behind a 2px left rule. Only the last number is accent. */}
          <dl className="flex gap-8 self-center lg:border-l-2 lg:border-border-strong lg:pl-12">
            <HeroStat label="Scripts" value={String(catalog.length)} />
            <HeroStat label="Authors" value={String(authors)} />
            <HeroStat label="Downloads" value={formatCount(downloads)} accent />
          </dl>
        </div>
      </section>

      <div id="catalogue" className="mx-auto max-w-[1180px]">
        {catalog.length === 0 ? (
          <FirstListingPrompt />
        ) : (
          <Suspense fallback={<GridSkeleton />}>
            <CatalogBrowser entries={catalog} />
          </Suspense>
        )}
      </div>

      <PosterBand
        statement="Wrote something that saved your team a day? Put it here."
        action="Publish a script"
        href="/submit"
      />
    </>
  )
}

function HeroStat({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div>
      <dd
        className={`font-heading text-[32px] leading-none ${accent ? 'text-accent' : 'text-text'}`}
      >
        {value}
      </dd>
      <dt className="mt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">
        {label}
      </dt>
    </div>
  )
}

function GridSkeleton() {
  return (
    <div className="grid gap-0 px-6 py-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="min-h-[206px] border-b border-r border-border" />
      ))}
    </div>
  )
}

/** The day-one state, before anything has been published. */
function FirstListingPrompt() {
  return (
    <div className="px-6 py-24 text-center">
      <h2 className="text-[32px]">The catalogue is empty</h2>
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
