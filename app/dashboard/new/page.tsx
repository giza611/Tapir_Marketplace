import type { Metadata } from 'next'
import Link from 'next/link'

import { ListingEditor } from '@/components/ListingEditor'
import { SignInPrompt } from '@/components/SignInPrompt'
import { getAuthor } from '@/lib/authors'
import { getSession, isAuthConfigured } from '@/lib/auth'
import type { ListingAuthor } from '@/lib/schema'

export const metadata: Metadata = {
  title: 'Publish a listing',
  robots: { index: false },
}

export const dynamic = 'force-dynamic'

/**
 * Contact details for a returning contributor.
 *
 * Nobody should retype their name and company for every script they publish.
 * The last listing they wrote is the best source, because it is the version
 * they most recently chose to present. Falling back to the GitHub profile means
 * even a first-time contributor arrives at a partly filled form.
 */
async function prefillAuthor(login: string, token: string): Promise<Partial<ListingAuthor>> {
  const previous = getAuthor(login)
  if (previous) return previous.profile

  try {
    const response = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
    })
    if (!response.ok) return {}
    const user = (await response.json()) as {
      name: string | null
      company: string | null
      blog: string | null
      location: string | null
      bio: string | null
    }
    return {
      ...(user.name ? { name: user.name } : {}),
      // GitHub prefixes an org-linked company with @, which is not a company name.
      ...(user.company ? { company: user.company.replace(/^@/, '') } : {}),
      ...(user.location ? { city: user.location } : {}),
      ...(user.blog?.startsWith('http') ? { website: user.blog } : {}),
      ...(user.bio ? { bio: user.bio } : {}),
    }
  } catch {
    return {}
  }
}

export default async function NewListingPage() {
  const session = await getSession()
  if (!session) return <SignInPrompt configured={isAuthConfigured} />

  const today = new Date().toISOString().slice(0, 10)
  const author = await prefillAuthor(session.login, session.token)

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
        <ListingEditor login={session.login} today={today} prefillAuthor={author} />
      </div>
    </div>
  )
}
