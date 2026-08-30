import type { Server } from 'node:http'
import process, { env } from 'node:process'

import { serve } from '@hono/node-server'

import { createCompositionRoot } from '#/composition-root.ts'
import { createConfig } from '#/config.ts'
import { createPinoLogger } from '#/infra/logging/pino-logger.ts'

import { shutdownNodeServer } from './graceful-shutdown.ts'
import { registerStaticFiles } from './static-files.ts'
import { registerNodeWebSocketRoute } from './websocket-server.ts'

const config = createConfig(env)

const logger = createPinoLogger(config.logLevel)

const { httpApp, webSocketGateway } = createCompositionRoot(config, logger)

const webSocketServer = registerNodeWebSocketRoute(httpApp, webSocketGateway, {
  allowedOrigin: config.allowedOrigin,
  heartbeatIntervalMs: config.heartbeatIntervalMs,
  logger,
  maxConnections: config.maxWebSocketConnections,
  maxPayloadBytes: config.maxWebSocketPayloadBytes,
})

if (config.staticFilesPath != null) {
  registerStaticFiles(httpApp, config.staticFilesPath)
}

const httpServer = serve({
  fetch: httpApp.fetch,
  hostname: config.host,
  port: config.port,
  websocket: { server: webSocketServer },
}, (info) => {
  logger.info({ address: info.address, port: info.port }, 'Backend listening')
}) as Server

let shuttingDown = false

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (shuttingDown) {
    return
  }

  shuttingDown = true
  logger.info({ signal }, 'Shutdown started')
  try {
    await shutdownNodeServer({
      httpServer,
      logger,
      timeoutMs: config.shutdownTimeoutMs,
      webSocketServer,
    })
    logger.info({ signal }, 'Shutdown completed')
  } catch (error) {
    process.exitCode = 1
    logger.fatal({ err: error, signal }, 'Shutdown failed')
  }
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => void shutdown(signal))
}
