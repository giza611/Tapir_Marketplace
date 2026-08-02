import Link from 'next/link'

import { REPO_URL, SITE, TAPIR } from '@/lib/site'

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t-2 border-border-strong">
      <div className="mx-auto grid max-w-[1180px] gap-8 px-6 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <p className="font-heading text-[15px]">{SITE.fullName}</p>
          <p className="mt-2 max-w-sm text-[11.5px] leading-relaxed text-text-muted">
            Every listing here lives as a file in a public repository, so the whole marketplace can
            be forked, audited or handed on.
          </p>
        </div>

        <nav aria-label="Marketplace">
          <p className="label-kicker">Marketplace</p>
          <ul className="mt-3 space-y-1.5 text-[12px]">
            <FooterLink href="/">Browse scripts</FooterLink>
            <FooterLink href="/forum">Community forum</FooterLink>
            <FooterLink href="/submit">Publish a script</FooterLink>
          </ul>
        </nav>

        <nav aria-label="Project">
          <p className="label-kicker">Project</p>
          <ul className="mt-3 space-y-1.5 text-[12px]">
            <FooterLink href={TAPIR.repoUrl} external>
              Tapir Add-On
            </FooterLink>
            <FooterLink href={TAPIR.docsUrl} external>
              Tapir documentation
            </FooterLink>
            <FooterLink href={REPO_URL} external>
              This site on GitHub
            </FooterLink>
          </ul>
        </nav>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-1.5 px-6 py-4 text-[10.5px] text-text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            Community project. Not affiliated with Graphisoft. Archicad is a trademark of
            Graphisoft SE.
          </p>
          <p>Scripts are licensed by their authors — review before running.</p>
        </div>
      </div>
    </footer>
  )
}

function FooterLink({
  href,
  external,
  children,
}: {
  href: string
  external?: boolean
  children: React.ReactNode
}) {
  return (
    <li>
      {external ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="text-text-muted hover:text-accent"
        >
          {children}
        </a>
      ) : (
        <Link href={href} className="text-text-muted hover:text-accent">
          {children}
        </Link>
      )}
    </li>
  )
}
