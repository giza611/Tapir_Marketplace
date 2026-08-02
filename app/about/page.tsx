import type { Metadata } from 'next'

import { PosterBand } from '@/components/PosterBand'
import { REPO_URL, SITE, TAPIR } from '@/lib/site'

export const metadata: Metadata = {
  title: 'About',
  description:
    'How the Tapir marketplace works, who runs it, and why every listing lives in a public repository.',
}

export default function AboutPage() {
  return (
    <>
      <div className="mx-auto max-w-[820px] px-6 py-12">
        <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-accent">
          About
        </p>
        <h1 className="mt-4 max-w-[16ch] text-[38px] leading-[1.05] tracking-[-0.02em]">
          A marketplace nobody has to run
        </h1>
        <p className="mt-5 max-w-[52ch] text-[15px] leading-relaxed text-text-muted">
          {SITE.fullName} exists so Archicad automation stops living in forum attachments and
          private folders. It was built to be handed over — there is no company behind it, no
          server to pay for, and no account anyone has to administer.
        </p>

        <Section title="How it works">
          <p>
            Every listing is a file in a{' '}
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="text-accent-700 underline underline-offset-2"
            >
              public repository
            </a>
            . Publishing opens a pull request from your own GitHub account; automated checks
            validate it and merge it, usually within a couple of minutes. Nobody reviews it by
            hand, because the checks are the reviewer.
          </p>
          <p>
            Comments are GitHub Discussions. That means a question asked on a script and a topic
            started in the forum are the same thing underneath, which is why both are searchable
            in one place.
          </p>
        </Section>

        <Section title="What that means for you">
          <p>
            <strong className="text-text">Reading needs no account.</strong> Browsing, searching
            and downloading are open to everyone.
          </p>
          <p>
            <strong className="text-text">Publishing needs a free GitHub account</strong>, because
            your listing is committed under your name. That is what lets you edit or remove it
            later without asking anyone&rsquo;s permission — and what stops anyone else editing
            it.
          </p>
          <p>
            <strong className="text-text">Money never touches this site.</strong> Authors can list
            a script as free, free with a contribution link, or paid. In every case you pay the
            author directly through their own link.
          </p>
        </Section>

        <Section title="Safety">
          <p>
            You can host a download anywhere, but every file is fingerprinted the first time it is
            seen and checked again daily. If the bytes behind a published version change, the
            listing is flagged and the download is pulled until the author publishes a genuine new
            version.
          </p>
          <p>
            That said: these are scripts that run inside your Archicad with your permissions. Read
            what you download, check the licence, and try it on a copy of a project first.
          </p>
        </Section>

        <Section title="Credits">
          <p>
            Built on{' '}
            <a
              href={TAPIR.repoUrl}
              target="_blank"
              rel="noreferrer"
              className="text-accent-700 underline underline-offset-2"
            >
              Tapir
            </a>
            , the add-on that exposes additional JSON commands on Archicad&rsquo;s API. This site
            is a community project and is not affiliated with Graphisoft or with the Tapir
            maintainers. Archicad is a trademark of Graphisoft SE.
          </p>
        </Section>
      </div>

      <PosterBand
        statement="Everything here was shared by someone who did not have to."
        action="Publish a script"
        href="/submit"
      />
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10 border-t-2 border-border-strong pt-5">
      <h2 className="label-kicker">{title}</h2>
      <div className="mt-3 max-w-[62ch] space-y-3 text-[13.5px] leading-relaxed text-text-muted">
        {children}
      </div>
    </section>
  )
}
