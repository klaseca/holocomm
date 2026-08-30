import type { AppLogger } from '#/shared/logging/app-logger.ts'

const discard = (): void => undefined

export const testLogger: AppLogger = {
  debug: discard,
  error: discard,
  fatal: discard,
  info: discard,
  warn: discard,
}
