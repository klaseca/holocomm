import { describe, expect, test } from 'vitest'

import { createConfig } from './config.ts'

describe('readConfig', () => {
  test('applies schema defaults', () => {
    expect(createConfig({ WEBSOCKET_URL: 'ws://localhost:3000/ws' })).toEqual({
      host: 'localhost',
      port: 3000,
      webSocketUrl: 'ws://localhost:3000/ws',
      rtcIceServers: ['stun:stun.l.google.com:19302'],
      allowedOrigin: '*',
      staticFilesPath: undefined,
      emptyRoomTtlMs: 60_000,
      maxParticipants: 4,
      maxWebSocketPayloadBytes: 16_384,
      maxWebSocketConnections: 1_000,
      heartbeatIntervalMs: 30_000,
      shutdownTimeoutMs: 8_000,
      maxChatMessageLength: 2_000,
      webSocketRateLimitPerSecond: 120,
      logLevel: 'info',
    })
  })

  test('converts environment strings using the schema', () => {
    expect(createConfig({
      HOST: '127.0.0.1',
      PORT: '8080',
      WEBSOCKET_URL: 'wss://holocomm.example/ws',
      RTC_ICE_SERVERS: 'stun:one.example, turns:two.example:5349',
      ALLOWED_ORIGIN: 'https://holocomm.example',
      STATIC_FILES_PATH: '/app/public',
      EMPTY_ROOM_TTL_MS: '1000',
      MAX_PARTICIPANTS: '8',
      MAX_WEBSOCKET_PAYLOAD_BYTES: '32768',
      MAX_WEBSOCKET_CONNECTIONS: '500',
      HEARTBEAT_INTERVAL_MS: '15000',
      SHUTDOWN_TIMEOUT_MS: '5000',
      MAX_CHAT_MESSAGE_LENGTH: '1000',
      WEBSOCKET_RATE_LIMIT_PER_SECOND: '60',
      LOG_LEVEL: 'debug',
    })).toEqual({
      host: '127.0.0.1',
      port: 8080,
      webSocketUrl: 'wss://holocomm.example/ws',
      rtcIceServers: ['stun:one.example', 'turns:two.example:5349'],
      allowedOrigin: 'https://holocomm.example',
      staticFilesPath: '/app/public',
      emptyRoomTtlMs: 1000,
      maxParticipants: 8,
      maxWebSocketPayloadBytes: 32_768,
      maxWebSocketConnections: 500,
      heartbeatIntervalMs: 15_000,
      shutdownTimeoutMs: 5_000,
      maxChatMessageLength: 1000,
      webSocketRateLimitPerSecond: 60,
      logLevel: 'debug',
    })
  })

  test('decodes defaults when given a process-env-like object', () => {
    class ProcessEnvironment {}

    const environment = new Proxy(
      new ProcessEnvironment() as Record<string, string | undefined>,
      {
        set(target, property, value) {
          return Reflect.set(target, property, String(value))
        },
      },
    )

    environment.WEBSOCKET_URL = 'ws://localhost:3000/ws'

    const config = createConfig(environment)

    expect(config.port).toBe(3000)
    expect(config.maxChatMessageLength).toBe(2000)
    expect(typeof config.port).toBe('number')
    expect(typeof config.maxChatMessageLength).toBe('number')
  })

  test.each([
    { WEBSOCKET_URL: undefined },
    { HOST: '' },
    { WEBSOCKET_URL: '/ws' },
    { WEBSOCKET_URL: 'https://holocomm.example/ws' },
    { RTC_ICE_SERVERS: '' },
    { RTC_ICE_SERVERS: 'https://ice.example' },
    { RTC_ICE_SERVERS: 'stun:one.example,' },
    { PORT: 'not-a-number' },
    { PORT: '0' },
    { PORT: '65536' },
    { ALLOWED_ORIGIN: '' },
    { MAX_PARTICIPANTS: '1.5' },
    { MAX_WEBSOCKET_CONNECTIONS: '0' },
    { SHUTDOWN_TIMEOUT_MS: '0' },
    { MAX_CHAT_MESSAGE_LENGTH: '2001' },
    { LOG_LEVEL: 'verbose' },
  ])('rejects invalid configuration %#', (environment) => {
    expect(() => createConfig({
      WEBSOCKET_URL: 'ws://localhost:3000/ws',
      ...environment,
    })).toThrow()
  })
})
