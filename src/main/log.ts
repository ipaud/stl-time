/**
 * Terminal-only diagnostics. Never contains model or G-code payloads, only
 * paths, ids and timings.
 */
export function log(scope: string, message: string): void {
  // eslint-disable-next-line no-console
  console.log(`[${scope}] ${message}`)
}
