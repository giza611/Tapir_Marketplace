'use client'

import { useEffect, useRef } from 'react'

import { GISCUS, REPO_URL, isGiscusConfigured } from '@/lib/site'

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
export function Comments({ term }: { term: string }) {
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
    script.setAttribute('data-mapping', 'specific')
    script.setAttribute('data-term', term)
    script.setAttribute('data-strict', '1')
    script.setAttribute('data-reactions-enabled', '1')
    script.setAttribute('data-emit-metadata', '0')
    script.setAttribute('data-input-position', 'top')
    script.setAttribute('data-lang', 'en')
    script.setAttribute('data-loading', 'lazy')
    script.setAttribute(
      'data-theme',
      window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark_dimmed' : 'light',
    )

    container.appendChild(script)

    // Keep the embedded iframe in step if the OS theme flips while reading.
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onThemeChange = (event: MediaQueryListEvent) => {
      const frame = container.querySelector<HTMLIFrameElement>('iframe.giscus-frame')
      frame?.contentWindow?.postMessage(
        { giscus: { setConfig: { theme: event.matches ? 'dark_dimmed' : 'light' } } },
        'https://giscus.app',
      )
    }
    media.addEventListener('change', onThemeChange)

    return () => {
      media.removeEventListener('change', onThemeChange)
      container.innerHTML = ''
    }
  }, [term])

  if (!isGiscusConfigured) {
    return (
      <div className="rounded-card border border-dashed border-border bg-surface-2 p-6 text-sm">
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
