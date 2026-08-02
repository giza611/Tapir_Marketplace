'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

type Session =
  | { signedIn: false; configured: boolean }
  | { signedIn: true; login: string; name: string | null; avatarUrl: string }

/**
 * Sign-in state lives entirely in an httpOnly cookie the browser cannot read,
 * so this asks the server who it is. That indirection is the point: the GitHub
 * token never reaches page JavaScript, which means an XSS bug here cannot be
 * turned into "write to every repo this user owns".
 */
export function AccountMenu() {
  const [session, setSession] = useState<Session | null>(null)
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/auth/session')
      .then((response) => (response.ok ? response.json() : { signedIn: false, configured: false }))
      .then((data: Session) => {
        if (!cancelled) setSession(data)
      })
      .catch(() => {
        if (!cancelled) setSession({ signedIn: false, configured: false })
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  // Render nothing until we know — a button that flips from "Sign in" to an
  // avatar after hydration is worse than one that appears a beat late.
  if (!session) return <div className="h-9 w-20" aria-hidden />

  if (!session.signedIn) {
    return (
      <a
        href="/api/auth/login"
        className="bg-accent px-3.5 py-2 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover"
      >
        Sign in
      </a>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 py-1 pl-1 pr-2 transition-colors hover:bg-surface-2"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- avatars are
            remote, already 40px, and not worth a remotePatterns entry */}
        <img
          src={session.avatarUrl}
          alt=""
          width={28}
          height={28}
          className="rounded-full border border-border"
        />
        <span className="hidden text-sm text-text-muted sm:inline">{session.login}</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-52 overflow-hidden border border-border bg-surface shadow-lg"
        >
          <div className="border-b border-border px-3 py-2.5">
            <p className="truncate text-sm font-medium">{session.name ?? session.login}</p>
            <p className="truncate text-xs text-text-subtle">@{session.login}</p>
          </div>
          <Link
            href="/dashboard"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-3 py-2.5 text-sm transition-colors hover:bg-surface-2"
          >
            My listings
          </Link>
          <Link
            href="/dashboard/new"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-3 py-2.5 text-sm transition-colors hover:bg-surface-2"
          >
            Publish a script
          </Link>
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              role="menuitem"
              className="w-full border-t border-border px-3 py-2.5 text-left text-sm text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
            >
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
