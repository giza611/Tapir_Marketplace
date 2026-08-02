'use client'

import { AlertCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import type { DiscussionCategory } from '@/lib/discussions'

const TITLE_MAX = 120

export function NewTopicForm({ login }: { login: string }) {
  const router = useRouter()

  const [categories, setCategories] = useState<DiscussionCategory[] | null>(null)
  const [categoryId, setCategoryId] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/forum/topics')
      .then(async (response) => {
        if (!response.ok) throw new Error((await response.json()).error ?? 'Could not load')
        return response.json() as Promise<{ categories: DiscussionCategory[] }>
      })
      .then(({ categories: list }) => {
        setCategories(list)
        // Prefer a general-purpose category; Announcements is usually
        // maintainer-only and would fail on submit.
        const preferred =
          list.find((c) => c.name.toLowerCase() === 'general') ??
          list.find((c) => !c.name.toLowerCase().includes('announce')) ??
          list[0]
        if (preferred) setCategoryId(preferred.id)
      })
      .catch((cause: Error) => setError(cause.message))
  }, [])

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)

    try {
      const response = await fetch('/api/forum/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, categoryId }),
      })
      const payload = await response.json()

      if (!response.ok) {
        setError(payload.error ?? 'Something went wrong.')
        setBusy(false)
        return
      }
      // Straight to the thread, which renders the real discussion.
      router.push(`/forum/${payload.number}`)
    } catch (cause) {
      setError((cause as Error).message)
      setBusy(false)
    }
  }

  const selected = categories?.find((category) => category.id === categoryId)

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-5">
      {error && (
        <div className="border border-accent bg-accent-subtle p-4">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-accent-800">
            <AlertCircle size={15} aria-hidden />
            {error}
          </p>
        </div>
      )}

      <div className="field">
        <label htmlFor="topic-category">Category</label>
        {categories === null ? (
          <div className="h-9 border border-border bg-surface" aria-label="Loading categories" />
        ) : (
          <select
            id="topic-category"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            className="input"
            required
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.emoji} {category.name}
              </option>
            ))}
          </select>
        )}
        {selected?.description && (
          <p className="mt-1 text-[11px] text-text-muted">{selected.description}</p>
        )}
      </div>

      <div className="field">
        <label htmlFor="topic-title">Title</label>
        <input
          id="topic-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={TITLE_MAX}
          minLength={8}
          required
          className="input"
          placeholder="Zone areas differ between the schedule and the script output"
        />
        <p className="mt-1 text-[11px] text-text-subtle">
          {title.length}/{TITLE_MAX} — a specific title gets a specific answer.
        </p>
      </div>

      <div className="field">
        <label htmlFor="topic-body">Message</label>
        <textarea
          id="topic-body"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={10}
          minLength={20}
          required
          className="input font-mono text-[13px]"
          placeholder={
            'What are you trying to do, what happened instead, and which Archicad and Tapir versions are you on?\n\nMarkdown works, including ``` code blocks.'
          }
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
        <button type="submit" disabled={busy || !categoryId} className="btn btn-primary btn-centered">
          {busy && <Loader2 size={14} aria-hidden className="animate-spin" />}
          {busy ? 'Posting…' : 'Post topic'}
        </button>
        <Link href="/forum" className="btn btn-secondary btn-centered">
          Cancel
        </Link>
        <p className="text-[11px] text-text-muted">
          Posted to GitHub Discussions as @{login}.
        </p>
      </div>
    </form>
  )
}
