import { z } from 'zod'

import type { IntegrityRecord } from './integrity'

/**
 * The contract for `listings/<slug>/listing.json`.
 *
 * This file is the single source of truth. It is consumed by three callers:
 *   1. the contributor dashboard, for live form validation
 *   2. `scripts/validate-listings.ts`, run by CI as the merge gatekeeper
 *   3. `lib/listings.ts`, at build time, to type the static catalogue
 *
 * Because CI enforces it on every pull request, any field added here becomes a
 * hard requirement for new submissions the moment it is marked required. Add
 * new fields as `.optional()` first, backfill the existing listings, and only
 * then tighten — otherwise every open PR breaks at once.
 */

// ---------------------------------------------------------------------------
// Taxonomy
// ---------------------------------------------------------------------------

export const CATEGORIES = [
  'documentation-layouts',
  'element-data-properties',
  'modeling-geometry',
  'zones-areas',
  'import-export',
  'quality-assurance',
  'quantities-scheduling',
  'libraries-objects',
  'navigator-views',
  'classification-attributes',
  'batch-automation',
  'utilities',
] as const

export type Category = (typeof CATEGORIES)[number]

export const CATEGORY_LABELS: Record<Category, string> = {
  'documentation-layouts': 'Documentation & Layouts',
  'element-data-properties': 'Element Data & Properties',
  'modeling-geometry': 'Modeling & Geometry',
  'zones-areas': 'Zones & Areas',
  'import-export': 'Import / Export',
  'quality-assurance': 'Quality Assurance & Model Checking',
  'quantities-scheduling': 'Quantities & Scheduling',
  'libraries-objects': 'Libraries & Objects',
  'navigator-views': 'Navigator & Views',
  'classification-attributes': 'Classification & Attributes',
  'batch-automation': 'Batch Automation',
  utilities: 'Utilities',
}

export const CATEGORY_DESCRIPTIONS: Record<Category, string> = {
  'documentation-layouts': 'Publishing, layout books, drawing placement and title blocks.',
  'element-data-properties': 'Reading and writing element properties, parameters and IDs.',
  'modeling-geometry': 'Creating, moving and transforming model elements.',
  'zones-areas': 'Zone creation, area calculation and room data.',
  'import-export': 'Moving data between Archicad and IFC, Excel, CSV or JSON.',
  'quality-assurance': 'Model checking, validation rules and issue reporting.',
  'quantities-scheduling': 'Take-offs, schedules and quantity extraction.',
  'libraries-objects': 'Library parts, GDL objects and library management.',
  'navigator-views': 'Views, view maps, renovation filters and navigator items.',
  'classification-attributes': 'Classifications, layers, pens, materials and other attributes.',
  'batch-automation': 'Multi-file and multi-instance batch operations.',
  utilities: 'General-purpose helpers that do not fit elsewhere.',
}

export const LISTING_TYPES = ['python-script', 'addon', 'tool', 'snippet-collection'] as const
export type ListingType = (typeof LISTING_TYPES)[number]

export const LISTING_TYPE_LABELS: Record<ListingType, string> = {
  'python-script': 'Python script',
  addon: 'Add-On',
  tool: 'Tool',
  'snippet-collection': 'Snippet collection',
}

/**
 * SPDX identifiers. `Proprietary` is not SPDX but is needed for closed-source
 * add-ons that are still distributed through the marketplace.
 */
export const LICENSES = [
  'MIT',
  'Apache-2.0',
  'GPL-3.0-only',
  'GPL-2.0-only',
  'LGPL-3.0-only',
  'MPL-2.0',
  'BSD-3-Clause',
  'BSD-2-Clause',
  'Unlicense',
  'CC0-1.0',
  'CC-BY-4.0',
  'CC-BY-SA-4.0',
  'CC-BY-NC-4.0',
  'Proprietary',
] as const
export type License = (typeof LICENSES)[number]

export const PRICING_MODELS = ['free', 'donation', 'paid'] as const
export type PricingModel = (typeof PRICING_MODELS)[number]

// ---------------------------------------------------------------------------
// Limits — mirrored by CI so the dashboard and the gatekeeper never disagree
// ---------------------------------------------------------------------------

export const LIMITS = {
  summaryMaxLength: 200,
  nameMaxLength: 80,
  maxTags: 10,
  maxScreenshots: 6,
  maxVersions: 50,
  /** Per screenshot. Keeps the repo from becoming a binary graveyard. */
  maxImageBytes: 500 * 1024,
  /** Total of all files in one listing folder. */
  maxListingBytes: 3 * 1024 * 1024,
} as const

