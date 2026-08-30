import pino from 'pino'

import type { AppLogger } from '#/shared/logging/app-logger.ts'

export function createPinoLogger(level: string): AppLogger {
  return pino({
    level,
    name: 'holocomm-backend',
    timestamp: pino.stdTimeFunctions.isoTime,
  })
}
