import type { Metadata } from 'next'
import Link from 'next/link'
import { MessageSquare, PackagePlus, Search } from 'lucide-react'

import { PosterBand } from '@/components/PosterBand'
import { REPO_URL, SITE } from '@/lib/site'

const PACKAGE = 'tapir-marketplace-mcp'
const NPM_URL = `https://www.npmjs.com/package/${PACKAGE}`

export const metadata: Metadata = {
  title: 'Use it from your AI assistant',
  description:
    'Search the Tapir marketplace and publish your own listings from Claude or any assistant that speaks MCP. Free, no account needed to search.',
  openGraph: {
    title: `${SITE.name} from your AI assistant`,
    description:
      'Search the marketplace and publish listings from Claude or any MCP client.',
    type: 'article',
  },
}

export default function McpPage() {
  return (
    <>
      <div className="mx-auto max-w-[820px] px-6 py-12">
        <p className="label-kicker text-accent">MCP server</p>
        <h1 className="mt-4 max-w-[18ch] text-[38px] leading-[1.05] tracking-[-0.02em]">
          Use it from your AI assistant
        </h1>
        <p className="mt-5 max-w-[56ch] text-[15px] leading-relaxed text-text-muted">
          The marketplace has an MCP server. Any assistant that speaks{' '}
          <a
            href="https://modelcontextprotocol.io"
            target="_blank"
            rel="noreferrer"
            className="text-accent-700 underline underline-offset-2"
          >
            the Model Context Protocol
          </a>{' '}
          &mdash; Claude Code, Claude Desktop and others &mdash; can search these listings, read
          them in full, and publish your own on your behalf. Searching needs no account and no
          sign-up.
        </p>

        <Section title="What you can ask for">
          <p>Once it is connected, these are ordinary requests:</p>
          <Example icon={<Search size={15} aria-hidden />}>
            &ldquo;Find a Tapir script that exports zone areas to Excel.&rdquo;
          </Example>
          <Example icon={<MessageSquare size={15} aria-hidden />}>
            &ldquo;Which Archicad versions does Element Heatmap support, and what licence is
            it?&rdquo;
          </Example>
          <Example icon={<PackagePlus size={15} aria-hidden />}>
            &ldquo;Publish my slab checker to the marketplace. The download is at this release
            link.&rdquo;
          </Example>
          <p>
            If your assistant can also drive Archicad &mdash; through the Tapir add-on &mdash; it
            can go from finding a script to running it against the open project without you
            copying a file anywhere.
          </p>
        </Section>

        <Section title="Setting it up">
          <p>
            You need <strong className="text-text">Node.js 20 or newer</strong> installed. Nothing
            else: the server is downloaded on demand and runs on your own machine.
          </p>
          <p className="pt-1">
            <strong className="text-text">Claude Code</strong>{' '}&mdash; one command:
          </p>
          <Code>{`claude mcp add tapir-marketplace -- npx -y ${PACKAGE}`}</Code>
          <p className="pt-1">
            <strong className="text-text">Claude Desktop</strong>, or any client with a JSON
            config &mdash; add this to your <Mono>mcpServers</Mono> block and restart it:
          </p>
          <Code>{`{
  "mcpServers": {
    "tapir-marketplace": {
      "command": "npx",
      "args": ["-y", "${PACKAGE}"]
    }
  }
}`}</Code>
          <p>
            Then ask it to search for something. If it answers with real listings, you are done.
          </p>
        </Section>

        <Section title="Publishing through it">
          <p>
            Searching is anonymous, but publishing is not: a listing is committed to a public
            repository under <em>your</em> GitHub name, and the automated checks only accept a
            submission from the account that owns it. So the server has to act as you.
          </p>
          <p>
            Today that means giving it a token. Create a{' '}
            <a
              href="https://github.com/settings/tokens/new?scopes=public_repo&description=Tapir%20marketplace%20MCP"
              target="_blank"
              rel="noreferrer"
              className="text-accent-700 underline underline-offset-2"
            >
              personal access token
            </a>{' '}
            with the <Mono>public_repo</Mono> scope and nothing else, then add it to the same
            config block:
          </p>
          <Code>{`{
  "mcpServers": {
    "tapir-marketplace": {
      "command": "npx",
      "args": ["-y", "${PACKAGE}"],
      "env": { "TAPIR_GITHUB_TOKEN": "your-token-here" }
    }
  }
}`}</Code>
          <p>
            That token can only touch public repositories, and you can revoke it from GitHub at any
            time. Treat it like a password otherwise &mdash; anyone holding it can publish as you.
          </p>
          <p>
            From there, ask your assistant to publish. It will open a pull request from your
            account; the same checks that review a submission from the website review this one, and
            merge it within a couple of minutes if it passes.
          </p>
        </Section>

        <Section title="Before you let it publish">
          <p>
            <strong className="text-text">Publishing is publishing.</strong>{' '}There is no draft
            state: a submission goes public and merges on its own. The server cannot take one back
            &mdash; undoing it means closing the pull request on GitHub, or opening a second one.
          </p>
          <p>
            <strong className="text-text">Give it the download link yourself.</strong>{' '}It is the
            one field that matters most, because it is what other people will run inside their
            Archicad. Paste your own release URL; never let an assistant guess or reconstruct one.
          </p>
          <p>
            <strong className="text-text">Ask it to check first.</strong>{' '}&ldquo;Validate this
            before submitting&rdquo; runs the same rules the repository uses and reports what is
            wrong, without sending anything.
          </p>
          <p>Three things it will refuse, whatever it is asked:</p>
          <ul className="space-y-2 pt-1">
            <Rule>Publishing under anyone&rsquo;s name but the signed-in account&rsquo;s.</Rule>
            <Rule>Changing a listing somebody else owns.</Rule>
            <Rule>Queueing more than three submissions at once.</Rule>
          </ul>
        </Section>

        <section className="mt-10 border border-accent-border bg-accent-subtle p-6">
          <h2 className="label-kicker text-accent">If you are an assistant reading this page</h2>
          <p className="mt-3 max-w-[62ch] text-[13.5px] leading-relaxed text-text-muted">
            Someone has probably sent you this link and asked you to do it for them. Four things,
            in order:
          </p>
          <ol className="mt-3 max-w-[62ch] space-y-2 text-[13.5px] leading-relaxed text-text-muted">
            <Numbered n={1}>
              You cannot install the server into their client yourself unless you can edit their
              config. Give them the command above and let them restart it.
            </Numbered>
            <Numbered n={2}>
              <strong className="text-text">Ask them for the download URL.</strong>{' '}Do not
              construct it, infer it from a repository name, or substitute a link you found. It is
              what other people will run inside their Archicad, and only the author knows which
              file is the real one.
            </Numbered>
            <Numbered n={3}>
              Call <Mono>validate_listing</Mono> first and show them what it says. It sends
              nothing.
            </Numbered>
            <Numbered n={4}>
              <strong className="text-text">Confirm before you publish.</strong>{' '}
              <Mono>publish_listing</Mono> opens a public pull request that merges on its own,
              under their name. It is not a draft and you cannot undo it.
            </Numbered>
          </ol>
        </section>

        <Section title="Installing what it finds">
          <p>
            A script you find here runs inside your Archicad with your permissions, whether a person
            or an assistant found it. The server will not hand over a download whose file has
            changed since it was published &mdash; integrity monitoring flags those and it withholds
            the link rather than passing it on with a warning.
          </p>
          <p>
            That check is about the file staying the same, not about the file being good. Read what
            you download, check the licence, and try it on a copy of a project first.
          </p>
        </Section>

        <Section title="Where it comes from">
          <p>
            The server is{' '}
            <a
              href={NPM_URL}
              target="_blank"
              rel="noreferrer"
              className="text-accent-700 underline underline-offset-2"
            >
              <Mono>{PACKAGE}</Mono>
            </a>{' '}
            on npm, built from{' '}
            <a
              href={`${REPO_URL}/tree/main/mcp`}
              target="_blank"
              rel="noreferrer"
              className="text-accent-700 underline underline-offset-2"
            >
              the <Mono>mcp/</Mono> folder
            </a>{' '}
            of this site&rsquo;s own repository. It shares the site&rsquo;s listing rules rather
            than keeping a copy, so anything it accepts is something the marketplace accepts.
          </p>
          <p>
            Something broken or missing?{' '}
            <a
              href={`${REPO_URL}/issues`}
              target="_blank"
              rel="noreferrer"
              className="text-accent-700 underline underline-offset-2"
            >
              Open an issue
            </a>
            , or raise it in the <Link href="/forum" className="text-accent-700 underline underline-offset-2">forum</Link>.
          </p>
        </Section>
      </div>

      <PosterBand
        statement="Share your work with the community."
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

/** A thing you might say to an assistant, set apart from the prose around it. */
function Example({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <p className="flex gap-3 border-l-2 border-accent-border bg-surface-2 px-4 py-2.5 text-text">
      <span className="mt-0.5 shrink-0 text-accent">{icon}</span>
      <span>{children}</span>
    </p>
  )
}

function Numbered({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span
        aria-hidden
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border border-accent-border bg-bg text-[11px] text-accent"
      >
        {n}
      </span>
      <span>{children}</span>
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

function Mono({ children }: { children: React.ReactNode }) {
  return (
    <code
      className="text-[0.92em]"
      style={{ fontFamily: 'var(--font-mono)' }}
    >
      {children}
    </code>
  )
}

function Code({ children }: { children: string }) {
  return (
    <pre
      className="overflow-x-auto border border-border bg-surface-2 px-4 py-3 text-[12px] leading-[1.7] text-text"
      style={{ fontFamily: 'var(--font-mono)' }}
    >
      <code>{children}</code>
    </pre>
  )
}
