export const WEBSOCKET_CONNECTION_TIMEOUT_MS = 10_000

const INITIAL_RECONNECT_DELAY_MS = 500

const MAX_RECONNECT_DELAY_MS = 10_000

export function reconnectDelayMs(attempt: number): number {
  const exponent = Math.max(0, Math.min(attempt, 5))

  return Math.min(INITIAL_RECONNECT_DELAY_MS * 2 ** exponent, MAX_RECONNECT_DELAY_MS)
}
