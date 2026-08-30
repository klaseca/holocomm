import { upgradeWebSocket, type WebSocketLike } from '@hono/node-server'
import type { Hono } from 'hono'
import type { WSContext } from 'hono/ws'
import { WebSocket, WebSocketServer } from 'ws'

import type { AppLogger } from '#/shared/logging/app-logger.ts'

import type { WebSocketConnection } from '../websocket/websocket-connection.ts'
import type { WebSocketGateway } from '../websocket/websocket-gateway.ts'

export interface NodeWebSocketServerOptions {
  readonly allowedOrigin: string
  readonly heartbeatIntervalMs: number
  readonly logger: AppLogger
  readonly maxConnections?: number
  readonly maxPayloadBytes: number
  readonly path?: string
}

class NodeWebSocketConnection implements WebSocketConnection {
  readonly id: string

  private readonly socket: WSContext<WebSocketLike>

  constructor(id: string, socket: WSContext<WebSocketLike>) {
    this.id = id
    this.socket = socket
  }

  send(message: Parameters<WebSocketConnection['send']>[0]): void {
    if (this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message))
    }
  }

  close(code?: number, reason?: string): void {
    if (this.socket.readyState === WebSocket.OPEN) {
      this.socket.close(code, reason)
    }
  }
}

export function registerNodeWebSocketRoute(
  app: Hono,
  gateway: WebSocketGateway,
  options: NodeWebSocketServerOptions,
): WebSocketServer {
  const path = options.path ?? '/ws'

  const maxConnections = options.maxConnections ?? 1_000

  const webSocketServer = new WebSocketServer({
    noServer: true,
    maxPayload: options.maxPayloadBytes,
  })

  const aliveSockets = new WeakSet<WebSocket>()

  app.get(
    path,
    async (context, next) => {
      if (options.allowedOrigin !== '*' && context.req.header('origin') !== options.allowedOrigin) {
        options.logger.warn({ origin: context.req.header('origin') }, 'Rejected WebSocket origin')

        return context.text('Forbidden', 403)
      }

      if (webSocketServer.clients.size >= maxConnections) {
        options.logger.warn({ maxConnections }, 'Rejected WebSocket connection at capacity')

        return context.text('Service Unavailable', 503)
      }

      await next()
    },
    upgradeWebSocket(() => {
      const connectionId = crypto.randomUUID()

      return {
        onOpen(_event, socket) {
          const rawSocket = socket.raw as WebSocket

          const connection = new NodeWebSocketConnection(connectionId, socket)

          aliveSockets.add(rawSocket)
          rawSocket.on('pong', () => aliveSockets.add(rawSocket))
          gateway.connect(connection)
          options.logger.debug({ connectionId }, 'WebSocket connection opened')
        },
        onMessage(event, socket) {
          if (typeof event.data !== 'string') {
            options.logger.warn({ connectionId }, 'Rejected binary WebSocket message')
            socket.close(1003, 'Binary messages are not supported')

            return
          }

          gateway.receive(connectionId, event.data)
        },
        onClose(event) {
          gateway.disconnect(connectionId)
          options.logger.debug({ closeCode: event.code, connectionId }, 'WebSocket connection closed')
        },
        onError() {
          gateway.disconnect(connectionId)
          options.logger.warn({ connectionId }, 'WebSocket connection error')
        },
      }
    }),
  )

  const heartbeat = setInterval(() => {
    for (const socket of webSocketServer.clients) {
      if (!aliveSockets.has(socket)) {
        options.logger.warn({}, 'Terminated unresponsive WebSocket connection')
        socket.terminate()

        continue
      }

      aliveSockets.delete(socket)

      socket.ping()
    }
  }, options.heartbeatIntervalMs)

  heartbeat.unref()

  webSocketServer.once('close', () => {
    clearInterval(heartbeat)
  })

  return webSocketServer
}

export async function closeNodeWebSocketServer(
  webSocketServer: WebSocketServer,
  timeoutMs: number,
  logger: AppLogger,
): Promise<void> {
  const closed = new Promise<void>((resolve, reject) => {
    webSocketServer.close(error => error === undefined ? resolve() : reject(error))
  })

  for (const socket of webSocketServer.clients) {
    socket.close(1012, 'Server restarting')
  }

  const forceClose = setTimeout(() => {
    logger.warn({
      connections: webSocketServer.clients.size,
    }, 'WebSocket shutdown timeout reached; terminating remaining connections')

    for (const socket of webSocketServer.clients) {
      socket.terminate()
    }
  }, timeoutMs)

  forceClose.unref()

  try {
    await closed
  } finally {
    clearTimeout(forceClose)
  }
}
