'use client'

import { X } from 'lucide-react'
import { useEffect, useState } from 'react'

import { mediaUrl } from '@/lib/media'

export function ScreenshotGallery({ slug, media }: { slug: string; media: string[] }) {
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    if (!expanded) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setExpanded(null)
    }
    document.addEventListener('keydown', onKeyDown)
    // Stop the page behind the lightbox from scrolling under it.
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [expanded])

  if (media.length === 0) return null

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {media.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setExpanded(item)}
            className="group overflow-hidden rounded-lg border border-border bg-surface-2"
            aria-label={`Enlarge screenshot ${item.split('/').pop()}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- local, size-capped by CI */}
            <img
              src={mediaUrl(slug, item)}
              alt=""
              loading="lazy"
              className="aspect-[4/3] w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
            />
          </button>
        ))}
      </div>

      {expanded && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Screenshot"
          onClick={() => setExpanded(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        >
          <button
            type="button"
            onClick={() => setExpanded(null)}
            aria-label="Close"
            className="absolute right-4 top-4 rounded-lg bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
          >
            <X size={18} aria-hidden />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element -- local, size-capped by CI */}
          <img
            src={mediaUrl(slug, expanded)}
            alt=""
            onClick={(event) => event.stopPropagation()}
            className="max-h-full max-w-full rounded-lg object-contain"
          />
        </div>
      )}
    </>
  )
}
