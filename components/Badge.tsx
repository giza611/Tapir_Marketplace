import clsx from 'clsx'

import { archicadRange } from '@/components/ListingCard'

type BadgeProps = {
  children: React.ReactNode
  tone?: 'neutral' | 'accent' | 'highlight' | 'outline'
  className?: string
  title?: string
}

/**
 * Thin wrapper over the design system's `.tag`. Kept as a component so tone
 * names stay stable across the app while the underlying classes come from
 * globals.css rather than being re-invented per usage.
 */
const TONES: Record<NonNullable<BadgeProps['tone']>, string> = {
  neutral: 'tag-neutral',
  accent: 'tag-accent',
  highlight: 'tag-outline',
  outline: 'tag-quiet',
}

export function Badge({ children, tone = 'neutral', className, title }: BadgeProps) {
  return (
    <span title={title} className={clsx('tag', TONES[tone], className)}>
      {children}
    </span>
  )
}

/**
 * Archicad compatibility, rendered as "AC 26-28".
 *
 * This is the first thing an architect checks and the most common reason a
 * download is wasted, so it earns a dedicated component and a spot on the card
 * rather than being buried in the detail page.
 */
export function ArchicadBadge({ versions }: { versions: string[] }) {
  if (versions.length === 0) return null
  return (
    <Badge tone="outline" title={`Works with Archicad ${versions.join(', ')}`}>
      {archicadRange(versions)}
    </Badge>
  )
}
