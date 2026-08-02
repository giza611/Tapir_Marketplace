import Link from 'next/link'

import { REPO_URL, SITE, TAPIR } from '@/lib/site'

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-border bg-surface-2">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <p className="text-sm font-semibold">{SITE.name}</p>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-text-muted">
            A community catalogue of automation for Archicad. Every listing here lives as a file
            in a public repository, so the whole marketplace can be forked, audited or handed on.
          </p>
        </div>

        <nav aria-label="Marketplace">
          <p className="text-xs font-semibold uppercase tracking-wider text-text-subtle">
            Marketplace
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/" className="text-text-muted transition-colors hover:text-text">
                Browse scripts
              </Link>
            </li>
            <li>
              <Link href="/forum" className="text-text-muted transition-colors hover:text-text">
                Community forum
              </Link>
            </li>
            <li>
              <Link href="/submit" className="text-text-muted transition-colors hover:text-text">
                Publish a script
              </Link>
            </li>
          </ul>
        </nav>

        <nav aria-label="Project">
          <p className="text-xs font-semibold uppercase tracking-wider text-text-subtle">Project</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <a
                href={TAPIR.repoUrl}
                target="_blank"
                rel="noreferrer"
                className="text-text-muted transition-colors hover:text-text"
              >
                Tapir Add-On
              </a>
            </li>
            <li>
              <a
                href={TAPIR.docsUrl}
                target="_blank"
                rel="noreferrer"
                className="text-text-muted transition-colors hover:text-text"
              >
                Tapir documentation
              </a>
            </li>
            <li>
              <a
                href={REPO_URL}
                target="_blank"
                rel="noreferrer"
                className="text-text-muted transition-colors hover:text-text"
              >
                This site on GitHub
              </a>
            </li>
          </ul>
        </nav>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-text-subtle sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            Community project. Not affiliated with Graphisoft. Archicad is a trademark of
            Graphisoft SE.
          </p>
          <p>
            Scripts are provided by their authors under their own licences — review before running.
          </p>
        </div>
      </div>
    </footer>
  )
}
