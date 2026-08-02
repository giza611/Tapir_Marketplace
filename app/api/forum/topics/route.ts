import { NextResponse, type NextRequest } from 'next/server'

import { getSession } from '@/lib/auth'
import { createDiscussion, fetchCategories, fetchRepositoryId } from '@/lib/discussions'
import { REPO_NAME, REPO_OWNER } from '@/lib/site'

export const dynamic = 'force-dynamic'

const TITLE_MIN = 8
const TITLE_MAX = 120
const BODY_MIN = 20
const BODY_MAX = 20_000

/**
 * Starts a forum topic as the signed-in user.
 *
 * The discussion is created with THAT USER's GitHub token, exactly like
 * publishing a listing. The site holds no credential that could post on its
 * own, so every topic is attributable to a real account and GitHub's own spam
 * and abuse handling applies — which is why there is no rate limiter here.
 * There is nowhere to keep a counter, and none is needed.
 */
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Sign in to start a topic.' }, { status: 401 })
  }

  let body: { title?: string; body?: string; categoryId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 })
  }

  const title = (body.title ?? '').trim()
  const content = (body.body ?? '').trim()
  const categoryId = (body.categoryId ?? '').trim()

  if (title.length < TITLE_MIN || title.length > TITLE_MAX) {
    return NextResponse.json(
      { error: `Give the topic a title between ${TITLE_MIN} and ${TITLE_MAX} characters.` },
      { status: 422 },
    )
  }
  if (content.length < BODY_MIN || content.length > BODY_MAX) {
    return NextResponse.json(
      { error: `Write at least ${BODY_MIN} characters so people know what you are asking.` },
      { status: 422 },
    )
  }
  if (!categoryId) {
    return NextResponse.json({ error: 'Pick a category.' }, { status: 422 })
  }

  try {
    // Confirm the category belongs to this repository rather than trusting an
    // ID from the request — otherwise a crafted payload could file a topic in
    // some other repo the user can write to.
    const categories = await fetchCategories(session.token, REPO_OWNER, REPO_NAME)
    if (!categories.some((category) => category.id === categoryId)) {
      return NextResponse.json({ error: 'That category does not exist.' }, { status: 422 })
    }

    const repositoryId = await fetchRepositoryId(session.token, REPO_OWNER, REPO_NAME)
    const discussion = await createDiscussion(
      session.token,
      repositoryId,
      categoryId,
      title,
      content,
    )

    // The forum index is a static file refreshed daily, so a new topic will not
    // appear in the list until the next run. Nudge a rebuild when a deploy hook
    // is configured; the thread itself is readable immediately either way.
    const hook = process.env.VERCEL_DEPLOY_HOOK
    if (hook) {
      fetch(hook, { method: 'POST' }).catch(() => {
        // Best effort. A missed rebuild only delays the index, never the thread.
      })
    }

    return NextResponse.json({ ok: true, ...discussion })
  } catch (error) {
    const message = (error as Error).message
    console.error(`[forum] createDiscussion failed: ${message}`)
    return NextResponse.json({ error: `Could not post this topic: ${message}` }, { status: 502 })
  }
}

/** Categories for the compose form. */
export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Sign in to start a topic.' }, { status: 401 })
  }

  try {
    const categories = await fetchCategories(session.token, REPO_OWNER, REPO_NAME)
    return NextResponse.json(
      { categories },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 })
  }
}
