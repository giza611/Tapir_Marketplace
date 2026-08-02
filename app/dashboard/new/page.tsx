import type { Metadata } from 'next'
import Link from 'next/link'

import { ListingEditor } from '@/components/ListingEditor'
import { SignInPrompt } from '@/components/SignInPrompt'
import { getSession, isAuthConfigured } from '@/lib/auth'

export const metadata: Metadata = {
  title: 'Publish a listing',
  robots: { index: false },
}

export const dynamic = 'force-dynamic'

export default async function NewListingPage() {
  const session = await getSession()
  if (!session) return <SignInPrompt configured={isAuthConfigured} />

  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <nav aria-label="Breadcrumb" className="text-sm text-text-subtle">
        <Link href="/dashboard" className="transition-colors hover:text-text">
          My listings
        </Link>
        <span className="mx-1.5" aria-hidden>
          /
        </span>
        <span className="text-text-muted">New</span>
      </nav>

      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Publish a listing</h1>
      <p className="mt-2 max-w-xl leading-relaxed text-text-muted">
        Everything here becomes a file in the marketplace repository under your name. You can edit
        or remove it at any time.
      </p>

      <div className="mt-9">
        <ListingEditor login={session.login} today={today} />
      </div>
    </div>
  )
}
