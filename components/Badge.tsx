import clsx from 'clsx'

type BadgeProps = {
  children: React.ReactNode
  tone?: 'neutral' | 'accent' | 'highlight' | 'outline'
  className?: string
  title?: string
}

const TONES: Record<NonNullable<BadgeProps['tone']>, string> = {
  neutral: 'bg-surface-2 text-text-muted border-border',
  accent: 'bg-accent-subtle text-accent border-accent-border',
  highlight: 'bg-highlight-subtle text-highlight border-highlight-border',
  outline: 'bg-transparent text-text-subtle border-border',
}

export function Badge({ children, tone = 'neutral', className, title }: BadgeProps) {
  return (
    <span
      title={title}
      className={clsx(
        'inline-flex items-center gap-1 rounded-pill border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

/**
 * Archicad compatibility, rendered as "AC 27, 28".
 *
 * This is the first thing an architect checks and the most common reason a
 * download is wasted, so it earns a dedicated component and a spot on the card
 * rather than being buried in the detail page.
 */
export function ArchicadBadge({ versions }: { versions: string[] }) {
  if (versions.length === 0) return null
  return (
    <Badge tone="outline" title={`Works with Archicad ${versions.join(', ')}`}>
      AC {versions.join(', ')}
    </Badge>
  )
}
