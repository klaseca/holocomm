import type { Server } from 'node:http'

import type { WebSocketServer } from 'ws'

import type { AppLogger } from '#/shared/logging/app-logger.ts'

import { closeNodeWebSocketServer } from './websocket-server.ts'

export interface ShutdownNodeServerOptions {
  readonly httpServer: Server
  readonly logger: AppLogger
  readonly timeoutMs: number
  readonly webSocketServer: WebSocketServer
}

export async function shutdownNodeServer(options: ShutdownNodeServerOptions): Promise<void> {
  const httpClosed = new Promise<void>((resolve, reject) => {
    options.httpServer.close(error => error === undefined ? resolve() : reject(error))
  })

  const forceHttpClose = setTimeout(() => {
    options.logger.warn({}, 'HTTP shutdown timeout reached; terminating remaining connections')
    options.httpServer.closeAllConnections()
  }, options.timeoutMs)

  forceHttpClose.unref()

  try {
    await Promise.all([
      httpClosed,
      closeNodeWebSocketServer(
        options.webSocketServer,
        options.timeoutMs,
        options.logger,
      ),
    ])
  } finally {
    clearTimeout(forceHttpClose)
  }
}
