# Tapir Marketplace

A community marketplace for [Tapir](https://github.com/ENZYME-APD/tapir-archicad-automation)
scripts and Archicad add-ons. Browse, download, publish and discuss automation
built by architects and developers.

**There is no database and no server to maintain.** GitHub is the backend:

| Marketplace feature | What actually provides it |
| --- | --- |
| Listing database | Files in `listings/` in this repository |
| Submissions and edits | Pull requests, opened for you by the dashboard |
| Review and moderation | `.github/workflows/validate-listing.yml` |
| Comments and forum | GitHub Discussions, embedded via [giscus](https://giscus.app) |
| Ratings | Discussion reactions |
| File hosting | The author's own GitHub releases |
| Sign-in | GitHub OAuth, `public_repo` scope only |

The public site is fully static. It makes no runtime queries, so it cannot go
down because a service paused, a quota ran out or a bill went unpaid.

## Publishing a listing

Sign in with GitHub and use the dashboard at `/dashboard/new`. It forks this
repository to your account, commits your listing there, and opens a pull request
back here. Automated checks validate it and merge it, usually within a couple of
minutes.

You can also skip the UI entirely and open a pull request adding
`listings/<your-slug>/listing.json` and `README.md` by hand. Both routes go
through the same validation.

## Repository layout

```
app/                     Next.js App Router pages and API routes
components/              UI
lib/
  schema.ts              The listing contract — single source of truth
  listings.ts            Build-time loader (server only; reads the filesystem)
  github.ts              Fork → commit → pull request
  auth.ts                Encrypted, stateless GitHub sessions
listings/<slug>/
  listing.json           Validated against lib/schema.ts
  README.md              The listing's description, in markdown
  media/                 Screenshots, 500 KB each at most
scripts/
  validate-listings.ts   The CI gatekeeper — also runnable locally
  refresh-stats.ts       Daily download counts and reaction totals
  sync-media.mjs         Mirrors listing screenshots into public/
.github/workflows/       Validation, auto-merge, scheduled stats
docs/MAINTAINERS.md      Handover runbook
```

## Local development

```bash
npm install
```

```bash
npm run dev
```

No environment variables are needed to browse the catalogue. Copy `.env.example`
to `.env.local` to enable sign-in, comments or the forum index.

Run the same validation CI uses, against every listing in the repository:

```bash
npm run validate
```

Full check before pushing:

```bash
npm run typecheck && npm run lint && npm run build
```

## A note on security

Two files deserve care from anyone changing this project:

- **`.github/workflows/validate-listing.yml`** runs on `pull_request_target`,
  which grants it write access to this repository. It must never check out or
  execute code from a fork. The file explains the invariant in detail.
- **`components/Markdown.tsx`** renders contributor-authored markdown without
  `rehype-raw`, so embedded HTML is escaped rather than executed. Adding raw
  HTML support would give every contributor script execution on every visitor.

## Licence

The site itself is MIT. Each listing carries its own licence, chosen by its
author — check the listing before using a script.

Not affiliated with Graphisoft. Archicad is a trademark of Graphisoft SE.
