'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/**
 * The header's text nav. The active item carries a 2px accent underline, which
 * is the only place the accent appears in the header besides the sign-in
 * button — the system asks for it to be used sparingly.
 */
const LINKS = [
  { href: '/', label: 'Scripts' },
  { href: '/forum', label: 'Forum' },
  { href: '/submit', label: 'Publish' },
  { href: '/about', label: 'About' },
] as const

export function SiteNav() {
  const pathname = usePathname()

  return (
    <nav aria-label="Main" className="hidden items-center gap-5 md:flex">
      {LINKS.map((link) => {
        // "Scripts" owns the browse grid and every listing page beneath it.
        const active =
          link.href === '/'
            ? pathname === '/' || pathname.startsWith('/scripts')
            : pathname.startsWith(link.href)

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={[
              'py-1 text-[13px] font-semibold transition-colors',
              active
                ? 'border-b-2 border-accent text-text'
                : 'border-b-2 border-transparent text-text-muted hover:text-text',
            ].join(' ')}
          >
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}
