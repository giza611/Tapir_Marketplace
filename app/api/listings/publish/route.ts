import { NextResponse, type NextRequest } from 'next/server'

import { getSession } from '@/lib/auth'
import {
  branchName,
  commitToFork,
  ensureFork,
  openPullRequest,
  type FileChange,
} from '@/lib/github'
import { getListing } from '@/lib/listings'
import { LIMITS, validateListing } from '@/lib/schema'
import { REPO_SLUG } from '@/lib/site'

export const dynamic = 'force-dynamic'

type UploadedImage = { name: string; base64: string }

type PublishBody = {
  action: 'save' | 'delete'
  listing: Record<string, unknown>
  readme?: string
  /** New screenshots, base64-encoded. Existing ones are referenced by path. */
  images?: UploadedImage[]
  /** Previously committed screenshots the author removed in this edit. */
  removedMedia?: string[]
}

const IMAGE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*\.(?:png|jpe?g|webp|gif)$/i

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Sign in to publish.' }, { status: 401 })
  }

  let body: PublishBody
  try {
    body = (await request.json()) as PublishBody
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 })
  }

  const slug = typeof body.listing?.slug === 'string' ? body.listing.slug : ''
  if (!slug) {
    return NextResponse.json({ error: 'A listing slug is required.' }, { status: 400 })
  }

  // Ownership is decided here, from the session — never from the request body.
  // CI checks it again on the pull request; this is the first of two gates and
  // exists so contributors get an immediate, readable error instead of a
  // failed check minutes later.
  const existing = getListing(slug)
  if (existing && existing.authorGithub.toLowerCase() !== session.login.toLowerCase()) {
    return NextResponse.json(
      { error: `"${slug}" belongs to @${existing.authorGithub}.` },
      { status: 403 },
    )
  }

  const changes: FileChange[] = []
  let title: string
  let summary: string

  if (body.action === 'delete') {
    if (!existing) {
      return NextResponse.json({ error: 'That listing does not exist.' }, { status: 404 })
    }
    changes.push(
      { path: `listings/${slug}/listing.json`, content: null },
      { path: `listings/${slug}/README.md`, content: null },
      ...existing.media.map((item) => ({ path: `listings/${slug}/${item}`, content: null })),
    )
    title = `Remove ${existing.name}`
    summary = `@${session.login} is removing their listing \`${slug}\`.`
  } else {
    // Force authorship to the signed-in user so nobody can publish as someone
    // else by editing the payload.
    const candidate = { ...body.listing, authorGithub: session.login }

    const result = validateListing(candidate)
    if (!result.ok) {
      return NextResponse.json(
        { error: 'This listing is not valid yet.', details: result.errors },
        { status: 422 },
      )
    }
    const listing = result.listing

    if (listing.slug !== slug) {
      return NextResponse.json({ error: 'Slug mismatch.' }, { status: 400 })
    }

    const images = body.images ?? []
    if (images.length > LIMITS.maxScreenshots) {
      return NextResponse.json(
        { error: `At most ${LIMITS.maxScreenshots} screenshots.` },
        { status: 422 },
      )
    }

    for (const image of images) {
      if (!IMAGE_NAME.test(image.name)) {
        return NextResponse.json(
          { error: `"${image.name}" is not an allowed image filename.` },
          { status: 422 },
        )
      }
      // base64 inflates by ~4/3; compare against decoded size.
      const bytes = Math.floor((image.base64.length * 3) / 4)
      if (bytes > LIMITS.maxImageBytes) {
        return NextResponse.json(
          {
            error: `"${image.name}" is ${Math.round(bytes / 1024)} KB. The limit is ${Math.round(
              LIMITS.maxImageBytes / 1024,
            )} KB.`,
          },
          { status: 422 },
        )
      }
    }

    changes.push(
      {
        path: `listings/${slug}/listing.json`,
        content: `${JSON.stringify(listing, null, 2)}\n`,
      },
      {
        path: `listings/${slug}/README.md`,
        content: body.readme?.trim() ? `${body.readme.trim()}\n` : `# ${listing.name}\n`,
      },
      ...images.map((image) => ({
        path: `listings/${slug}/media/${image.name}`,
        content: image.base64,
        encoding: 'base64' as const,
      })),
    )

    // A screenshot dropped from media[] must also leave the repository. CI
    // rejects any file in media/ that the listing does not declare, so leaving
    // the blob behind would block the author's own submission.
    const removed = (body.removedMedia ?? []).filter(
      (item) => existing?.media.includes(item) && !listing.media.includes(item),
    )
    for (const item of removed) {
      changes.push({ path: `listings/${slug}/${item}`, content: null })
    }

    title = existing ? `Update ${listing.name}` : `Add ${listing.name}`
    summary = existing
      ? `@${session.login} is updating their listing \`${slug}\`.`
      : `@${session.login} is publishing a new listing, \`${slug}\`.`
  }

  try {
    await ensureFork(session.token, session.login)

    const branch = branchName(slug)
    await commitToFork(session.token, session.login, branch, title, changes)

    const pull = await openPullRequest(
      session.token,
      session.login,
      branch,
      title,
      [
        summary,
        '',
        'Submitted through the marketplace dashboard.',
        '',
        `Automated checks run against \`${REPO_SLUG}\`; if they pass, this merges on its own.`,
      ].join('\n'),
    )

    return NextResponse.json({ ok: true, ...pull })
  } catch (error) {
    const message = (error as Error).message
    console.error(`[publish] ${slug}: ${message}`)
    return NextResponse.json(
      { error: `Could not submit this listing: ${message}` },
      { status: 502 },
    )
  }
}
