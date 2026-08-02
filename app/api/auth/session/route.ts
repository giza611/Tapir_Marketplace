import { NextResponse } from 'next/server'

import { getSession, isAuthConfigured } from '@/lib/auth'

/**
 * Who am I? Returns only what the header needs to render.
 *
 * Note what is absent: the access token. It stays inside the encrypted
 * httpOnly cookie and is only ever unsealed server-side.
 */
export async function GET() {
  const session = await getSession()

  if (!session) {
    return NextResponse.json(
      { signedIn: false, configured: isAuthConfigured },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  }

  return NextResponse.json(
    {
      signedIn: true,
      login: session.login,
      name: session.name,
      avatarUrl: session.avatarUrl,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
