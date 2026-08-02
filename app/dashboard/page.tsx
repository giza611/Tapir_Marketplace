import type { Metadata } from 'next'

import { Dashboard } from '@/components/Dashboard'
import { SignInPrompt } from '@/components/SignInPrompt'
import { getSession, isAuthConfigured } from '@/lib/auth'

export const metadata: Metadata = {
  title: 'My listings',
  robots: { index: false },
}

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const session = await getSession()

  if (!session) {
    return <SignInPrompt configured={isAuthConfigured} />
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Dashboard />
    </div>
  )
}
