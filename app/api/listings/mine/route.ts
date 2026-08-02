import { NextResponse } from 'next/server'

import { getSession } from '@/lib/auth'
import { listPendingSubmissions, type PendingSubmission } from '@/lib/github'
import { getAllListings } from '@/lib/listings'

export const dynamic = 'force-dynamic'

/**
 * The dashboard's data source.
 *
 * Published listings come from the build-time catalogue already sitting on
 * disk — no GitHub call needed, because the site *is* the repository. Only the
 * in-flight pull requests require the API, since by definition they are not
 * merged yet and so are not in the build.
 */
export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  const login = session.login.toLowerCase()

  const live = getAllListings()
    .filter((listing) => listing.authorGithub.toLowerCase() === login)
    .map(({ readme, ...rest }) => ({ ...rest, readme }))

  let pending: PendingSubmission[]
  try {
    pending = await listPendingSubmissions(session.token, session.login)
  } catch (error) {
    console.error(`[dashboard] could not list pull requests: ${(error as Error).message}`)
    pending = []
  }

  return NextResponse.json(
    { login: session.login, live, pending },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
