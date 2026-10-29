import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

import { currentCredentials, forgetCredentials, signIn, storePath } from '../auth'
import { ENV_TOKEN, TARGET_REPO } from '../config'
import { guard, text } from '../result'

export function registerAccountTools(server: McpServer): void {
  server.registerTool(
    'sign_in',
    {
      title: 'Sign in to GitHub to publish',
      description:
        'Signs the author in to GitHub so listings can be published in their name, using the ' +
        'device flow: this returns a short code and a URL for them to open. Call it again after ' +
        'they have approved it — it resumes the same request. Reports who is signed in if ' +
        'somebody already is. Needed only for publishing; searching needs no account.',
      inputSchema: {},
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    },
    async () =>
      guard(async () => {
        const progress = await signIn()

        if (progress.state === 'signed-in') {
          return text(
            progress.wasAlready
              ? `Already signed in as @${progress.credentials.login}.`
              : [
                  `Signed in as @${progress.credentials.login}.`,
                  '',
                  `The token is stored at ${storePath()} and is scoped to public repositories.`,
                  'Call sign_out to remove it.',
                ].join('\n'),
          )
        }

        return text(
          [
            'Ask the author to finish signing in to GitHub:',
            '',
            `  1. Open ${progress.verificationUri}`,
            `  2. Enter the code:  ${progress.userCode}`,
            '',
            `The code is valid for about ${Math.round(progress.secondsLeft / 60)} more minutes. ` +
              'Call sign_in again once they have entered it.',
          ].join('\n'),
        )
      }),
  )

  server.registerTool(
    'sign_out',
    {
      title: 'Forget the stored GitHub token',
      description:
        'Deletes the GitHub token this server stored, so nothing further can be published ' +
        'until the author signs in again. Does not revoke the token on GitHub — the author can ' +
        'do that in their account settings.',
      inputSchema: {},
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    },
    async () =>
      guard(async () => {
        const credentials = await currentCredentials()
        const removed = forgetCredentials()

        if (ENV_TOKEN) {
          return text(
            [
              removed
                ? `Removed the stored token at ${storePath()}.`
                : 'There was no stored token to remove.',
              '',
              `A token is still being supplied by the environment (as @${credentials?.login}), ` +
                'so publishing remains possible. Unset TAPIR_GITHUB_TOKEN to stop that.',
            ].join('\n'),
          )
        }

        return text(
          removed
            ? `Signed out. The token at ${storePath()} has been deleted; nothing can be ` +
                `published to ${TARGET_REPO} until sign_in runs again.`
            : 'Nobody was signed in.',
        )
      }),
  )
}
