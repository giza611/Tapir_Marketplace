import type { Metadata } from 'next'
import Link from 'next/link'

import { NewTopicForm } from '@/components/NewTopicForm'
import { SignInPrompt } from '@/components/SignInPrompt'
import { getSession, isAuthConfigured } from '@/lib/auth'

export const metadata: Metadata = {
  title: 'Start a topic',
  robots: { index: false },
}

export const dynamic = 'force-dynamic'

export default async function NewTopicPage() {
  const session = await getSession()
  if (!session) return <SignInPrompt configured={isAuthConfigured} />

  return (
    <div className="mx-auto max-w-[820px] px-6 py-8">
      <nav aria-label="Breadcrumb" className="text-[11px] text-text-muted">
        <Link href="/forum" className="hover:text-accent">
          Forum
        </Link>
        <span className="mx-1.5" aria-hidden>
          /
        </span>
        <span className="text-text">New topic</span>
      </nav>

      <h1 className="mt-4 text-[26px] leading-tight tracking-[-0.02em]">Start a topic</h1>
      <p className="mt-2 max-w-[58ch] text-[13px] leading-relaxed text-text-muted">
        Your topic is posted to GitHub Discussions under your own account, so it is searchable
        here and on GitHub, and you can edit or delete it yourself at any time.
      </p>

      <NewTopicForm login={session.login} />
    </div>
  )
}
