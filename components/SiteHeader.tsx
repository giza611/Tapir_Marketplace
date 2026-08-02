import Link from 'next/link'

import { AccountMenu } from '@/components/AccountMenu'
import { NAV_LINKS, REPO_URL, SITE } from '@/lib/site'

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <Logomark />
          <span className="text-[15px] font-semibold tracking-tight">{SITE.name}</span>
        </Link>

        <nav aria-label="Main" className="ml-2 hidden items-center gap-1 sm:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-1.5 text-sm text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="hidden rounded-lg p-2 text-text-muted transition-colors hover:bg-surface-2 hover:text-text sm:block"
            aria-label="View this project on GitHub"
          >
            <GitHubMark />
          </a>
          <AccountMenu />
        </div>
      </div>
    </header>
  )
}

/**
 * A stylised tapir snout in profile. Deliberately geometric so it reads at
 * 24px in a browser tab as well as it does in the header.
 */
function Logomark() {
  return (
    <span
      aria-hidden
      className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-accent text-accent-fg"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path
          d="M3 15.5c0-4.7 3.4-8.5 8-8.5h4.2c.6 0 1.1-.3 1.4-.8l.7-1.1c.4-.7 1.4-.7 1.8 0l1.6 2.7c.2.4.2.9 0 1.3l-1.9 3.2c-.2.3-.5.5-.9.5H16"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M3 15.5V19"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
        />
        <circle cx="17.6" cy="8.2" r="1" fill="currentColor" />
      </svg>
    </span>
  )
}

function GitHubMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  )
}
