/**
 * Client-safe media helpers.
 *
 * Deliberately separate from `lib/listings.ts`. That module reads the
 * filesystem, so anything importing from it drags `node:fs` into whatever
 * bundle it lands in — and Turbopack fails the build outright when a Client
 * Component ends up requesting a Node built-in.
 *
 * Keep this file free of Node imports.
 */

/** Public URL for a screenshot, after `scripts/sync-media.mjs` has copied it. */
export function mediaUrl(slug: string, relativePath: string): string {
  return `/listings/${slug}/${relativePath}`
}
