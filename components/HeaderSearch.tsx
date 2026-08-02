'use client'

import { Search } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

/**
 * Header search. Submitting navigates to the browse grid with `?q=`, which is
 * where the actual filtering happens.
 *
 * The design brief is explicit that browse state lives in the URL so views are
 * shareable and the back button works, so this writes a query param rather than
 * holding a value in component state.
 */
export function HeaderSearch() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [value, setValue] = useState(searchParams.get('q') ?? '')

  function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    const trimmed = value.trim()
    router.push(trimmed ? `/?q=${encodeURIComponent(trimmed)}` : '/')
  }

  return (
    <form onSubmit={onSubmit} role="search" className="relative hidden sm:block">
      <Search
        size={14}
        aria-hidden
        className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-subtle"
      />
      <input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="search scripts, authors, threads"
        aria-label="Search the marketplace"
        className="input w-[200px] pl-8 text-[13px]"
      />
    </form>
  )
}
