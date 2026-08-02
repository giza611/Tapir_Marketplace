import { NextResponse, type NextRequest } from 'next/server'

import { GITHUB_CLIENT_ID, isAuthConfigured, issueOAuthState } from '@/lib/auth'

export async function GET(request: NextRequest) {
  if (!isAuthConfigured) {
    return NextResponse.json(
      {
        error:
          'Sign-in is not configured. Set GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET and AUTH_SECRET.',
      },
      { status: 503 },
    )
  }

  const state = await issueOAuthState()

  const authorize = new URL('https://github.com/login/oauth/authorize')
  authorize.searchParams.set('client_id', GITHUB_CLIENT_ID)
  authorize.searchParams.set('redirect_uri', new URL('/api/auth/callback', request.nextUrl.origin).toString())
  // public_repo, never repo. Publishing only ever touches public repositories,
  // so asking for private access would be both unnecessary and alarming.
  authorize.searchParams.set('scope', 'public_repo')
  authorize.searchParams.set('state', state)

  return NextResponse.redirect(authorize)
}
