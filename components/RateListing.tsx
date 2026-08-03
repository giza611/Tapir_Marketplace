'use client'

import { Loader2, Star } from 'lucide-react'
import { useEffect, useState } from 'react'

import { formatCount } from '@/lib/format'

type State = { signedIn: boolean; upvotes: number; viewerHasVoted: boolean }

/**
 * The vote control.
 *
 * A vote is a THUMBS_UP reaction on the listing's discussion, added with the
 * voter's own GitHub token, so it is one per account and reversible. The count
 * shown initially comes from the static build; once we know who is looking, it
 * is replaced with a live figure that also tells us whether they have voted.
 */
export function RateListing({ slug, initialCount }: { slug: string; initialCount: number }) {
  const [state, setState] = useState<State>({
    signedIn: false,
    upvotes: initialCount,
    viewerHasVoted: false,
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/listings/${slug}/rate`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled || !data?.signedIn) return
        setState({
          signedIn: true,
          upvotes: data.upvotes,
          viewerHasVoted: data.viewerHasVoted,
        })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [slug])

  async function toggle() {
    if (!state.signedIn) {
      window.location.href = '/api/auth/login'
      return
    }

    const next = !state.viewerHasVoted
    setBusy(true)
    setError(null)
    // Optimistic: the count is the thing being clicked, so it should move now.
    setState((current) => ({
      ...current,
      viewerHasVoted: next,
      upvotes: Math.max(0, current.upvotes + (next ? 1 : -1)),
    }))

    try {
      const response = await fetch(`/api/listings/${slug}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voted: next }),
      })
      const payload = await response.json()
      if (!response.ok) {
        // Put it back the way it was.
        setState((current) => ({
          ...current,
          viewerHasVoted: !next,
          upvotes: Math.max(0, current.upvotes + (next ? -1 : 1)),
        }))
        setError(payload.error ?? 'Could not record your vote.')
      } else {
        setState({ signedIn: true, upvotes: payload.upvotes, viewerHasVoted: payload.viewerHasVoted })
      }
    } catch (cause) {
      setState((current) => ({
        ...current,
        viewerHasVoted: !next,
        upvotes: Math.max(0, current.upvotes + (next ? -1 : 1)),
      }))
      setError((cause as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-pressed={state.viewerHasVoted}
        className={[
          'btn btn-block btn-centered',
          state.viewerHasVoted ? 'btn-primary' : 'btn-secondary',
        ].join(' ')}
      >
        {busy ? (
          <Loader2 size={14} aria-hidden className="animate-spin" />
        ) : (
          <Star size={14} aria-hidden fill={state.viewerHasVoted ? 'currentColor' : 'none'} />
        )}
        {state.viewerHasVoted ? 'Voted' : 'Vote for this'}
        <span className="ml-auto tabular-nums">{formatCount(state.upvotes)}</span>
      </button>

      <p className="mt-2 text-[10.5px] leading-relaxed text-text-muted">
        {state.signedIn
          ? 'One vote per GitHub account. Click again to take it back.'
          : 'Sign in with GitHub to vote. Votes are public reactions on the discussion thread.'}
      </p>

      {error && <p className="mt-1.5 text-[10.5px] text-accent-800">{error}</p>}
    </div>
  )
}
