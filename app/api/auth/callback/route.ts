import { NextResponse, type NextRequest } from 'next/server'

import {
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
  consumeOAuthState,
  createSession,
  isAuthConfigured,
} from '@/lib/auth'

export async function GET(request: NextRequest) {
  if (!isAuthConfigured) {
    return NextResponse.redirect(new URL('/?auth=unconfigured', request.nextUrl.origin))
  }

  const code = request.nextUrl.searchParams.get('code')
  const state = request.nextUrl.searchParams.get('state')

  if (!(await consumeOAuthState(state))) {
    // Either a forged callback or a stale tab. Neither should create a session.
    return NextResponse.redirect(new URL('/?auth=state', request.nextUrl.origin))
  }
  if (!code) {
    return NextResponse.redirect(new URL('/?auth=denied', request.nextUrl.origin))
  }

  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: new URL('/api/auth/callback', request.nextUrl.origin).toString(),
    }),
  })

  const tokenPayload = (await tokenResponse.json()) as {
    access_token?: string
    error?: string
  }

  if (!tokenPayload.access_token) {
    console.error(`[auth] token exchange failed: ${tokenPayload.error ?? 'no token returned'}`)
    return NextResponse.redirect(new URL('/?auth=failed', request.nextUrl.origin))
  }

  const userResponse = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${tokenPayload.access_token}`,
      Accept: 'application/vnd.github+json',
    },
  })

  if (!userResponse.ok) {
    return NextResponse.redirect(new URL('/?auth=failed', request.nextUrl.origin))
  }

  const user = (await userResponse.json()) as {
    login: string
    name: string | null
    avatar_url: string
  }

  await createSession({
    token: tokenPayload.access_token,
    login: user.login,
    name: user.name,
    avatarUrl: user.avatar_url,
  })

  return NextResponse.redirect(new URL('/dashboard', request.nextUrl.origin))
}
