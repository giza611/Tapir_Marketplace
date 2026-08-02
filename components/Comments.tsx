'use client'

import { useEffect, useRef } from 'react'

import { GISCUS, GISCUS_THEME_URL, REPO_URL, isGiscusConfigured } from '@/lib/site'

/**
 * Comments, powered by GitHub Discussions through giscus.
 *
 * This is the whole reason the site needs no comment database, no moderation
 * queue and no spam defence of its own: every comment is a GitHub Discussion
 * reply, subject to GitHub's account rules and abuse tooling. It also means a
 * listing's comments and the forum are literally the same dataset, so the
 * "one searchable place" requirement needs no extra machinery.
 *
 * `term` maps a page to its discussion. We pass the slug explicitly rather
 * than using pathname mapping so a future URL change doesn't orphan threads.
 */
export function Comments({
  term,
  mapping = 'specific',
}: {
  term: string
  /**
   * `specific` keys a thread to a listing slug and creates the discussion on
   * first comment. `number` attaches to an existing discussion by its number,
   * which is what lets a forum topic be read and replied to on this site
   * instead of sending the reader to GitHub.
   */
  mapping?: 'specific' | 'number'
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container || !isGiscusConfigured) return

    const script = document.createElement('script')
    script.src = 'https://giscus.app/client.js'
    script.async = true
    script.crossOrigin = 'anonymous'
    script.setAttribute('data-repo', GISCUS.repo)
    script.setAttribute('data-repo-id', GISCUS.repoId)
    script.setAttribute('data-category', GISCUS.category)
    script.setAttribute('data-category-id', GISCUS.categoryId)
    script.setAttribute('data-mapping', mapping)
    script.setAttribute('data-term', term)
    if (mapping === 'specific') script.setAttribute('data-strict', '1')
    script.setAttribute('data-reactions-enabled', '1')
    script.setAttribute('data-emit-metadata', '0')
    script.setAttribute('data-input-position', 'top')
    script.setAttribute('data-lang', 'en')
    script.setAttribute('data-loading', 'lazy')
    // A custom theme rather than a preset: the stock ones draw every comment as
    // a rounded, shadowed card, which the design system forbids. This one
    // restates the marketplace tokens in Primer's vocabulary and flattens the
    // thread into ruled blocks. Pinned to light — the site has no dark mode, so
    // following the OS produced a dark widget on a light page.
    script.setAttribute('data-theme', GISCUS_THEME_URL)

    container.appendChild(script)

    return () => {
      container.innerHTML = ''
    }
  }, [term, mapping])

  if (!isGiscusConfigured) {
    return (
      <div className="border border-dashed border-border bg-surface-2 p-6 text-sm">
        <p className="font-medium">Comments are not configured yet</p>
        <p className="mt-1.5 leading-relaxed text-text-muted">
          Enable Discussions on{' '}
          <a
            href={`${REPO_URL}/settings`}
            target="_blank"
            rel="noreferrer"
            className="text-accent underline underline-offset-2"
          >
            the repository
          </a>
          , then generate the IDs at{' '}
          <a
            href="https://giscus.app"
            target="_blank"
            rel="noreferrer"
            className="text-accent underline underline-offset-2"
          >
            giscus.app
          </a>{' '}
          and set <code className="text-xs">NEXT_PUBLIC_GISCUS_REPO_ID</code> and{' '}
          <code className="text-xs">NEXT_PUBLIC_GISCUS_CATEGORY_ID</code>.
        </p>
      </div>
    )
  }

  return <div ref={containerRef} />
}
