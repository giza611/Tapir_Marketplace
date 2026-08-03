'use client'

import { Loader2, Star } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { formatCount } from '@/lib/format'

type State = { signedIn: boolean; upvotes: number; viewerHasVoted: boolean }

/**
 * The vote control.
 *
 * A vote is a THUMBS_UP reaction on the listing's discussion, added with the
 * voter's own GitHub token, so it is one per account and reversible. The count
 * shown initially comes from the static build; once we know who is looking, it
 * is replaced with a live figure that also says whether they have voted.
 */
export function RateListing({ slug, initialCount }: { slug: string; initialCount: number }) {
  const [state, setState] = useState<State>({
    signedIn: false,
    upvotes: initialCount,
    viewerHasVoted: false,
  })
  // False until the session check answers. The button stays disabled meanwhile
  // so a click can never be swallowed before we know who is looking.
  const [known, setKnown] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = useCallback(
    async (next: boolean) => {
      setBusy(true)
      setError(null)
      // Optimistic: the count is the thing being clicked, so it should move now.
      setState((current) => ({
        ...current,
        viewerHasVoted: next,
        upvotes: Math.max(0, current.upvotes + (next ? 1 : -1)),
      }))

      const revert = () =>
        setState((current) => ({
          ...current,
          viewerHasVoted: !next,
          upvotes: Math.max(0, current.upvotes + (next ? -1 : 1)),
        }))

      try {
        const response = await fetch(`/api/listings/${slug}/rate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ voted: next }),
        })
        const payload = await response.json()
        if (!response.ok) {
          revert()
          setError(payload.error ?? 'Could not record your vote.')
        } else {
          setState({
            signedIn: true,
            upvotes: payload.upvotes,
            viewerHasVoted: payload.viewerHasVoted,
          })
        }
      } catch (cause) {
        revert()
        setError((cause as Error).message)
      } finally {
        setBusy(false)
      }
    },
    [slug],
  )

  useEffect(() => {
    let cancelled = false
    fetch(`/api/listings/${slug}/rate`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled) return
        setKnown(true)
        if (!data?.signedIn) return

        setState({ signedIn: true, upvotes: data.upvotes, viewerHasVoted: data.viewerHasVoted })

        // Resume a vote started before signing in. The design brief asks for
        // exactly this: an unauthenticated click opens sign-in and the action
        // completes afterwards, rather than being quietly dropped.
        const params = new URLSearchParams(window.location.search)
        if (params.get('vote') === '1') {
          if (!data.viewerHasVoted) void submit(true)
          params.delete('vote')
          const query = params.toString()
          window.history.replaceState(
            null,
            '',
            window.location.pathname + (query ? `?${query}` : ''),
          )
        }
      })
      .catch(() => setKnown(true))

    return () => {
      cancelled = true
    }
  }, [slug, submit])

  function onClick() {
    if (!state.signedIn) {
      // Come back to this listing and finish the vote, instead of landing on
      // the dashboard with nothing recorded.
      const target = `${window.location.pathname}?vote=1`
      window.location.href = `/api/auth/login?return=${encodeURIComponent(target)}`
      return
    }
    void submit(!state.viewerHasVoted)
  }

  const label = !known
    ? 'Votes'
    : !state.signedIn
      ? 'Sign in to vote'
      : state.viewerHasVoted
        ? 'Voted'
        : 'Vote for this'

  return (
    <div>
      <button
        type="button"
        onClick={onClick}
        disabled={busy || !known}
        aria-pressed={state.signedIn ? state.viewerHasVoted : undefined}
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
        {/* The label states what the click will actually do. Showing "Vote for
            this" to a signed-out visitor promises something the click cannot
            deliver, which is how a vote appeared to go missing. */}
        {label}
        <span className="ml-auto tabular-nums">{formatCount(state.upvotes)}</span>
      </button>

      <p className="mt-2 text-[10.5px] leading-relaxed text-text-muted">
        {state.signedIn
          ? 'One vote per GitHub account. Click again to take it back.'
          : 'Voting signs you in with GitHub and then records your vote. Votes are public reactions on the discussion thread.'}
      </p>

      {state.signedIn && state.viewerHasVoted && (
        <p className="mt-1.5 text-[10.5px] leading-relaxed text-text-subtle">
          Counted here straight away. The browse grid updates within the hour.
        </p>
      )}

      {error && <p className="mt-1.5 text-[10.5px] text-accent-800">{error}</p>}
    </div>
  )
}
