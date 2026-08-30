import type { ServerMessage } from '@holocomm/protocol'
import { describe, expect, test } from 'vitest'

import { ChatService } from '#/modules/chat/index.ts'
import { RoomPresenceService, RoomRegistry } from '#/modules/room/index.ts'
import { RtcSignalingService } from '#/modules/rtc/index.ts'
import { testLogger } from '#/testing/test-logger.ts'

import type { WebSocketConnection } from './websocket-connection.ts'
import { WebSocketGateway } from './websocket-gateway.ts'

class FakeConnection implements WebSocketConnection {
  readonly id: string

  readonly messages: ServerMessage[] = []

  closed = false

  constructor(id: string) {
    this.id = id
  }

  send(message: ServerMessage): void {
    this.messages.push(message)
  }

  close(): void {
    this.closed = true
  }
}

describe('webSocketGateway', () => {
  test('streams participant presence to room watchers without joining them', () => {
    const registry = new RoomRegistry()

    const gateway = createGateway(registry)

    const watcher = new FakeConnection('watcher-connection')

    const alice = new FakeConnection('alice-connection')

    gateway.connect(watcher)
    gateway.connect(alice)

    gateway.receive(watcher.id, JSON.stringify({ type: 'room.watch', room: 'Gaming Tonight' }))
    gateway.receive(alice.id, joinCommand('Alice'))

    expect(watcher.messages).toMatchObject([
      {
        type: 'room.preview',
        room: { slug: 'gaming-tonight' },
        participants: [],
      },
      {
        type: 'participant.joined',
        participant: { displayName: 'Alice' },
      },
    ])
    expect(registry.get('gaming-tonight')?.participants.size).toBe(1)

    gateway.receive(alice.id, JSON.stringify({ type: 'chat.send', content: 'private to members' }))
    expect(watcher.messages).toHaveLength(2)

    gateway.disconnect(alice.id)
    expect(watcher.messages.at(-1)).toMatchObject({ type: 'participant.left' })
  })

  test('synchronizes presence between two connections and cleans up on disconnect', () => {
    const registry = new RoomRegistry()

    const gateway = createGateway(registry)

    const alice = new FakeConnection('alice-connection')

    const bob = new FakeConnection('bob-connection')

    gateway.connect(alice)
    gateway.connect(bob)

    gateway.receive(alice.id, joinCommand('Alice'))
    gateway.receive(bob.id, joinCommand('Bob'))

    expect(alice.messages[0]).toMatchObject({
      type: 'room.snapshot',
      self: { displayName: 'Alice' },
      participants: [{ displayName: 'Alice' }],
    })
    expect(alice.messages[1]).toMatchObject({
      type: 'participant.joined',
      participant: { displayName: 'Bob' },
    })
    expect(bob.messages[0]).toMatchObject({
      type: 'room.snapshot',
      self: { displayName: 'Bob' },
      participants: [{ displayName: 'Alice' }, { displayName: 'Bob' }],
    })

    const bobId = extractSelfId(bob.messages[0])

    gateway.disconnect(bob.id)

    expect(alice.messages[2]).toEqual({
      type: 'participant.left',
      participantId: bobId,
    })
    expect(registry.get('gaming-tonight')?.participants.size).toBe(1)
  })

  test('broadcasts participant media state to members and watchers', () => {
    const registry = new RoomRegistry()

    const gateway = createGateway(registry)

    const watcher = new FakeConnection('watcher-connection')

    const alice = new FakeConnection('alice-connection')

    const bob = new FakeConnection('bob-connection')

    gateway.connect(watcher)
    gateway.connect(alice)
    gateway.connect(bob)
    gateway.receive(watcher.id, JSON.stringify({ type: 'room.watch', room: 'gaming-tonight' }))
    gateway.receive(alice.id, joinCommand('Alice'))
    gateway.receive(bob.id, joinCommand('Bob'))

    gateway.receive(
      alice.id,
      JSON.stringify({
        type: 'participant.media.update',
        microphoneMuted: false,
        screenSharing: true,
      }),
    )

    const aliceId = extractSelfId(alice.messages[0])

    const expectedUpdate = {
      type: 'participant.media.updated',
      participant: {
        id: aliceId,
        displayName: 'Alice',
        microphoneMuted: false,
        screenSharing: true,
      },
    }

    expect(watcher.messages.at(-1)).toEqual(expectedUpdate)
    expect(alice.messages.at(-1)).toEqual(expectedUpdate)
    expect(bob.messages.at(-1)).toEqual(expectedUpdate)
    expect(registry.get('gaming-tonight')?.participants.get(aliceId)).toMatchObject({
      microphoneMuted: false,
      screenSharing: true,
    })
  })

  test('returns a normalized error for invalid input without leaking internals', () => {
    const gateway = createGateway()

    const connection = new FakeConnection('connection')

    gateway.connect(connection)

    gateway.receive(connection.id, '{broken json')

    expect(connection.messages).toEqual([
      {
        type: 'error',
        code: 'INVALID_MESSAGE',
        message: 'Message is not valid JSON',
      },
    ])
  })

  test('broadcasts chat without including history in later snapshots', () => {
    const registry = new RoomRegistry()

    const chat = new ChatService()

    const presence = new RoomPresenceService(registry)

    const gateway = new WebSocketGateway(
      presence,
      chat,
      new RtcSignalingService(presence),
      testLogger,
    )

    const alice = new FakeConnection('alice-connection')

    const bob = new FakeConnection('bob-connection')

    const carol = new FakeConnection('carol-connection')

    gateway.connect(alice)
    gateway.connect(bob)
    gateway.connect(carol)
    gateway.receive(alice.id, joinCommand('Alice'))
    gateway.receive(bob.id, joinCommand('Bob'))

    gateway.receive(alice.id, JSON.stringify({ type: 'chat.send', content: '  Hello Bob!  ' }))

    expect(alice.messages[2]).toMatchObject({
      type: 'chat.message',
      message: { author: { displayName: 'Alice' }, content: 'Hello Bob!' },
    })
    expect(bob.messages[1]).toEqual(alice.messages[2])

    gateway.receive(carol.id, joinCommand('Carol'))
    expect(carol.messages[0]).toMatchObject({
      type: 'room.snapshot',
    })
    expect(carol.messages[0]).not.toHaveProperty('messages')
  })

  test('rejects chat from a connection outside a room', () => {
    const gateway = createGateway()

    const connection = new FakeConnection('connection')

    gateway.connect(connection)

    gateway.receive(connection.id, JSON.stringify({ type: 'chat.send', content: 'Hello' }))

    expect(connection.messages).toEqual([
      {
        type: 'error',
        code: 'ROOM_NOT_FOUND',
        message: 'Join a room before sending messages',
      },
    ])
  })

  test('makes disconnect cleanup idempotent', () => {
    const registry = new RoomRegistry()

    const gateway = createGateway(registry)

    const connection = new FakeConnection('connection')

    gateway.connect(connection)
    gateway.receive(connection.id, joinCommand('Alice'))

    gateway.disconnect(connection.id)
    gateway.disconnect(connection.id)

    expect(registry.get('gaming-tonight')?.participants.size).toBe(0)
  })

  test('relays RTC signaling only to the addressed peer in the same room', () => {
    const gateway = createGateway()

    const alice = new FakeConnection('alice-connection')

    const bob = new FakeConnection('bob-connection')

    const carol = new FakeConnection('carol-connection')

    for (const connection of [alice, bob, carol]) {
      gateway.connect(connection)
    }
    gateway.receive(alice.id, joinCommand('Alice'))
    gateway.receive(bob.id, joinCommand('Bob'))
    gateway.receive(carol.id, joinCommand('Carol'))

    const aliceId = extractSelfId(alice.messages[0])

    const bobId = extractSelfId(bob.messages[0])

    gateway.receive(
      alice.id,
      JSON.stringify({
        type: 'rtc.signal',
        targetPeerId: bobId,
        payload: { kind: 'offer', sdp: 'v=0' },
      }),
    )

    expect(bob.messages.at(-1)).toEqual({
      type: 'rtc.signal',
      sourcePeerId: aliceId,
      payload: { kind: 'offer', sdp: 'v=0' },
    })
    expect(carol.messages.at(-1)?.type).toBe('room.snapshot')
  })

  test('rejects RTC signaling to a peer outside the sender room', () => {
    const gateway = createGateway()

    const alice = new FakeConnection('alice-connection')

    const bob = new FakeConnection('bob-connection')

    gateway.connect(alice)
    gateway.connect(bob)
    gateway.receive(alice.id, joinCommand('Alice'))
    gateway.receive(
      bob.id,
      JSON.stringify({
        type: 'room.join',
        room: 'another-room',
        displayName: 'Bob',
      }),
    )

    gateway.receive(
      alice.id,
      JSON.stringify({
        type: 'rtc.signal',
        targetPeerId: extractSelfId(bob.messages[0]),
        payload: { kind: 'offer', sdp: 'v=0' },
      }),
    )

    expect(alice.messages.at(-1)).toEqual({
      type: 'error',
      code: 'RTC_SIGNAL_INVALID',
      message: 'RTC signal target is not in the same room',
    })
  })

  test('rate limits a noisy connection without retaining its messages', () => {
    const registry = new RoomRegistry()

    const presence = new RoomPresenceService(registry)

    const gateway = new WebSocketGateway(
      presence,
      new ChatService(),
      new RtcSignalingService(presence),
      testLogger,
      1,
    )

    const alice = new FakeConnection('alice-connection')

    gateway.connect(alice)

    gateway.receive(alice.id, joinCommand('Alice'))
    gateway.receive(alice.id, JSON.stringify({ type: 'chat.send', content: 'not relayed' }))
    gateway.receive(alice.id, JSON.stringify({ type: 'chat.send', content: 'also ignored' }))

    expect(alice.messages).toHaveLength(2)
    expect(alice.messages[1]).toEqual({
      type: 'error',
      code: 'RATE_LIMITED',
      message: 'Too many WebSocket messages; wait a moment and try again',
    })
  })
})

function createGateway(registry = new RoomRegistry()): WebSocketGateway {
  const presence = new RoomPresenceService(registry)

  return new WebSocketGateway(
    presence,
    new ChatService(),
    new RtcSignalingService(presence),
    testLogger,
  )
}

function joinCommand(displayName: string): string {
  return JSON.stringify({ type: 'room.join', room: 'gaming-tonight', displayName })
}

function extractSelfId(message: ServerMessage | undefined): string {
  if (message?.type !== 'room.snapshot') {
    throw new Error('Expected room snapshot')
  }

  return message.self.id
}
