# Tapir Marketplace MCP server

Lets an AI assistant search the [Tapir Scripts Marketplace](https://tapir-marketplace.vercel.app)
and publish listings to it on their author's behalf.

Searching needs no account and no setup. Publishing signs the author in to
GitHub and opens a pull request as them — the same route the website's
dashboard takes, because the repository's CI only accepts a listing from the
account that owns it.

## Add it to a client

```bash
claude mcp add tapir-marketplace -- npx -y tapir-marketplace-mcp
```

For Claude Desktop, or anything else that reads a JSON config:

```json
{
  "mcpServers": {
    "tapir-marketplace": {
      "command": "npx",
      "args": ["-y", "tapir-marketplace-mcp"]
    }
  }
}
```

## Tools

| Tool | Needs an account | What it does |
| --- | --- | --- |
| `search_listings` | no | Search by text, category, type, Archicad version, licence, pricing, author or tag |
| `get_listing` | no | One listing in full: every version, download URL, integrity status and README |
| `list_categories` | no | The taxonomy, with how many listings sit in each category |
| `validate_listing` | no | Check a draft against the real contract and report what CI would reject |
| `sign_in` | — | GitHub device flow: returns a code and a URL for the author to approve |
| `sign_out` | — | Delete the stored token |
| `publish_listing` | yes | Publish or update a listing as a pull request |
| `list_my_submissions` | yes | The author's submissions that have not merged yet |

There is also a resource, `tapir://listing.schema.json`, holding the listing
JSON Schema generated from the marketplace's own Zod contract.

## Publishing is publishing

`publish_listing` opens a public pull request, and automated checks merge it
within a couple of minutes. There is no draft state and no undo in this server:
withdrawing a submission means closing the pull request on GitHub, and removing
a merged listing means a second pull request that deletes it.

Three things it refuses to do, and will not be talked into:

- **Publish as anyone but the signed-in account.** `authorGithub` is overwritten
  with the authenticated login, never read from the caller. CI compares it
  against the pull request author, so a mismatch could not merge anyway — but
  it should not become a pull request in the first place.
- **Touch a listing somebody else owns.** Checked here, and again by CI.
- **Queue submissions without limit.** Three open *listing* submissions at once
  per author; pull requests against the site's own code do not count. A person
  opens one and waits; a loop opens them until something stops it, and each one
  costs the repository a CI run.

The field that deserves care is `downloadUrl`. It is what people run inside
their production Archicad, and the marketplace deliberately accepts any host —
what protects visitors is integrity monitoring, not an allowlist. An assistant
must only ever use a link the author gave it. Never one it found, guessed or
reconstructed. For the same reason, `get_listing` withholds a download URL
whose file has been flagged as changed or unreachable, rather than handing it
over with a warning attached.

## Configuration

Nothing is required. Each variable below changes one thing:

| Variable | Effect |
| --- | --- |
| `TAPIR_MARKETPLACE_URL` | Read a different deployment, e.g. `http://localhost:3000` |
| `TAPIR_GITHUB_TOKEN` | Publish with this token instead of signing in; needs `public_repo` |
| `NEXT_PUBLIC_REPO_OWNER`, `NEXT_PUBLIC_REPO_NAME` | The repository to submit to |
| `TAPIR_MARKETPLACE_HOME` | Where the stored token lives, default `~/.tapir-marketplace` |

Pointing `TAPIR_MARKETPLACE_URL` at a fork's website without also setting
`NEXT_PUBLIC_REPO_OWNER` would read one project and submit to another, so
publishing refuses when the two disagree rather than filing a pull request
somebody did not expect.

### Sign-in without a token

The device flow needs an OAuth client ID, which the server reads from the
marketplace's own `/catalogue.json`. A deployment publishes it there whenever
`GITHUB_CLIENT_ID` is set — it is the public half of the credential pair, the
one that already travels in every sign-in URL, and the device flow uses no
secret at all.

Both conditions hold on the marketplace's own deployment, so `sign_in` works
out of the box. A fork needs them arranged itself:

1. **Device flow enabled** — a checkbox in the OAuth app's settings.
2. `GITHUB_CLIENT_ID` set on the deployment, which it already needs for the
   dashboard.

Where either is missing, `sign_in` says so and points at `TAPIR_GITHUB_TOKEN`.

The token is written to `~/.tapir-marketplace/credentials.json` with `0600`
permissions where the platform has them. `sign_out` deletes it; revoking it
properly is done in GitHub's account settings.

## Publishing a release

`prepublishOnly` typechecks and builds, so both dependency trees have to be
installed first — the root one as well, because the typecheck follows imports
into `../lib`. A fresh clone has neither:

```bash
npm install && npm install --prefix mcp
```

Then, always from the repository root, naming this folder:

```bash
npm publish ./mcp --dry-run
```

**Not `npm --prefix mcp publish`.** `--prefix` only moves `node_modules`
resolution; `publish` still packs the current directory. Run from the root it
packs the whole site instead — 389 files, both git worktrees and
`.claude/settings.local.json` — and reports success, because `npm publish
--dry-run` does not honour the `"private": true` that would stop a real publish.
A dry run is therefore not a safety net against being in the wrong directory.
Check the name it prints:

```
npm notice name: tapir-marketplace-mcp     <- this package
npm notice name: tapir-marketplace         <- the website; stop
```

A correct run is four files and about 53 kB: `README.md`, `dist/index.js`,
`dist/index.js.map`, `package.json`. If `dist/index.js` is missing, the build
did not run — `prepublishOnly` should have made that impossible, so find out
why before going further.

Then, with the same arguments:

```bash
npm publish ./mcp
```

The name and the version number are both permanent once this succeeds.
Unpublishing is only possible within 72 hours, and a version number can never
be reused even then.

## Development

This package shares the site's code rather than copying it:
`lib/schema.ts` for the listing contract and `lib/github.ts` for fork, commit
and pull request. That is the point — a listing this server accepts is one the
repository accepts, and it cannot drift, because a change to either file is a
type error here.

It does mean the parent repository must be installed before this builds:

```bash
npm install          # in the repository root
cd mcp && npm install
npm run build        # bundles src/ plus the shared files into dist/
npm run typecheck
npm run smoke        # drives the built server over stdio
```

`npm run smoke` exercises the read half end to end against the deployed site,
or against a local one:

```bash
TAPIR_MARKETPLACE_URL=http://localhost:3000 npm run smoke
```

It never signs in or publishes. The write path ends in a real pull request
against a real repository, which no test should open on its own; it is checked
by publishing something once, by hand.

Two deliberate oddities worth knowing before changing the build:

- **Zod is listed as `external` explicitly**, not just covered by
  `packages: 'external'`. esbuild honours the `paths` mapping in
  `tsconfig.json`, which rewrites `zod` to the repository's copy and so stops
  it looking like a package import — inlining three quarters of a megabyte.
- **The `paths` mapping itself** exists because this package has its own Zod
  and `../lib` resolves the repository's. Two instances disagree about their
  own internals, and `z.toJSONSchema(listingSchema)` stops compiling.

Nothing may write to stdout: that is the JSON-RPC transport. Diagnostics go to
stderr.
