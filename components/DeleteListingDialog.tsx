'use client'

import { Loader2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { formatCount } from '@/lib/format'
import type { ResolvedListing } from '@/lib/schema'

/**
 * Confirms removing a listing.
 *
 * The handoff asks for a dialog that names the script and warns about existing
 * downloads, and both matter here: a deletion is a pull request that merges
 * itself, so there is no maintainer downstream to catch a mistake. The name
 * must be read, not glanced at, and anyone who already downloaded the script
 * keeps their copy.
 */
export function DeleteListingDialog({
  listing,
  onCancel,
  onDeleted,
}: {
  listing: ResolvedListing
  onCancel: () => void
  onDeleted: (pullRequestUrl: string) => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    // Focus the safe action, not the destructive one.
    cancelRef.current?.focus()

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy) onCancel()
    }
    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [busy, onCancel])

  async function onConfirm() {
    setBusy(true)
    setError(null)
    try {
      const response = await fetch('/api/listings/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', listing: { slug: listing.slug } }),
      })
      const payload = await response.json()
      if (!response.ok) {
        setError(payload.error ?? 'Could not remove this listing.')
        setBusy(false)
        return
      }
      onDeleted(payload.pullRequestUrl)
    } catch (cause) {
      setError((cause as Error).message)
      setBusy(false)
    }
  }

  return (
    <div
      className="dialog-backdrop"
      onClick={() => {
        if (!busy) onCancel()
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-title"
        aria-describedby="delete-body"
        className="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="delete-title" className="dialog-title">
          Remove {listing.name}?
        </h2>

        <div id="delete-body" className="dialog-body">
          <p>
            This removes <strong className="text-text">{listing.name}</strong>{' '}
            {listing.versions.length === 1
              ? 'and its only version'
              : `and all ${listing.versions.length} of its versions`}{' '}
            from the marketplace.
          </p>
          <p className="mt-2">
            It has been downloaded {formatCount(listing.stats.downloads)}{' '}
            {listing.stats.downloads === 1 ? 'time' : 'times'}. Anyone who already has it keeps
            their copy, and any link pointing at this page will stop working.
          </p>
          <p className="mt-2">
            The listing is deleted by a pull request from your account, so the history stays in the
            repository and it can be restored later if this was a mistake.
          </p>
        </div>

        {error && (
          <p className="border border-accent bg-accent-subtle px-3 py-2 text-[12px] text-accent-800">
            {error}
          </p>
        )}

        <div className="dialog-actions">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="btn btn-secondary btn-centered"
          >
            Keep it
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="btn btn-primary btn-centered"
          >
            {busy && <Loader2 size={14} aria-hidden className="animate-spin" />}
            {busy ? 'Removing…' : 'Remove listing'}
          </button>
        </div>
      </div>
    </div>
  )
}
