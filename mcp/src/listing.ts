import { statSync } from 'node:fs'
import { basename } from 'node:path'

import { LIMITS, validateListing, type Listing } from '../../lib/schema'
import { MarketplaceError } from './config'
import type { CatalogueEntry } from './catalogue'

/**
 * Turning what a model passed in into something CI will accept.
 *
 * Validation itself is not reimplemented here — `validateListing` from
 * `lib/schema.ts` is the same function the dashboard and the CI gatekeeper
 * call, so a listing this server accepts is one the repository accepts. What
 * this module adds is the few fields a caller should not be choosing.
 */

export type ListingInput = Record<string, unknown>

/** Matches the dashboard's rule for a screenshot filename. */
const IMAGE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*\.(?:png|jpe?g|webp|gif)$/i

/**
 * Stand-in used only when validating before sign-in, so a listing is not
 * reported as broken over a field the publish step fills in anyway.
 */
export const PLACEHOLDER_AUTHOR = 'author-to-be-filled-in'

export function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export type Screenshot = { name: string; path: string }

/**
 * Reads the screenshots off disk and checks them against the repository's
 * limits before anything is committed — the same checks the publish API makes,
 * applied here so the failure arrives in the tool result rather than in CI.
 */
export function resolveScreenshots(screenshots: Screenshot[]): { name: string; path: string }[] {
  if (screenshots.length > LIMITS.maxScreenshots) {
    throw new MarketplaceError(
      `At most ${LIMITS.maxScreenshots} screenshots per listing; ${screenshots.length} were given.`,
    )
  }

  const seen = new Set<string>()

  return screenshots.map((shot) => {
    const name = shot.name.trim() || basename(shot.path)

    if (!IMAGE_NAME.test(name)) {
      throw new MarketplaceError(
        `"${name}" is not an allowed screenshot filename. Use letters, digits, dots, dashes or ` +
          'underscores, ending in .png, .jpg, .jpeg, .webp or .gif.',
      )
    }
    if (seen.has(name.toLowerCase())) {
      throw new MarketplaceError(`Two screenshots are both called "${name}".`)
    }
    seen.add(name.toLowerCase())

    let size: number
    try {
      size = statSync(shot.path).size
    } catch {
      throw new MarketplaceError(`Cannot read the screenshot at ${shot.path}.`)
    }
    if (size > LIMITS.maxImageBytes) {
      throw new MarketplaceError(
        `${name} is ${Math.round(size / 1024)} KB. The limit is ` +
          `${Math.round(LIMITS.maxImageBytes / 1024)} KB per screenshot.`,
      )
    }

    return { name, path: shot.path }
  })
}

export type Assembled = {
  candidate: ListingInput
  /** Screenshot paths to remove, because the new media set no longer lists them. */
  droppedMedia: string[]
}

/**
 * Fills in the fields a caller has no business choosing and derives the media
 * list from the screenshots actually being committed.
 *
 * `authorGithub` is overwritten rather than validated. It is the ownership key
 * CI compares against the pull request author, so letting a caller set it
 * would mean a listing submitted in somebody else's name — rejected by CI, but
 * better refused before it becomes a pull request at all.
 */
export function assemble(
  input: ListingInput,
  options: {
    authorGithub: string
    existing?: CatalogueEntry | null
    /** Screenshot filenames being committed, or undefined to keep what is published. */
    screenshotNames?: string[]
  },
): Assembled {
  const existing = options.existing ?? null

  const media =
    options.screenshotNames !== undefined
      ? options.screenshotNames.map((name) => `media/${name}`)
      : ((input.media as string[] | undefined) ?? existing?.media ?? [])

  const candidate: ListingInput = {
    ...input,
    authorGithub: options.authorGithub,
    media,
    // What is published wins: "first published" is a fact about the past, not
    // a field a later submission gets to restate.
    createdAt: existing?.createdAt ?? input.createdAt ?? today(),
    // Always now: this submission is the update.
    updatedAt: today(),
  }

  const droppedMedia = (existing?.media ?? []).filter((item) => !media.includes(item))

  return { candidate, droppedMedia }
}

export type Checked = { ok: true; listing: Listing } | { ok: false; report: string }

/**
 * Runs the repository's own validator and renders the failures the way CI
 * renders them, so a caller fixing them is reading the same words a
 * contributor would see on their pull request.
 */
export function check(candidate: ListingInput): Checked {
  const result = validateListing(candidate)
  if (result.ok) return { ok: true, listing: result.listing }

  return {
    ok: false,
    report: [
      `This listing is not valid yet — ${result.errors.length} problem${
        result.errors.length === 1 ? '' : 's'
      } to fix:`,
      '',
      ...result.errors.map((error) => `  - ${error}`),
    ].join('\n'),
  }
}
