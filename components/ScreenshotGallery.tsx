'use client'

import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { mediaUrl } from '@/lib/media'

/**
 * Hero image with a thumbnail strip below it. Thumbnails swap the hero in
 * place, arrows step through, and clicking the hero opens a lightbox.
 *
 * Left/right keys work in the lightbox and whenever the gallery has focus, so
 * a set of screenshots can be read without touching the mouse.
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

  const total = media.length
  const step = useCallback(
    (delta: number) => {
      // Wrap around so the strip never dead-ends at either edge.
      setActive((current) => (current + delta + total) % total)
    },
    [total],
  )

  useEffect(() => {
    if (!lightbox) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setLightbox(false)
      if (event.key === 'ArrowLeft') step(-1)
      if (event.key === 'ArrowRight') step(1)
    }
    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [lightbox, step])

  if (total === 0) return null

  const multiple = total > 1

  return (
    <>
      <div
        className="relative"
        role="group"
        aria-roledescription="carousel"
        aria-label="Screenshots"
        onKeyDown={(event) => {
          if (!multiple) return
          if (event.key === 'ArrowLeft') {
            event.preventDefault()
            step(-1)
          }
          if (event.key === 'ArrowRight') {
            event.preventDefault()
            step(1)
          }
        }}
      >
        <button
          type="button"
          onClick={() => setLightbox(true)}
          aria-label={`Open screenshot ${active + 1} of ${total} full size`}
          className="block w-full border border-border bg-surface-2"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- local files, size-capped by CI */}
          <img
            src={mediaUrl(slug, media[active])}
            alt=""
            className="h-[300px] w-full object-cover"
          />
        </button>

        {multiple && (
          <>
            <ArrowButton side="left" onClick={() => step(-1)} label="Previous screenshot" />
            <ArrowButton side="right" onClick={() => step(1)} label="Next screenshot" />
            <p
              aria-live="polite"
              className="absolute bottom-2 right-2 bg-bg px-2 py-0.5 text-[10.5px] text-text-muted"
            >
              {active + 1} / {total}
            </p>
          </>
        )}
      </div>

      {multiple && (
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
          aria-label={`Screenshot ${active + 1} of ${total}`}
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

          {multiple && (
            <>
              <ArrowButton
                side="left"
                onClick={() => step(-1)}
                label="Previous screenshot"
                stopPropagation
              />
              <ArrowButton
                side="right"
                onClick={() => step(1)}
                label="Next screenshot"
                stopPropagation
              />
            </>
          )}

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

function ArrowButton({
  side,
  onClick,
  label,
  stopPropagation,
}: {
  side: 'left' | 'right'
  onClick: () => void
  label: string
  stopPropagation?: boolean
}) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight
  return (
    <button
      type="button"
      aria-label={label}
      onClick={(event) => {
        if (stopPropagation) event.stopPropagation()
        onClick()
      }}
      className={[
        'btn btn-icon absolute top-1/2 -translate-y-1/2 border border-border bg-bg',
        side === 'left' ? 'left-2' : 'right-2',
      ].join(' ')}
    >
      <Icon size={16} aria-hidden />
    </button>
  )
}
