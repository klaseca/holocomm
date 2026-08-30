import Type from 'typebox'
import { Decode } from 'typebox/value'

import { Int } from './shared/schema/int.ts'

const RtcIceServers = Type.Decode(
  Type.Refine(
    Type.String({ default: 'stun:stun.l.google.com:19302', minLength: 1 }),
    value => value
      .split(',')
      .every(url => /^(?:stun|stuns|turn|turns):\S+$/.test(url.trim())),
  ),
  value => value.split(',').map(url => url.trim()),
)

const AppConfigSchema = Type.Decode(
  Type.Object({
    HOST: Type.String({ default: 'localhost', minLength: 1 }),
    PORT: Int({ defaultValue: 3000, minimum: 1, maximum: 65_535 }),
    WEBSOCKET_URL: Type.String({ minLength: 1, pattern: '^wss?://' }),
    RTC_ICE_SERVERS: RtcIceServers,
    ALLOWED_ORIGIN: Type.String({ default: '*', minLength: 1 }),
    STATIC_FILES_PATH: Type.Optional(Type.String({ minLength: 1 })),
    EMPTY_ROOM_TTL_MS: Int({ defaultValue: 60_000, minimum: 0 }),
    MAX_PARTICIPANTS: Int({ defaultValue: 4, minimum: 1 }),
    MAX_WEBSOCKET_PAYLOAD_BYTES: Int({ defaultValue: 16_384, minimum: 1 }),
    MAX_WEBSOCKET_CONNECTIONS: Int({ defaultValue: 1_000, minimum: 1 }),
    HEARTBEAT_INTERVAL_MS: Int({ defaultValue: 30_000, minimum: 1 }),
    SHUTDOWN_TIMEOUT_MS: Int({ defaultValue: 8_000, minimum: 1 }),
    MAX_CHAT_MESSAGE_LENGTH: Int({ defaultValue: 2_000, minimum: 1, maximum: 2_000 }),
    WEBSOCKET_RATE_LIMIT_PER_SECOND: Int({ defaultValue: 120, minimum: 1 }),
    LOG_LEVEL: Type.Union([
      Type.Literal('fatal'),
      Type.Literal('error'),
      Type.Literal('warn'),
      Type.Literal('info'),
      Type.Literal('debug'),
      Type.Literal('trace'),
      Type.Literal('silent'),
    ], { default: 'info' }),
  }),
  it => ({
    host: it.HOST,
    port: it.PORT,
    webSocketUrl: it.WEBSOCKET_URL,
    rtcIceServers: it.RTC_ICE_SERVERS,
    allowedOrigin: it.ALLOWED_ORIGIN,
    staticFilesPath: it.STATIC_FILES_PATH,
    emptyRoomTtlMs: it.EMPTY_ROOM_TTL_MS,
    maxParticipants: it.MAX_PARTICIPANTS,
    maxWebSocketPayloadBytes: it.MAX_WEBSOCKET_PAYLOAD_BYTES,
    maxWebSocketConnections: it.MAX_WEBSOCKET_CONNECTIONS,
    heartbeatIntervalMs: it.HEARTBEAT_INTERVAL_MS,
    shutdownTimeoutMs: it.SHUTDOWN_TIMEOUT_MS,
    maxChatMessageLength: it.MAX_CHAT_MESSAGE_LENGTH,
    webSocketRateLimitPerSecond: it.WEBSOCKET_RATE_LIMIT_PER_SECOND,
    logLevel: it.LOG_LEVEL,
  }),
)

export type AppConfig = Type.StaticDecode<typeof AppConfigSchema>

export function createConfig(environment: Record<string, string | undefined>): AppConfig {
  return Decode(AppConfigSchema, { ...environment })
}
