'use client'

import { X } from 'lucide-react'
import { useEffect, useState } from 'react'

import { mediaUrl } from '@/lib/media'

/**
 * Hero image with a thumbnail strip below it, per the handoff: thumbnails swap
 * the hero in place, and clicking the hero opens a lightbox.
 *
 * Note these are NOT wrapped in the design system's grayscale treatment. That
 * rule is written for photography; these are Archicad interface captures where
 * desaturating destroys colour-coded model elements and property values — the
 * exact information someone is checking before they download. Add
 * `grayscale-print` to the img classes to reverse that decision.
 */
export function ScreenshotGallery({ slug, media }: { slug: string; media: string[] }) {
  const [active, setActive] = useState(0)
  const [lightbox, setLightbox] = useState(false)

  useEffect(() => {
    if (!lightbox) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setLightbox(false)
    }
    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [lightbox])

  if (media.length === 0) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setLightbox(true)}
        aria-label="Open screenshot full size"
        className="block w-full border border-border bg-surface-2"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- local files, size-capped by CI */}
        <img
          src={mediaUrl(slug, media[active])}
          alt=""
          className="h-[300px] w-full object-cover"
        />
      </button>

      {media.length > 1 && (
        <div className="mt-2.5 flex flex-wrap gap-2.5">
          {media.map((item, index) => (
            <button
              key={item}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`Show screenshot ${index + 1}`}
              aria-pressed={index === active}
              className={
                index === active
                  ? 'border border-accent'
                  : 'border border-border hover:border-border-strong'
              }
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- local files, size-capped by CI */}
              <img
                src={mediaUrl(slug, item)}
                alt=""
                loading="lazy"
                className="h-[66px] w-[110px] object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {lightbox && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Screenshot"
          onClick={() => setLightbox(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'color-mix(in srgb, var(--color-neutral-900) 80%, transparent)' }}
        >
          <button
            type="button"
            onClick={() => setLightbox(false)}
            aria-label="Close"
            className="btn btn-icon absolute right-4 top-4 bg-bg"
          >
            <X size={16} aria-hidden />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element -- local files, size-capped by CI */}
          <img
            src={mediaUrl(slug, media[active])}
            alt=""
            onClick={(event) => event.stopPropagation()}
            className="max-h-full max-w-full object-contain"
          />
        </div>
      )}
    </>
  )
}
