import Image from 'next/image'
import Link from 'next/link'
import { Suspense } from 'react'

import { AccountMenu } from '@/components/AccountMenu'
import { HeaderSearch } from '@/components/HeaderSearch'
import { SITE } from '@/lib/site'

/**
 * The header bar (`.nav` in the design system): full width, bottom 2px divider.
 * Left cluster is the circular mark, the wordmark and a muted strapline; right
 * cluster is search, Forum and the sign-in action.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b-2 border-border-strong bg-bg">
      <div className="mx-auto flex min-h-[58px] max-w-[1180px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/tapir-logo.png"
            alt=""
            width={26}
            height={26}
            className="grayscale-print rounded-full"
            priority
          />
          <span className="font-heading text-[15px] leading-none">{SITE.name}</span>
        </Link>

        <p className="hidden text-[11px] leading-tight text-text-muted lg:block">
          {SITE.tagline}
        </p>

        <div className="ml-auto flex items-center gap-2">
          {/* HeaderSearch reads the URL query, which opts its subtree into
              client rendering. The boundary keeps the rest of the header — and
              every page that renders it — statically prerendered. */}
          <Suspense fallback={<div className="hidden h-9 w-[200px] sm:block" />}>
            <HeaderSearch />
          </Suspense>
          <Link href="/forum" className="btn btn-secondary btn-centered">
            Forum
          </Link>
          <AccountMenu />
        </div>
      </div>
    </header>
  )
}