/**
 * `downloadUrl` is the highest-risk field on the site: people run what they
 * download, inside their production Archicad.
 *
 * This used to be restricted to an allowlist of GitHub and GitLab hosts. That
 * was dropped, because it turned away authors who host their own work while
 * providing far less protection than it appeared to — anyone can put a
 * malicious file in a free GitHub release, and nothing checked the file itself.
 * A listing could pass review pointing at a clean asset and be swapped for a
 * malicious one the next day, on any host.
 *
 * What replaced it is integrity monitoring (see lib/integrity.ts): the daily
 * job records a SHA-256 of every download on first sight and re-verifies it.
 * If a file changes without a new version being published, the listing is
 * flagged and its download hidden. That catches the swap attack the allowlist
 * never could, and it works regardless of where the file is hosted.
 *
 * What remains here is basic transport sanity.
 */
function isPlausibleDownloadUrl(raw: string): boolean {
  try {
    const { protocol, hostname } = new URL(raw)
    if (protocol !== 'https:') return false
    // A download nobody outside the author's machine can reach.
    if (hostname === 'localhost' || hostname.endsWith('.localhost')) return false
    // Bare IP literals: no accountable owner, and usually a mistake.
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return false
    if (hostname.includes(':')) return false
    return hostname.includes('.')
  } catch {
    return false
  }
}

export const ALLOWED_VIDEO_HOSTS = [
  'youtube.com',
  'www.youtube.com',
  'youtu.be',
  'vimeo.com',
  'player.vimeo.com',
] as const

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const VERSION_PATTERN = /^\d+\.\d+(?:\.\d+)?(?:-[0-9A-Za-z.-]+)?$/
const MEDIA_PATH_PATTERN = /^media\/[A-Za-z0-9][A-Za-z0-9._-]*\.(?:png|jpe?g|webp|gif)$/i
/** Archicad major versions 20-39. Deliberately a range, not an enum, so the
 *  schema does not go stale the year Graphisoft ships the next release. */
const ARCHICAD_VERSION_PATTERN = /^(?:2\d|3\d)$/

