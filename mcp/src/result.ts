import { MarketplaceError } from './config'

/** Tool results are plain text: a model reads these, not a UI. */
export function text(body: string) {
  return { content: [{ type: 'text' as const, text: body }] }
}

export function failure(body: string) {
  return { content: [{ type: 'text' as const, text: body }], isError: true as const }
}

/**
 * Turns a thrown error into a tool error rather than a transport fault.
 *
 * A failed tool call the model can read and react to is worth far more than a
 * dropped connection, so everything is caught. `MarketplaceError` messages are
 * written for that reader and pass through verbatim; anything else is a bug
 * here and says so.
 */
export async function guard(
  run: () => Promise<ReturnType<typeof text>>,
): Promise<ReturnType<typeof text> | ReturnType<typeof failure>> {
  try {
    return await run()
  } catch (error) {
    if (error instanceof MarketplaceError) return failure(error.message)
    return failure(
      `Unexpected failure in the Tapir marketplace server: ${(error as Error).message}`,
    )
  }
}
