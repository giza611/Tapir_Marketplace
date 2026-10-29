import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

/*
 * Drives the built server over stdio the way a client would, and checks the
 * read half end to end. Run it after `npm run build`:
 *
 *   npm run smoke                        # against the deployed marketplace
 *   TAPIR_MARKETPLACE_URL=http://localhost:3000 npm run smoke
 *
 * Nothing here signs in or publishes — that would mean a real pull request
 * against a real repository, which no test should open on its own. The write
 * path is exercised by publishing something for real, once, by hand.
 */

const here = dirname(fileURLToPath(import.meta.url))
const entry = resolve(here, '../dist/index.js')
const marketplace = process.env.TAPIR_MARKETPLACE_URL ?? 'https://tapir-marketplace.vercel.app'

const results = []

function record(name, ok, detail) {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
}

function textOf(result) {
  return (result.content ?? [])
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('\n')
}

const client = new Client({ name: 'tapir-marketplace-smoke', version: '0' })

await client.connect(
  new StdioClientTransport({
    command: process.execPath,
    args: [entry],
    env: {
      ...process.env,
      TAPIR_MARKETPLACE_URL: marketplace,
      // Never let an ambient token turn a smoke run into a signed-in session.
      TAPIR_GITHUB_TOKEN: '',
      GITHUB_TOKEN: '',
    },
    stderr: 'inherit',
  }),
)

console.log(`\nServer connected. Reading ${marketplace}\n`)

const { tools } = await client.listTools()
const names = tools.map((tool) => tool.name).sort()
record(
  'tools listed',
  names.length === 8,
  names.join(', '),
)

const { resources } = await client.listResources()
record(
  'schema resource listed',
  resources.some((resource) => resource.uri === 'tapir://listing.schema.json'),
  resources.map((resource) => resource.uri).join(', '),
)

const schema = await client.readResource({ uri: 'tapir://listing.schema.json' })
const parsed = JSON.parse(schema.contents[0].text)
record(
  'schema resource is JSON Schema',
  Array.isArray(parsed.required) && parsed.required.includes('versions'),
  `${Object.keys(parsed.properties ?? {}).length} properties`,
)

const categories = await client.callTool({ name: 'list_categories', arguments: {} })
record(
  'list_categories',
  textOf(categories).includes('zones-areas'),
  textOf(categories).split('\n')[0],
)

const search = await client.callTool({ name: 'search_listings', arguments: { limit: 3 } })
record('search_listings (no filters)', !search.isError, textOf(search).split('\n')[0])

const miss = await client.callTool({
  name: 'search_listings',
  arguments: { query: 'definitely-nothing-matches-this' },
})
record('search_listings (no matches)', textOf(miss).startsWith('No listing matches'))

/*
 * Everything below works from a listing the catalogue actually contains, so
 * these checks keep testing something as the marketplace fills up. Asserting
 * against a slug or category chosen here would pass on an empty result the
 * day somebody recategorises it.
 */
const firstSlug = textOf(search).match(/^([a-z0-9-]+) — /m)?.[1]

if (!firstSlug) {
  record('get_listing', false, 'no slug found in search output')
} else {
  const listing = await client.callTool({ name: 'get_listing', arguments: { slug: firstSlug } })
  const body = textOf(listing)
  record(
    'get_listing',
    !listing.isError && body.includes('## Versions') && body.includes(firstSlug),
    firstSlug,
  )

  const category = body.match(/^- Category: (.+)$/m)?.[1]
  const { listings } = await (await fetch(`${marketplace}/catalogue.json`)).json()
  const entry = listings.find((item) => item.slug === firstSlug)

  const filtered = await client.callTool({
    name: 'search_listings',
    arguments: { query: firstSlug.split('-')[0], category: entry.category, limit: 50 },
  })
  record(
    'search_listings (query + category filter)',
    textOf(filtered).includes(firstSlug),
    `${firstSlug} in ${category}`,
  )

  const wrongVersion = await client.callTool({
    name: 'search_listings',
    arguments: { author: 'nobody-by-this-name', limit: 50 },
  })
  record(
    'search_listings (filter that excludes everything)',
    textOf(wrongVersion).startsWith('No listing matches'),
  )
}

const unknown = await client.callTool({ name: 'get_listing', arguments: { slug: 'no-such-thing' } })
record('get_listing (unknown slug)', textOf(unknown).includes('no listing with the slug'))

const broken = await client.callTool({
  name: 'validate_listing',
  arguments: { listing: { slug: 'Not A Slug', name: 'x' } },
})
const brokenReport = textOf(broken)
record(
  'validate_listing (rejects a bad draft)',
  brokenReport.includes('not valid yet') && brokenReport.includes('slug:'),
  `${brokenReport.split('\n').length} lines of errors`,
)

const draft = {
  slug: 'smoke-test-draft',
  name: 'Smoke Test Draft',
  summary: 'A listing used only to check that validation accepts a well-formed draft.',
  category: 'utilities',
  type: 'python-script',
  tags: ['testing'],
  author: { name: 'Smoke Test' },
  license: 'MIT',
  pricing: { model: 'free' },
  versions: [
    {
      version: '1.0.0',
      releasedAt: '2026-01-01',
      downloadUrl: 'https://example.com/smoke.zip',
      archicadVersions: ['28'],
    },
  ],
}
const good = await client.callTool({ name: 'validate_listing', arguments: { listing: draft } })
record('validate_listing (accepts a good draft)', textOf(good).startsWith('This listing is valid'))

const needsAuth = await client.callTool({
  name: 'list_my_submissions',
  arguments: {},
})
record(
  'write tools refuse without a token',
  needsAuth.isError === true && textOf(needsAuth).includes('Not signed in'),
)

await client.close()

const failed = results.filter((result) => !result.ok)
console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
if (failed.length > 0) {
  console.log(failed.map((result) => `  FAILED: ${result.name}`).join('\n'))
  process.exit(1)
}
