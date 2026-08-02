import Link from 'next/link'

/**
 * The poster band: a full-bleed accent field closing the page, with a
 * display-grade statement flush left and a ground-coloured button.
 *
 * The design system allows exactly one of these per page — it is the single
 * place the accent runs as a field rather than as small emphasis, and a second
 * one would spend the impact of the first.
 */
export function PosterBand({
  statement,
  action,
  href,
}: {
  statement: string
  action: string
  href: string
}) {
  return (
    <section className="mt-16 bg-accent">
      <div className="mx-auto flex max-w-[1180px] flex-col gap-6 px-6 py-14 lg:flex-row lg:items-center lg:justify-between">
        <p className="max-w-[20ch] font-heading text-[38px] leading-[1.05] tracking-[-0.02em] text-accent-fg">
          {statement}
        </p>
        <Link
          href={href}
          className="btn btn-centered shrink-0 bg-bg text-text hover:bg-neutral-100"
        >
          {action}
        </Link>
      </div>
    </section>
  )
}
