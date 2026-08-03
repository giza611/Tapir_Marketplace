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
export function VideoEmbed({ video, title }: { video: ParsedVideo; title: string }) {
  const [playing, setPlaying] = useState(false)

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

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setPlaying(true)}
        className="group flex aspect-video w-full flex-col items-center justify-center gap-3 border border-border bg-surface-2 transition-colors hover:border-border-strong"
        aria-label={`Play the video for ${title} from ${video.providerLabel}`}
      >
        <span className="flex h-12 w-12 items-center justify-center bg-accent text-accent-fg transition-colors group-hover:bg-accent-hover">
          <Play size={20} aria-hidden fill="currentColor" />
        </span>
        <span className="text-[11px] text-text-muted">
          Play video · loads from {video.providerLabel}
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
