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
function env(name: string): string | undefined {
  const raw = process.env[name]
  if (raw === undefined) return undefined
  const cleaned = raw.replace(/^﻿/, '').trim()
  return cleaned.length > 0 ? cleaned : undefined
}

export const REPO_OWNER = env('NEXT_PUBLIC_REPO_OWNER') ?? 'giza611'
export const REPO_NAME = env('NEXT_PUBLIC_REPO_NAME') ?? 'Tapir_Marketplace'
export const REPO_SLUG = `${REPO_OWNER}/${REPO_NAME}`
export const REPO_URL = `https://github.com/${REPO_SLUG}`

export const SITE = {
  /** The wordmark. Capitalised this way on purpose: tAPIr contains "API". */
  name: 'tAPIr',
  fullName: 'tAPIr Scripts Marketplace',
  tagline: 'scripts and add-ons, shared by the Archicad community',
  description:
    'A community marketplace for Tapir scripts and Archicad add-ons. Browse, download and discuss automation tools built by architects and developers.',
  url: env('NEXT_PUBLIC_SITE_URL') ?? 'https://tapir-marketplace.vercel.app',
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
  repo: env('NEXT_PUBLIC_GISCUS_REPO') ?? REPO_SLUG,
  repoId: env('NEXT_PUBLIC_GISCUS_REPO_ID') ?? '',
  // Defaults to General because GitHub creates it automatically and discussion
  // categories cannot be created through the API — only in the web UI. A
  // dedicated "Listings" category is tidier but would make setup a manual step.
  category: env('NEXT_PUBLIC_GISCUS_CATEGORY') ?? 'General',
  categoryId: env('NEXT_PUBLIC_GISCUS_CATEGORY_ID') ?? '',
} as const

export const isGiscusConfigured = Boolean(GISCUS.repoId && GISCUS.categoryId)

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
