import Image from 'next/image'
import Link from 'next/link'
import { Suspense } from 'react'

import { AccountMenu } from '@/components/AccountMenu'
import { HeaderSearch } from '@/components/HeaderSearch'
import { SiteNav } from '@/components/SiteNav'
import { SITE } from '@/lib/site'

/**
 * The header from the visual pass: 64px tall with a 2px bottom rule, the brand
 * mark and wordmark at 19px/800, a text nav, then search and the sign-in
 * action on the right.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b-2 border-border-strong bg-bg">
      <div className="mx-auto flex h-16 max-w-[1180px] items-center gap-6 px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <Image
            src="/tapir-logo.png"
            alt=""
            width={28}
            height={28}
            className="grayscale-print rounded-full"
            priority
          />
          <span className="font-heading text-[19px] leading-none">{SITE.name}</span>
        </Link>

        <SiteNav />

        <div className="ml-auto flex items-center gap-3">
          {/* HeaderSearch reads the URL query, which opts its subtree into
              client rendering. The boundary keeps the rest of the header — and
              every page that renders it — statically prerendered. */}
          <Suspense fallback={<div className="hidden h-9 w-[210px] sm:block" />}>
            <HeaderSearch />
          </Suspense>
          <AccountMenu />
        </div>
      </div>
    </header>
  )
}
