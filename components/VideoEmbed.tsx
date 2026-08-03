'use client'

import { ExternalLink, Play } from 'lucide-react'
import { useState } from 'react'

import type { ParsedVideo } from '@/lib/video'

/**
 * A click-to-play facade in front of the real player.
 *
 * The iframe is not rendered until the visitor presses play. Until then the
 * page makes no request to YouTube or Vimeo at all — no third-party script, no
 * cookies, and no weight on a page most visitors are reading rather than
 * watching. It is also why the site needs no consent banner.
 */
export function VideoEmbed({
  video,
  title,
  fallbackPoster,
}: {
  video: ParsedVideo
  title: string
  /** The listing's first screenshot, used when the provider has no thumbnail. */
  fallbackPoster?: string
}) {
  const [playing, setPlaying] = useState(false)
  // maxresdefault does not exist for every upload, so fall back on error.
  const [posterError, setPosterError] = useState(false)

  if (playing) {
    return (
      <div className="aspect-video w-full border border-border bg-surface-2">
        <iframe
          src={video.embedUrl}
          title={`${title} video`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="h-full w-full"
        />
      </div>
    )
  }

  // Real video frame where the provider exposes one, otherwise the listing's
  // own first screenshot, otherwise the flat panel.
  const poster = posterError ? video.posterFallback : (video.poster ?? fallbackPoster)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setPlaying(true)}
        className="group relative flex aspect-video w-full items-center justify-center overflow-hidden border border-border bg-surface-2 transition-colors hover:border-border-strong"
        aria-label={`Play the video for ${title} from ${video.providerLabel}`}
      >
        {poster && (
          // A remote poster frame. next/image would proxy it through the
          // optimiser and add a remotePatterns entry for no real gain.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={poster}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setPosterError(true)}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}

        <span className="relative flex flex-col items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center bg-accent text-accent-fg shadow-sm transition-colors group-hover:bg-accent-hover">
            <Play size={20} aria-hidden fill="currentColor" />
          </span>
          <span
            className={[
              'px-2 py-0.5 text-[11px]',
              poster ? 'bg-bg text-text' : 'text-text-muted',
            ].join(' ')}
          >
            Play video · loads from {video.providerLabel}
          </span>
        </span>
      </button>

      <a
        href={video.watchUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-text-muted hover:text-accent"
      >
        <ExternalLink size={11} aria-hidden />
        Watch on {video.providerLabel} instead
      </a>
    </div>
  )
}
