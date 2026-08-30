import { Check } from 'typebox/value'
import { describe, expect, test } from 'vitest'

import { ServerMessageSchema } from './server-messages.ts'

describe('serverMessageSchema', () => {
  test('accepts a room preview without a self participant', () => {
    expect(Check(ServerMessageSchema, {
      type: 'room.preview',
      room: { slug: 'gaming-tonight' },
      participants: [{
        id: 'participant-1',
        displayName: 'Alice',
        microphoneMuted: true,
        screenSharing: false,
      }],
    })).toBe(true)
  })

  test('accepts a participant presence event', () => {
    expect(
      Check(ServerMessageSchema, {
        type: 'participant.joined',
        participant: {
          id: 'participant-1',
          displayName: 'Alice',
          microphoneMuted: true,
          screenSharing: false,
        },
      }),
    ).toBe(true)
  })

  test('accepts a participant media state event', () => {
    expect(Check(ServerMessageSchema, {
      type: 'participant.media.updated',
      participant: {
        id: 'participant-1',
        displayName: 'Alice',
        microphoneMuted: false,
        screenSharing: true,
      },
    })).toBe(true)
  })

  test('rejects unknown error codes', () => {
    expect(
      Check(ServerMessageSchema, {
        type: 'error',
        code: 'RAW_STACK_TRACE',
        message: 'nope',
      }),
    ).toBe(false)
  })

  test('accepts a chat event', () => {
    expect(
      Check(ServerMessageSchema, {
        type: 'chat.message',
        message: {
          id: 'message-1',
          roomId: 'room-1',
          author: { id: 'participant-1', displayName: 'Alice' },
          content: 'Hello!',
          createdAt: 1,
        },
      }),
    ).toBe(true)
  })

  test('accepts an RTC signal from a room peer', () => {
    expect(Check(ServerMessageSchema, {
      type: 'rtc.signal',
      sourcePeerId: 'participant-1',
      payload: {
        kind: 'ice-candidate',
        candidate: 'candidate:1 1 UDP 1 127.0.0.1 9000 typ host',
        sdpMid: '0',
        sdpMLineIndex: 0,
      },
    })).toBe(true)
  })
})
