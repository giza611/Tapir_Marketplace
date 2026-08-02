import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, GitPullRequest, ShieldCheck, Upload } from 'lucide-react'

import { LIMITS } from '@/lib/schema'
import { REPO_URL } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Publish a script',
  description:
    'How to publish a Tapir script or Archicad add-on to the marketplace. Free, open, and owned by the community.',
}

export default function SubmitPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-4xl font-semibold tracking-tight">Publish a script</h1>
      <p className="mt-4 text-lg leading-relaxed text-text-muted">
        Publishing is free and takes a few minutes. Your listing becomes a file in a public
        repository under your own name, which means you keep control of it and nobody — including
        whoever runs this site — can quietly change or remove your work.
      </p>

      <p className="mt-5 border border-border bg-surface-2 px-5 py-4 text-sm leading-relaxed text-text-muted">
        <strong className="text-text">You need a free GitHub account to publish.</strong>{' '}
        Downloading and browsing need no account at all. Publishing does, because your listing is
        committed to a public repository under your own name — that is what lets you edit or remove
        it later without asking anyone&rsquo;s permission, and what stops anyone else editing it.{' '}
        <a
          href="https://github.com/signup"
          target="_blank"
          rel="noreferrer"
          className="text-accent underline underline-offset-2"
        >
          Signing up
        </a>{' '}
        takes about a minute.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/dashboard/new"
          className="inline-flex items-center gap-1.5 bg-accent px-5 py-2.5 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover"
        >
          Start now
          <ArrowRight size={15} aria-hidden />
        </Link>
        <a
          href={REPO_URL}
          target="_blank"
          rel="noreferrer"
          className="border border-border bg-surface px-5 py-2.5 text-sm font-medium transition-colors hover:border-border-strong"
        >
          Or submit a pull request by hand
        </a>
      </div>

      <section className="mt-14">
        <h2 className="text-xl font-semibold tracking-tight">How it works</h2>
        <ol className="mt-5 space-y-5">
          <Step
            icon={<Upload size={16} aria-hidden />}
            title="Fill in the form"
            body="Name, description, category, which Archicad versions it supports, and a download link on GitHub or GitLab. Screenshots are optional but they make a listing far more useful."
          />
          <Step
            icon={<GitPullRequest size={16} aria-hidden />}
            title="It becomes a pull request"
            body="Signing in with GitHub lets the site create a fork under your account, commit your listing there, and open a pull request back to the marketplace. Everything is written with your own account, never a shared one."
          />
          <Step
            icon={<ShieldCheck size={16} aria-hidden />}
            title="Automated checks publish it"
            body="A workflow validates the submission and confirms you are only touching your own listing. If it passes, it merges by itself and the site rebuilds. If something is wrong, you get a comment saying exactly what to fix."
          />
        </ol>
      </section>

      <section className="mt-14">
        <h2 className="text-xl font-semibold tracking-tight">What we ask</h2>
        <ul className="mt-4 space-y-2.5 text-text-muted">
          <Rule>
            <strong className="text-text">Pick a licence.</strong> People are going to run your code
            inside live projects. Tell them what they may do with it.
          </Rule>
          <Rule>
            <strong className="text-text">Be honest about compatibility.</strong> Listing an
            Archicad version you have not actually tested wastes someone an afternoon.
          </Rule>
          <Rule>
            <strong className="text-text">Host downloads on GitHub or GitLab.</strong> Links
            elsewhere are rejected — a marketplace that points at arbitrary hosts is a malware
            delivery service waiting to happen. Release assets also give you download counts.
          </Rule>
          <Rule>
            <strong className="text-text">Keep screenshots small.</strong> Up to{' '}
            {LIMITS.maxScreenshots}, each under {Math.round(LIMITS.maxImageBytes / 1024)} KB. They
            are stored in git forever, so weight never goes away.
          </Rule>
        </ul>
      </section>

      <section className="mt-14 border border-border bg-surface-2 p-6">
        <h2 className="text-lg font-semibold tracking-tight">Charging for your work</h2>
        <p className="mt-2.5 leading-relaxed text-text-muted">
          You can list a script as free, free with a contribution link, or paid. In every case the
          money goes straight to you — add your own Ko-fi, GitHub Sponsors, PayPal or Stripe link
          and the listing shows a button pointing at it.
        </p>
        <p className="mt-3 leading-relaxed text-text-muted">
          This site never processes a payment, takes a cut, or sits between you and the person
          buying. That keeps it something a community can run without a company behind it.
        </p>
      </section>
    </div>
  )
}

function Step({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode
  title: string
  body: string
}) {
  return (
    <li className="flex gap-4">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center border border-accent-border bg-accent-subtle text-accent">
        {icon}
      </span>
      <div>
        <p className="font-medium">{title}</p>
        <p className="mt-1 leading-relaxed text-text-muted">{body}</p>
      </div>
    </li>
  )
}

function Rule({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5 leading-relaxed">
      <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
      <span>{children}</span>
    </li>
  )
}
