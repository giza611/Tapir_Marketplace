import { getAllListings } from './listings'
import type { ListingAuthor, ResolvedListing } from './schema'

/**
 * Contributor profiles, derived entirely from the listings.
 *
 * There is no user table — a "contributor" is simply everyone who appears as
 * `authorGithub` on at least one listing. That falls out of the architecture:
 * publishing a listing is the only way to become an author, so the listings
 * already are the membership list.
 *
 * Avatars come from `https://github.com/<login>.png`, a stable redirect that
 * needs no API call and no token.
 */

export type AuthorProfile = {
  login: string
  /** Details from the author's most recently updated listing. */
  profile: ListingAuthor
  listings: ResolvedListing[]
  totalDownloads: number
  totalReactions: number
  avatarUrl: string
}

export function getAuthorLogins(): string[] {
  return [...new Set(getAllListings().map((listing) => listing.authorGithub.toLowerCase()))]
}

export function getAuthor(login: string): AuthorProfile | undefined {
  const target = login.toLowerCase()
  const listings = getAllListings().filter(
    (listing) => listing.authorGithub.toLowerCase() === target,
  )
  if (listings.length === 0) return undefined

  // An author's details can differ slightly between listings if they changed
  // company or added a bio later. The most recently updated one wins.
  const newest = [...listings].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]

  return {
    login: newest.authorGithub,
    profile: newest.author,
    listings: [...listings].sort((a, b) =>
      b.latestVersion.releasedAt.localeCompare(a.latestVersion.releasedAt),
    ),
    totalDownloads: listings.reduce((total, listing) => total + listing.stats.downloads, 0),
    totalReactions: listings.reduce((total, listing) => total + listing.stats.reactions, 0),
    avatarUrl: `https://github.com/${newest.authorGithub}.png?size=160`,
  }
}
