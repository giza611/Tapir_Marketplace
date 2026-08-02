import Link from 'next/link'
import { ArrowRight, GitPullRequest } from 'lucide-react'

import { CatalogBrowser } from '@/components/CatalogBrowser'
import { getCatalog } from '@/lib/listings'
import { SITE, TAPIR } from '@/lib/site'

export default function HomePage() {
  const catalog = getCatalog()
  const authorCount = new Set(catalog.map((entry) => entry.authorGithub)).size

  return (
    <>
      <section className="border-b border-border bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-pill border border-accent-border bg-accent-subtle px-3 py-1 text-xs font-medium text-accent">
              <GitPullRequest size={12} aria-hidden />
              Community-owned. Every listing is a file in a public repo.
            </span>

            <h1 className="mt-5 text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
              Automation for Archicad,
              <br />
              shared by the people who wrote it.
            </h1>

            <p className="mt-5 text-lg leading-relaxed text-text-muted">
              Browse{' '}
              <a
                href={TAPIR.repoUrl}
                target="_blank"
                rel="noreferrer"
                className="text-text underline underline-offset-2 hover:text-accent"
              >
                Tapir
              </a>{' '}
              scripts and Archicad add-ons built by architects and developers. Free to download,
              free to publish, and open to anyone with something worth sharing.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href="/submit"
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover"
              >
                Publish your script
                <ArrowRight size={15} aria-hidden />
              </Link>
              <Link
                href="/forum"
                className="rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-medium transition-colors hover:border-border-strong"
              >
                Ask the community
              </Link>
            </div>

            {catalog.length > 0 && (
              <p className="mt-7 text-sm text-text-subtle">
                {catalog.length} {catalog.length === 1 ? 'listing' : 'listings'} from {authorCount}{' '}
                {authorCount === 1 ? 'author' : 'authors'}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {catalog.length === 0 ? <FirstListingPrompt /> : <CatalogBrowser entries={catalog} />}
      </section>
    </>
  )
}

/** Shown when the catalogue is genuinely empty — the day-one state. */
function FirstListingPrompt() {
  return (
    <div className="rounded-card border border-dashed border-border bg-surface-2 px-6 py-20 text-center">
      <h2 className="text-lg font-semibold">The catalogue is empty</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-text-muted">
        Nothing has been published yet. If you have a Tapir script or an Archicad add-on you use in
        practice, it is almost certainly useful to someone else.
      </p>
      <Link
        href="/submit"
        className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover"
      >
        Publish the first one
        <ArrowRight size={15} aria-hidden />
      </Link>
      <p className="mt-3 text-xs text-text-subtle">{SITE.name} is free and always will be.</p>
    </div>
  )
}
