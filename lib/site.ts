/**
 * Central configuration. Anything a future maintainer might need to change
 * when they take the project over lives here or in an environment variable —
 * never hardcoded across component files.
 */

/**
 * Reads an environment variable, stripping a byte-order mark and surrounding
 * whitespace.
 *
 * Not paranoia — this cost a failed production build. Piping a value into
 * `vercel env add` from PowerShell stores it as `﻿<value>\r\n`, and the
 * damage is silent: a contaminated giscus ID just makes comments quietly stop
 * working, while a contaminated URL blows up `new URL()` at build time. Anyone
 * pasting a value into a dashboard field can introduce the same thing.
 */
function clean(raw: string | undefined): string | undefined {
  if (raw === undefined) return undefined
  const cleaned = raw.replace(/^﻿/, '').trim()
  return cleaned.length > 0 ? cleaned : undefined
}

/*
 * CRITICAL: every NEXT_PUBLIC_ variable below must be read as a STATIC literal
 * property — `process.env.NEXT_PUBLIC_FOO`, never `process.env[name]`.
 *
 * The bundler inlines these by textually substituting the literal expression.
 * A computed key cannot be matched, so it survives into the browser bundle as
 * a lookup on an empty object and silently evaluates to undefined. An earlier
 * version of this file used a helper taking the name as a string, which made
 * every public value work server-side and vanish client-side — giscus rendered
 * correctly in the HTML and then reported itself unconfigured after hydration.
 */
export const REPO_OWNER = clean(process.env.NEXT_PUBLIC_REPO_OWNER) ?? 'giza611'
export const REPO_NAME = clean(process.env.NEXT_PUBLIC_REPO_NAME) ?? 'Tapir_Marketplace'
export const REPO_SLUG = `${REPO_OWNER}/${REPO_NAME}`
export const REPO_URL = `https://github.com/${REPO_SLUG}`

export const SITE = {
  /** The wordmark. Capitalised this way on purpose: tAPIr contains "API". */
  name: 'tAPIr',
  fullName: 'tAPIr Scripts Marketplace',
  tagline: 'scripts and add-ons, shared by the Archicad community',
  description:
    'A community marketplace for Tapir scripts and Archicad add-ons. Browse, download and discuss automation tools built by architects and developers.',
  url: clean(process.env.NEXT_PUBLIC_SITE_URL) ?? 'https://tapir-marketplace.vercel.app',
} as const

/** Upstream project this marketplace serves. */
export const TAPIR = {
  repoUrl: 'https://github.com/ENZYME-APD/tapir-archicad-automation',
  docsUrl: 'https://enzyme-apd.github.io/tapir-archicad-automation/archicad-addon/',
} as const

/**
 * giscus turns GitHub Discussions into the comment system and the forum.
 * These IDs come from https://giscus.app after Discussions is enabled on the
 * repo. Without them the comment sections render a setup notice instead of
 * failing — a half-configured deploy should degrade, not break.
 */
export const GISCUS = {
  repo: clean(process.env.NEXT_PUBLIC_GISCUS_REPO) ?? REPO_SLUG,
  repoId: clean(process.env.NEXT_PUBLIC_GISCUS_REPO_ID) ?? '',
  // Defaults to General because GitHub creates it automatically and discussion
  // categories cannot be created through the API — only in the web UI. A
  // dedicated "Listings" category is tidier but would make setup a manual step.
  category: clean(process.env.NEXT_PUBLIC_GISCUS_CATEGORY) ?? 'General',
  categoryId: clean(process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID) ?? '',
} as const

export const isGiscusConfigured = Boolean(GISCUS.repoId && GISCUS.categoryId)

/**
 * Absolute URL of the custom giscus theme in public/giscus.css.
 *
 * giscus loads this inside its own iframe, so it has to be a public https URL —
 * a localhost path cannot be fetched from an https iframe. Development
 * therefore points at the deployed stylesheet, which is fine because the theme
 * changes far less often than the code around it.
 */
export const GISCUS_THEME_URL = `${
  SITE.url.startsWith('https://') ? SITE.url : 'https://tapir-marketplace.vercel.app'
}/giscus.css`

/** Deep link to GitHub's new-discussion form, used by the forum's compose button. */
export function newDiscussionUrl(category?: string): string {
  const base = `${REPO_URL}/discussions/new`
  return category ? `${base}?category=${encodeURIComponent(category)}` : `${base}/choose`
}

export const NAV_LINKS = [
  { href: '/', label: 'Browse' },
  { href: '/forum', label: 'Forum' },
  { href: '/submit', label: 'Publish' },
] as const
