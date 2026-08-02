/**
 * The merge gatekeeper.
 *
 * Nobody maintains this marketplace, so this script stands in for the
 * maintainer who would otherwise review every pull request. It runs in CI on
 * every PR and decides whether a submission may be merged automatically.
 *
 * It is also runnable locally against the whole catalogue:
 *
 *   npx tsx scripts/validate-listings.ts
 *
 * and in CI against just the PR's changed listings:
 *
 *   npx tsx scripts/validate-listings.ts \
 *     --root .pr-content --base-root . \
 *     --slugs my-script --pr-author octocat
 *
 * SECURITY: `--root` points at content downloaded from an untrusted fork. This
 * script only ever *reads* those files as data. It must never import, execute,
 * or shell out to anything under `--root`.
 */

import fs from 'node:fs'
import path from 'node:path'

import { LIMITS, validateListing, type Listing } from '../lib/schema'

type Options = {
  root: string
  baseRoot: string | null
  slugs: string[] | null
  prAuthor: string | null
}

function parseArgs(argv: string[]): Options {
  const options: Options = { root: process.cwd(), baseRoot: null, slugs: null, prAuthor: null }

  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i]
    const value = argv[i + 1]
    switch (flag) {
      case '--root':
        options.root = path.resolve(value)
        i += 1
        break
      case '--base-root':
        options.baseRoot = path.resolve(value)
        i += 1
        break
      case '--slugs':
        options.slugs = value.split(',').map((s) => s.trim()).filter(Boolean)
        i += 1
        break
      case '--pr-author':
        options.prAuthor = value
        i += 1
        break
      default:
        if (flag.startsWith('--')) {
          throw new Error(`Unknown flag: ${flag}`)
        }
    }
  }
  return options
}

function directorySize(dir: string): number {
  let total = 0
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) total += directorySize(full)
    else if (entry.isFile()) total += fs.statSync(full).size
  }
  return total
}

function readListingFile(root: string, slug: string): Listing | null {
  const jsonPath = path.join(root, 'listings', slug, 'listing.json')
  if (!fs.existsSync(jsonPath)) return null
  try {
    const parsed = validateListing(JSON.parse(fs.readFileSync(jsonPath, 'utf8')))
    return parsed.ok ? parsed.listing : null
  } catch {
    return null
  }
}

/** Validates one listing folder. Returns human-readable errors for a contributor. */
function validateListingFolder(root: string, slug: string): string[] {
  const errors: string[] = []
  const dir = path.join(root, 'listings', slug)

  if (!fs.existsSync(dir)) {
    // A deletion. The ownership check still applies, but there is nothing to validate.
    return errors
  }

  const jsonPath = path.join(dir, 'listing.json')
  if (!fs.existsSync(jsonPath)) {
    errors.push(`listings/${slug}/listing.json is missing.`)
    return errors
  }

  let raw: unknown
  try {
    raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
  } catch (error) {
    errors.push(`listings/${slug}/listing.json is not valid JSON: ${(error as Error).message}`)
    return errors
  }

  const result = validateListing(raw)
  if (!result.ok) {
    for (const issue of result.errors) errors.push(`listings/${slug}/listing.json — ${issue}`)
    return errors
  }

  const listing = result.listing

  if (listing.slug !== slug) {
    errors.push(
      `listings/${slug}/listing.json declares slug "${listing.slug}" but sits in folder "${slug}". They must match.`,
    )
  }

  if (!fs.existsSync(path.join(dir, 'README.md'))) {
    errors.push(`listings/${slug}/README.md is missing. Every listing needs a description.`)
  }

  // Screenshots must actually exist, and stay small — this repo is the database
  // and git keeps every version of a binary forever.
  for (const relative of listing.media) {
    const mediaPath = path.join(dir, relative)
    if (!fs.existsSync(mediaPath)) {
      errors.push(`listings/${slug}/${relative} is referenced in media[] but was not committed.`)
      continue
    }
    const { size } = fs.statSync(mediaPath)
    if (size > LIMITS.maxImageBytes) {
      errors.push(
        `listings/${slug}/${relative} is ${Math.round(size / 1024)} KB. The limit is ${Math.round(
          LIMITS.maxImageBytes / 1024,
        )} KB — please compress it.`,
      )
    }
  }

  // Anything in the folder that is neither metadata, description, nor a
  // declared screenshot. Catches stray binaries and executables.
  const declared = new Set(['listing.json', 'README.md', ...listing.media.map((m) => m.split('/')[0])])
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!declared.has(entry.name)) {
      errors.push(
        `listings/${slug}/${entry.name} is not allowed. A listing folder may contain only listing.json, README.md and a media/ folder.`,
      )
    }
  }

  const mediaDir = path.join(dir, 'media')
  if (fs.existsSync(mediaDir)) {
    const declaredMedia = new Set(listing.media.map((m) => path.basename(m)))
    for (const entry of fs.readdirSync(mediaDir, { withFileTypes: true })) {
      if (!entry.isFile()) {
        errors.push(`listings/${slug}/media/${entry.name} — media/ may only contain image files.`)
      } else if (!declaredMedia.has(entry.name)) {
        errors.push(
          `listings/${slug}/media/${entry.name} is committed but not listed in media[]. Add it or remove it.`,
        )
      }
    }
  }

  const totalSize = directorySize(dir)
  if (totalSize > LIMITS.maxListingBytes) {
    errors.push(
      `listings/${slug}/ totals ${Math.round(totalSize / 1024)} KB. The limit is ${Math.round(
        LIMITS.maxListingBytes / 1024,
      )} KB.`,
    )
  }

  return errors
}

