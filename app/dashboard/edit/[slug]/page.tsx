import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { ListingEditor } from '@/components/ListingEditor'
import { SignInPrompt } from '@/components/SignInPrompt'
import { getSession, isAuthConfigured } from '@/lib/auth'
import { getListing } from '@/lib/listings'

export const metadata: Metadata = {
  title: 'Edit listing',
  robots: { index: false },
}

export const dynamic = 'force-dynamic'

export default async function EditListingPage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await getSession()
  if (!session) return <SignInPrompt configured={isAuthConfigured} />

  const { slug } = await params
  const listing = getListing(slug)
  if (!listing) notFound()

  // The API and CI both enforce this too. Checking here as well means an
  // unauthorised edit is refused before the form is even drawn, rather than
  // after someone has filled it in.
  if (listing.authorGithub.toLowerCase() !== session.login.toLowerCase()) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">This is not your listing</h1>
        <p className="mt-3 leading-relaxed text-text-muted">
          <strong>{listing.name}</strong> belongs to @{listing.authorGithub}. If you have an
          improvement to suggest, the fastest route is a comment on the listing itself.
        </p>
        <Link
          href={`/scripts/${listing.slug}`}
          className="mt-6 inline-block bg-accent px-5 py-2.5 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover"
        >
          Open the listing
        </Link>
      </div>
    )
  }

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
        <span className="text-text-muted">{listing.name}</span>
      </nav>

      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Edit {listing.name}</h1>
      <p className="mt-2 max-w-xl leading-relaxed text-text-muted">
        Changes are submitted as a pull request and go live once the automated checks pass.
      </p>

      <div className="mt-9">
        <ListingEditor login={session.login} initial={listing} today={today} />
      </div>
    </div>
  )
}
