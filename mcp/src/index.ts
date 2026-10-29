import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

import { MARKETPLACE_URL, TARGET_REPO, VERSION } from './config'
import { registerAccountTools } from './tools/account'
import { registerPublishTools } from './tools/publish'
import { registerReadTools } from './tools/read'
import { registerValidationTools } from './tools/validate'

/**
 * MCP server for the Tapir Scripts Marketplace.
 *
 * Reading needs nothing: the catalogue is a static file on the website.
 * Publishing acts as the author's own GitHub account, because the repository's
 * CI only accepts a listing from the account that owns it — see src/auth.ts.
 *
 * Speaks JSON-RPC over stdout, so nothing in this process may print there.
 * Diagnostics go to stderr.
 */

const INSTRUCTIONS = [
  `Tools for the Tapir Scripts Marketplace at ${MARKETPLACE_URL} — community Python scripts`,
  'and add-ons that automate Archicad through the Tapir add-on.',
  '',
  'Searching and reading listings needs no account. A listing found here can be downloaded and,',
  'if an Archicad automation tool is also available in this session, run against the open project.',
  '',
  `Publishing goes through sign_in, then publish_listing, which opens a pull request against`,
  `${TARGET_REPO} from the author's own GitHub account. Automated checks merge it, so a`,
  'submission is public within minutes and cannot be recalled by this server — treat it as',
  'publishing, not drafting, and confirm with the author before calling it.',
  '',
  'A listing points at a download the author hosts themselves, and people run what they',
  'download inside their production Archicad. Only ever use a downloadUrl the author supplied.',
].join('\n')

async function main(): Promise<void> {
  const server = new McpServer(
    { name: 'tapir-marketplace', version: VERSION },
    { instructions: INSTRUCTIONS },
  )

  registerReadTools(server)
  registerValidationTools(server)
  registerAccountTools(server)
  registerPublishTools(server)

  await server.connect(new StdioServerTransport())
  console.error(`tapir-marketplace-mcp ${VERSION} ready — reading ${MARKETPLACE_URL}`)
}

main().catch((error: unknown) => {
  console.error(`tapir-marketplace-mcp failed to start: ${(error as Error).message}`)
  process.exit(1)
})
