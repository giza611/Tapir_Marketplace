import { NextResponse, type NextRequest } from 'next/server'

import { getSession } from '@/lib/auth'
import {
  createListingDiscussion,
  fetchRepositoryId,
  fetchVoteState,
  getDiscussions,
  setVote,
} from '@/lib/discussions'
import { getListing } from '@/lib/listings'
import { GISCUS, REPO_NAME, REPO_OWNER, SITE } from '@/lib/site'

export const dynamic = 'force-dynamic'

/**
 * One vote per GitHub account on a listing, stored as a THUMBS_UP reaction on
 * that listing's discussion thread.
 *
 * The reaction is added with the voter's own token, so GitHub enforces
 * one-per-account and handles the abuse problem. There is no vote table here
 * because there is no database, and none is needed: the reaction IS the record.
 *
 * This is why the site shows a vote count rather than a five-star average. An
 * average needs each person's score kept somewhere; a reaction only needs
 * GitHub to remember who reacted, which it already does.
 */
async function resolveDiscussionNumber(slug: string): Promise<number | null> {
  const { discussions } = await getDiscussions()
  return discussions.find((d) => d.listingSlug === slug)?.number ?? null
}

export async function GET(_request: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  const session = await getSession()
  if (!session) return NextResponse.json({ signedIn: false }, { headers: { 'Cache-Control': 'no-store' } })

  const number = await resolveDiscussionNumber(slug)
  if (number === null) {
    // No thread yet, so nobody has voted. Voting will create it.
    return NextResponse.json(
      { signedIn: true, upvotes: 0, viewerHasVoted: false },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  }

  try {
    const state = await fetchVoteState(session.token, REPO_OWNER, REPO_NAME, number)
    return NextResponse.json(
      {
        signedIn: true,
        upvotes: state?.upvotes ?? 0,
        viewerHasVoted: state?.viewerHasVoted ?? false,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 })
  }
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params

  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Sign in to vote.' }, { status: 401 })
  }

  const listing = getListing(slug)
  if (!listing) {
    return NextResponse.json({ error: 'That listing does not exist.' }, { status: 404 })
  }

  let voted: boolean
  try {
    voted = Boolean((await request.json()).voted)
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 })
  }

  try {
    const number = await resolveDiscussionNumber(slug)
    let discussionId: string | null = null

    if (number !== null) {
      discussionId = (await fetchVoteState(session.token, REPO_OWNER, REPO_NAME, number))
        ?.discussionId ?? null
    }

    if (!discussionId) {
      if (!voted) {
        // Removing a vote from a thread that does not exist is a no-op.
        return NextResponse.json({ ok: true, upvotes: 0, viewerHasVoted: false })
      }
      if (!GISCUS.categoryId) {
        return NextResponse.json(
          { error: 'Discussions are not configured for this site.' },
          { status: 503 },
        )
      }
      // First vote on this listing creates the thread the comments will use.
      const repositoryId = await fetchRepositoryId(session.token, REPO_OWNER, REPO_NAME)
      const created = await createListingDiscussion(
        session.token,
        repositoryId,
        GISCUS.categoryId,
        `listing:${slug}`,
        listing.name,
        `${SITE.url}/scripts/${slug}`,
      )
      discussionId = created.id
    }

    const upvotes = await setVote(session.token, discussionId, voted)
    return NextResponse.json({ ok: true, upvotes, viewerHasVoted: voted })
  } catch (error) {
    const message = (error as Error).message
    console.error(`[rate] ${slug}: ${message}`)
    return NextResponse.json({ error: `Could not record your vote: ${message}` }, { status: 502 })
  }
}
