import { describe, expect, test } from 'vitest'

import { testLogger } from '#/testing/test-logger.ts'

import { createHttpApp } from './create-http-app.ts'

describe('createHttpApp', () => {
  test('reports a healthy service', async () => {
    const app = createHttpApp({
      host: 'localhost',
      port: 3000,
      webSocketUrl: 'ws://localhost:3000/ws',
      rtcIceServers: ['stun:stun.l.google.com:19302'],
      allowedOrigin: 'http://localhost:5173',
      staticFilesPath: undefined,
      emptyRoomTtlMs: 60_000,
      maxParticipants: 4,
      maxWebSocketPayloadBytes: 16_384,
      maxWebSocketConnections: 1_000,
      heartbeatIntervalMs: 30_000,
      shutdownTimeoutMs: 8_000,
      maxChatMessageLength: 2_000,
      webSocketRateLimitPerSecond: 120,
      logLevel: 'silent',
    }, testLogger)

    const response = await app.request('/health')

    expect(response.status).toBe(200)
    expect(response.headers.get('content-security-policy')).toContain('default-src \'self\'')
    expect(response.headers.get('permissions-policy')).toContain('microphone=(self)')
    expect(response.headers.get('strict-transport-security')).toBeTruthy()
    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
    expect(response.headers.get('x-frame-options')).toBe('DENY')
    expect(response.headers.get('x-request-id')).toBeTruthy()

    await expect(response.json()).resolves.toEqual({ status: 'ok' })
  })

  test('exposes the explicitly configured WebSocket URL', async () => {
    const app = createHttpApp({
      host: 'localhost',
      port: 3000,
      webSocketUrl: 'wss://holocomm.example/ws',
      rtcIceServers: ['stun:one.example', 'turns:two.example:5349'],
      allowedOrigin: 'https://holocomm.example',
      staticFilesPath: undefined,
      emptyRoomTtlMs: 60_000,
      maxParticipants: 4,
      maxWebSocketPayloadBytes: 16_384,
      maxWebSocketConnections: 1_000,
      heartbeatIntervalMs: 30_000,
      shutdownTimeoutMs: 8_000,
      maxChatMessageLength: 2_000,
      webSocketRateLimitPerSecond: 120,
      logLevel: 'silent',
    }, testLogger)

    const response = await app.request('/api/config')

    expect(response.headers.get('cache-control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual({
      webSocketUrl: 'wss://holocomm.example/ws',
      iceServers: ['stun:one.example', 'turns:two.example:5349'],
    })
  })
})
