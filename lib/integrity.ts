/**
 * Download integrity, trust-on-first-use.
 *
 * The marketplace accepts a download link on any host. What makes that safe
 * enough to auto-merge is not vetting the host — it is watching the file.
 *
 * The daily job fetches every published download, hashes it, and records the
 * result here. On the first sighting the hash is simply accepted (the same
 * model SSH uses for host keys). On every later run it is compared. If the
 * bytes behind a published version change, that is the bait-and-switch attack:
 * pass review with a clean file, replace it afterwards. The listing is flagged
 * and its download hidden until the author publishes a genuine new version.
 *
 * A host allowlist could never have caught this, because it checked where a
 * file lived rather than what it was.
 */

export type IntegrityStatus =
  /** Never successfully fetched, so nothing is known about it yet. */
  | 'unverified'
  /** Hash matches the one recorded when this version was first seen. */
  | 'verified'
  /** The bytes changed under a published version. Treated as hostile. */
  | 'drifted'
  /** Fetch failed repeatedly — dead link, private repo, or an outage. */
  | 'unreachable'

export type IntegrityRecord = {
  /** The URL the hash belongs to. Changing it for a published version is drift. */
  url: string
  sha256: string
  /** ISO date the version was first successfully hashed. */
  firstSeen: string
  lastVerified: string
  status: IntegrityStatus
  /** Present when status is 'drifted' or 'unreachable'. */
  note?: string
}

/** Keyed `<slug>@<version>` so each published version is tracked separately. */
export type IntegrityIndex = Record<string, IntegrityRecord>

export function integrityKey(slug: string, version: string): string {
  return `${slug}@${version}`
}

/**
 * Whether a version may be offered for download.
 *
 * Unverified passes: a brand new listing has not been through the daily job
 * yet, and refusing to serve it for up to a day would make publishing feel
 * broken. Drift and unreachable both block, because both mean the file a
 * visitor would receive is not the file that was published.
 */
export function isDownloadable(record: IntegrityRecord | undefined): boolean {
  if (!record) return true
  return record.status === 'verified' || record.status === 'unverified'
}

export function integrityNotice(record: IntegrityRecord | undefined): string | null {
  if (!record) return null
  switch (record.status) {
    case 'drifted':
      return 'The file behind this version changed after it was published. Downloads are disabled until the author publishes a new version.'
    case 'unreachable':
      return 'This download could not be reached when it was last checked. The link may be broken or the file may have been removed.'
    default:
      return null
  }
}