function hostAllowed(raw: string, allowed: readonly string[]): boolean {
  try {
    const { hostname, protocol } = new URL(raw)
    if (protocol !== 'https:') return false
    return allowed.includes(hostname)
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

export const socialSchema = z
  .object({
    linkedin: z.url().optional(),
    x: z.url().optional(),
    youtube: z.url().optional(),
    instagram: z.url().optional(),
    facebook: z.url().optional(),
  })
  .strict()

export const authorSchema = z
  .object({
    name: z.string().min(1).max(120),
    company: z.string().max(120).optional(),
    email: z.email().optional(),
    website: z.url().optional(),
    social: socialSchema.optional(),
  })
  .strict()

export const versionSchema = z
  .object({
    version: z
      .string()
      .regex(VERSION_PATTERN, 'Use a numeric version such as 1.0 or 2.3.1'),
    releasedAt: z.iso.date('Use an ISO date, e.g. 2026-04-17'),
    changelog: z.string().max(2000).optional(),
    downloadUrl: z
      .url()
      .refine(
        isPlausibleDownloadUrl,
        'downloadUrl must be a public https link (not http, localhost or a bare IP address)',
      ),
    /** Archicad majors this version is known to work with, e.g. ["27","28"]. */
    archicadVersions: z
      .array(z.string().regex(ARCHICAD_VERSION_PATTERN, 'Use a major version number, e.g. "28"'))
      .min(1)
      .max(20),
    /** Minimum Tapir add-on version required, if the script depends on one. */
    minTapirVersion: z.string().regex(VERSION_PATTERN).optional(),
  })
  .strict()

export const pricingSchema = z
  .object({
    model: z.enum(PRICING_MODELS),
    /**
     * The author's own payment or donation page. The marketplace never
     * processes a transaction — it only renders a link.
     */
    url: z.url().optional(),
    note: z.string().max(200).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.model !== 'free' && !value.url) {
      ctx.addIssue({
        code: 'custom',
        path: ['url'],
        message: `pricing.url is required when pricing.model is "${value.model}"`,
      })
    }
    if (value.model === 'free' && value.url) {
      ctx.addIssue({
        code: 'custom',
        path: ['url'],
        message: 'pricing.url must be omitted when pricing.model is "free"',
      })
    }
  })

export const listingSchema = z
  .object({
    /** Must equal the containing folder name. CI enforces this separately. */
    slug: z.string().regex(SLUG_PATTERN, 'Use lowercase words separated by hyphens'),
    name: z.string().min(2).max(LIMITS.nameMaxLength),
    /** One-line blurb shown on the marketplace card. */
    summary: z.string().min(10).max(LIMITS.summaryMaxLength),
    category: z.enum(CATEGORIES),
    type: z.enum(LISTING_TYPES),
    tags: z.array(z.string().min(1).max(30)).max(LIMITS.maxTags).default([]),

    author: authorSchema,
    /**
     * Ownership key. CI compares this against the GitHub login that opened the
     * pull request; a mismatch is what stops one contributor editing another's
     * listing. This is the row-level security of a database, expressed in CI.
     */
    authorGithub: z
      .string()
      .regex(/^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/, 'Not a valid GitHub username'),

    /** Newest first is NOT assumed; the loader sorts by releasedAt. */
    versions: z.array(versionSchema).min(1).max(LIMITS.maxVersions),

    /** Repo-relative screenshot paths, e.g. "media/overview.png". */
    media: z
      .array(z.string().regex(MEDIA_PATH_PATTERN, 'Screenshots must live in media/ as png/jpg/webp/gif'))
      .max(LIMITS.maxScreenshots)
      .default([]),
    videoUrl: z
      .url()
      .refine(
        (u) => hostAllowed(u, ALLOWED_VIDEO_HOSTS),
        'videoUrl must be an https YouTube or Vimeo link',
      )
      .optional(),

    /** Where the source lives, if it is open. */
    repositoryUrl: z.url().optional(),
    /** Project homepage or documentation, if separate from the repository. */
    homepageUrl: z.url().optional(),

    license: z.enum(LICENSES),
    pricing: pricingSchema,

    createdAt: z.iso.date(),
    updatedAt: z.iso.date(),
  })
  .strict()
  .superRefine((value, ctx) => {
    const seen = new Set<string>()
    for (const [index, entry] of value.versions.entries()) {
      if (seen.has(entry.version)) {
        ctx.addIssue({
          code: 'custom',
          path: ['versions', index, 'version'],
          message: `Duplicate version "${entry.version}"`,
        })
      }
      seen.add(entry.version)
    }
    if (value.updatedAt < value.createdAt) {
      ctx.addIssue({
        code: 'custom',
        path: ['updatedAt'],
        message: 'updatedAt cannot be earlier than createdAt',
      })
    }
  })

export type Listing = z.infer<typeof listingSchema>
export type ListingVersion = z.infer<typeof versionSchema>
export type ListingAuthor = z.infer<typeof authorSchema>

/**
 * A listing plus everything derived at build time. `Listing` is what lives on
 * disk; `ResolvedListing` is what the UI renders.
 */
export type ResolvedListing = Listing & {
  /** Rendered from the listing folder's README.md. */
  readme: string
  /** Highest `releasedAt`, precomputed for sorting and the download button. */
  latestVersion: ListingVersion
  /** Union of every version's Archicad support, for filtering. */
  supportedArchicadVersions: string[]
  /** Populated by scripts/refresh-stats.ts; zero until it first runs. */
  stats: ListingStats
  /**
   * Download integrity per version string, from lib/integrity.generated.json.
   * Empty until the daily job has seen this listing. See lib/integrity.ts.
   */
  integrity: Record<string, IntegrityRecord>
}

export type ListingStats = {
  downloads: number
  reactions: number
  commentCount: number
}

export const EMPTY_STATS: ListingStats = { downloads: 0, reactions: 0, commentCount: 0 }

// ---------------------------------------------------------------------------
// Validation helper shared by CI and the dashboard
// ---------------------------------------------------------------------------

/**
 * Strips a UTF-8 byte-order mark.
 *
 * `JSON.parse` throws on a leading BOM, and plenty of Windows tooling — Notepad,
 * PowerShell's `Set-Content -Encoding utf8`, some editors' "UTF-8" default —
 * writes one without telling you. This audience works in Archicad on Windows,
 * so refusing those files would mean a stream of submissions failing with
 * "Unexpected token" and no clue why. Accept it and move on.
 */
export function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
}

/** Parses listing JSON text, tolerating a BOM. Throws on genuinely bad JSON. */
export function parseListingJson(text: string): unknown {
  return JSON.parse(stripBom(text))
}

export type ValidationResult =
  | { ok: true; listing: Listing }
  | { ok: false; errors: string[] }

/**
 * Parses unknown JSON into a Listing, returning flat human-readable errors.
 * CI prints these straight into the pull request comment, so they are written
 * for a contributor who has never seen this repository.
 */
export function validateListing(data: unknown): ValidationResult {
  const result = listingSchema.safeParse(data)
  if (result.success) return { ok: true, listing: result.data }

  const errors = result.error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join('.') : '(root)'
    return `${path}: ${issue.message}`
  })
  return { ok: false, errors }
}

/** Sorts versions newest-first by release date, falling back to array order. */
export function sortVersions(versions: ListingVersion[]): ListingVersion[] {
  return [...versions].sort((a, b) => b.releasedAt.localeCompare(a.releasedAt))
}
