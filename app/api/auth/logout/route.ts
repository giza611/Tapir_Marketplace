import { NextResponse, type NextRequest } from 'next/server'

import { destroySession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  await destroySession()
  return NextResponse.redirect(new URL('/', request.nextUrl.origin), { status: 303 })
}
