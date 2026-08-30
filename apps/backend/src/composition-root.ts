import type { AppConfig } from './config.ts'
import { createHttpApp } from './infra/http/create-http-app.ts'
import { WebSocketGateway } from './infra/websocket/websocket-gateway.ts'
import { ChatService } from './modules/chat/index.ts'
import { RoomPresenceService, RoomRegistry } from './modules/room/index.ts'
import { RtcSignalingService } from './modules/rtc/index.ts'
import type { AppLogger } from './shared/logging/app-logger.ts'

export function createCompositionRoot(config: AppConfig, logger: AppLogger) {
  const chat = new ChatService({
    maxMessageLength: config.maxChatMessageLength,
  })

  const roomRegistry = new RoomRegistry({
    emptyRoomTtlMs: config.emptyRoomTtlMs,
    maxParticipants: config.maxParticipants,
  })

  const roomPresence = new RoomPresenceService(roomRegistry)

  const rtcSignaling = new RtcSignalingService(roomPresence)

  const webSocketGateway = new WebSocketGateway(
    roomPresence,
    chat,
    rtcSignaling,
    logger,
    config.webSocketRateLimitPerSecond,
  )

  return {
    httpApp: createHttpApp(config, logger),
    webSocketGateway,
  }
}