/**
 * The ownership rule. This is what replaces row-level security in a database:
 * a contributor may only create or change listings that are their own.
 */
function checkOwnership(options: Options, slug: string): string[] {
  const { prAuthor, baseRoot, root } = options
  if (!prAuthor) return []

  const errors: string[] = []
  const author = prAuthor.toLowerCase()

  const existing = baseRoot ? readListingFile(baseRoot, slug) : null
  const submitted = readListingFile(root, slug)

  if (existing) {
    // Editing or deleting something already published — must be the owner.
    if (existing.authorGithub.toLowerCase() !== author) {
      errors.push(
        `listings/${slug} belongs to @${existing.authorGithub}. Only they can change it. ` +
          `If you want to contribute an improvement, open an issue on the listing instead.`,
      )
    }
    // Ownership cannot be reassigned through an ordinary edit.
    if (submitted && submitted.authorGithub.toLowerCase() !== existing.authorGithub.toLowerCase()) {
      errors.push(
        `listings/${slug} tries to change authorGithub from @${existing.authorGithub} to ` +
          `@${submitted.authorGithub}. Transferring a listing needs a maintainer.`,
      )
    }
  } else if (submitted) {
    // A brand new listing — you may only publish under your own name.
    if (submitted.authorGithub.toLowerCase() !== author) {
      errors.push(
        `listings/${slug} sets authorGithub to @${submitted.authorGithub}, but this pull request ` +
          `is from @${prAuthor}. Set authorGithub to your own GitHub username.`,
      )
    }
  }

  return errors
}

function main() {
  const options = parseArgs(process.argv.slice(2))

  const listingsDir = path.join(options.root, 'listings')
  const slugs =
    options.slugs ??
    (fs.existsSync(listingsDir)
      ? fs
          .readdirSync(listingsDir, { withFileTypes: true })
          .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
          .map((entry) => entry.name)
      : [])

  if (slugs.length === 0) {
    console.log('No listings to validate.')
    return
  }

  const allErrors: string[] = []
  for (const slug of slugs) {
    allErrors.push(...checkOwnership(options, slug))
    allErrors.push(...validateListingFolder(options.root, slug))
  }

  if (allErrors.length > 0) {
    console.error(`\nValidation failed with ${allErrors.length} problem(s):\n`)
    for (const error of allErrors) console.error(`  - ${error}`)
    console.error('')
    process.exit(1)
  }

  console.log(`Validated ${slugs.length} listing(s): ${slugs.join(', ')}`)
}

main()
