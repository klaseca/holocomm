import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import type { ServerMessage } from '@holocomm/protocol'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { afterEach, describe, expect, test } from 'vitest'
import { WebSocket } from 'ws'

import { ChatService } from '#/modules/chat/index.ts'
import { RoomPresenceService, RoomRegistry } from '#/modules/room/index.ts'
import { RtcSignalingService } from '#/modules/rtc/index.ts'
import { testLogger } from '#/testing/test-logger.ts'

import { WebSocketGateway } from '../websocket/websocket-gateway.ts'
import { registerNodeWebSocketRoute } from './websocket-server.ts'

const openClients: WebSocket[] = []

const openServers: Server[] = []

afterEach(async () => {
  for (const client of openClients.splice(0)) {
    client.terminate()
  }

  for (const server of openServers.splice(0)) {
    await new Promise<void>((resolve, reject) => {
      server.close(error => (error === undefined ? resolve() : reject(error)))
    })
  }
})

describe('node WebSocket server', () => {
  test('lets two clients observe join and disconnect presence', async () => {
    const url = await startWebSocketServer()

    const alice = await connectClient(url)

    const bob = await connectClient(url)

    alice.send(joinCommand('Alice'))

    const aliceSnapshot = await nextMessage(alice)

    expect(aliceSnapshot).toMatchObject({ type: 'room.snapshot', self: { displayName: 'Alice' } })

    const aliceSeesBob = nextMessage(alice)

    bob.send(joinCommand('Bob'))

    const bobSnapshot = await nextMessage(bob)

    expect(bobSnapshot).toMatchObject({
      type: 'room.snapshot',
      participants: [{ displayName: 'Alice' }, { displayName: 'Bob' }],
    })
    await expect(aliceSeesBob).resolves.toMatchObject({
      type: 'participant.joined',
      participant: { displayName: 'Bob' },
    })

    const aliceReceivesChat = nextMessage(alice)

    const bobReceivesChat = nextMessage(bob)

    bob.send(JSON.stringify({ type: 'chat.send', content: 'Hello Alice!' }))
    await expect(aliceReceivesChat).resolves.toMatchObject({
      type: 'chat.message',
      message: { author: { displayName: 'Bob' }, content: 'Hello Alice!' },
    })
    await expect(bobReceivesChat).resolves.toMatchObject({
      type: 'chat.message',
      message: { author: { displayName: 'Bob' }, content: 'Hello Alice!' },
    })

    const aliceSeesBobLeave = nextMessage(alice)

    bob.close()
    await expect(aliceSeesBobLeave).resolves.toMatchObject({ type: 'participant.left' })
  })

  test('keeps responsive clients alive through heartbeat cycles', async () => {
    const url = await startWebSocketServer(20)

    const alice = await connectClient(url)

    await new Promise(resolve => setTimeout(resolve, 75))
    alice.send(joinCommand('Alice'))

    await expect(nextMessage(alice)).resolves.toMatchObject({ type: 'room.snapshot' })
  })

  test('rejects connections after reaching server capacity', async () => {
    const url = await startWebSocketServer(60_000, 1)

    await connectClient(url)

    await expect(connectClient(url)).rejects.toThrow('Unexpected server response: 503')
  })
})

async function startWebSocketServer(
  heartbeatIntervalMs = 60_000,
  maxConnections = 1_000,
): Promise<string> {
  const app = new Hono()

  const registry = new RoomRegistry({ emptyRoomTtlMs: 0 })

  const presence = new RoomPresenceService(registry)

  const gateway = new WebSocketGateway(
    presence,
    new ChatService(),
    new RtcSignalingService(presence),
    testLogger,
  )

  const webSocketServer = registerNodeWebSocketRoute(app, gateway, {
    allowedOrigin: 'http://localhost:5173',
    heartbeatIntervalMs,
    logger: testLogger,
    maxConnections,
    maxPayloadBytes: 16_384,
  })

  const server = serve({
    fetch: app.fetch,
    hostname: '127.0.0.1',
    port: 0,
    websocket: { server: webSocketServer },
  }) as Server

  await new Promise<void>(resolve => server.listening ? resolve() : server.once('listening', resolve))
  openServers.push(server)

  const address = server.address() as AddressInfo

  return `ws://127.0.0.1:${address.port}/ws`
}

async function connectClient(url: string): Promise<WebSocket> {
  const client = new WebSocket(url, { origin: 'http://localhost:5173' })

  openClients.push(client)
  await new Promise<void>((resolve, reject) => {
    client.once('open', resolve)
    client.once('error', reject)
  })

  return client
}

async function nextMessage(client: WebSocket): Promise<ServerMessage> {
  return new Promise((resolve, reject) => {
    client.once('message', (data) => {
      try {
        resolve(JSON.parse(data.toString()) as ServerMessage)
      } catch (error) {
        reject(error)
      }
    })
    client.once('error', reject)
  })
}

function joinCommand(displayName: string): string {
  return JSON.stringify({ type: 'room.join', room: 'gaming-tonight', displayName })
}
