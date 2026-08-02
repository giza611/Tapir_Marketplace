/**
 * Turns a contributor's video link into an embeddable player URL.
 *
 * Only YouTube and Vimeo are accepted — the schema enforces that separately in
 * ALLOWED_VIDEO_HOSTS. This module never builds an embed URL from an arbitrary
 * host, because an iframe runs third-party script inside our page.
 *
 * YouTube uses the nocookie domain, which does not set tracking cookies until
 * playback actually begins. Combined with the click-to-play facade in
 * VideoEmbed, that means a visitor who never presses play makes no request to
 * Google at all — which is why this site needs no cookie banner.
 */

export type ParsedVideo = {
  provider: 'youtube' | 'vimeo'
  id: string
  embedUrl: string
  watchUrl: string
  providerLabel: string
}

const YOUTUBE_ID = /^[A-Za-z0-9_-]{6,20}$/
const VIMEO_ID = /^\d{6,12}$/

export function parseVideo(raw: string | undefined): ParsedVideo | null {
  if (!raw) return null

  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }
  if (url.protocol !== 'https:') return null

  const host = url.hostname.replace(/^www\./, '')
  const segments = url.pathname.split('/').filter(Boolean)

  if (host === 'youtu.be') {
    const id = segments[0]
    return id && YOUTUBE_ID.test(id) ? youtube(id) : null
  }

  if (host === 'youtube.com' || host === 'youtube-nocookie.com' || host === 'm.youtube.com') {
    const fromQuery = url.searchParams.get('v')
    if (fromQuery && YOUTUBE_ID.test(fromQuery)) return youtube(fromQuery)

    // /embed/<id> and /shorts/<id>
    const index = segments.findIndex((part) => part === 'embed' || part === 'shorts')
    const id = index >= 0 ? segments[index + 1] : undefined
    return id && YOUTUBE_ID.test(id) ? youtube(id) : null
  }

  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    // Covers vimeo.com/<id>, vimeo.com/channels/<name>/<id>
    // and player.vimeo.com/video/<id>.
    const id = [...segments].reverse().find((part) => VIMEO_ID.test(part))
    return id ? vimeo(id) : null
  }

  return null
}

function youtube(id: string): ParsedVideo {
  return {
    provider: 'youtube',
    id,
    // `autoplay=1` is safe here: the iframe is only inserted after a click, so
    // playback never starts without the visitor asking for it.
    embedUrl: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`,
    watchUrl: `https://www.youtube.com/watch?v=${id}`,
    providerLabel: 'YouTube',
  }
}

function vimeo(id: string): ParsedVideo {
  return {
    provider: 'vimeo',
    id,
    embedUrl: `https://player.vimeo.com/video/${id}?autoplay=1`,
    watchUrl: `https://vimeo.com/${id}`,
    providerLabel: 'Vimeo',
  }
}
