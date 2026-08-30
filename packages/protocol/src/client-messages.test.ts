import { Check } from 'typebox/value'
import { describe, expect, test } from 'vitest'

import { ClientMessageSchema } from './client-messages.ts'

describe('clientMessageSchema', () => {
  test('accepts watching a room without joining it', () => {
    expect(Check(ClientMessageSchema, {
      type: 'room.watch',
      room: 'gaming-tonight',
    })).toBe(true)
  })

  test('accepts a valid room join command', () => {
    expect(
      Check(ClientMessageSchema, {
        type: 'room.join',
        room: 'gaming-tonight',
        displayName: 'Alice',
      }),
    ).toBe(true)
  })

  test('rejects an empty display name', () => {
    expect(
      Check(ClientMessageSchema, {
        type: 'room.join',
        room: 'gaming-tonight',
        displayName: '',
      }),
    ).toBe(false)
  })

  test('accepts a bounded chat message', () => {
    expect(Check(ClientMessageSchema, { type: 'chat.send', content: 'Hello!' })).toBe(true)
    expect(Check(ClientMessageSchema, { type: 'chat.send', content: 'a'.repeat(2_001) })).toBe(
      false,
    )
  })

  test('accepts a participant media update', () => {
    expect(Check(ClientMessageSchema, {
      type: 'participant.media.update',
      microphoneMuted: true,
      screenSharing: false,
    })).toBe(true)
  })

  test('validates RTC signaling payloads at the protocol boundary', () => {
    expect(Check(ClientMessageSchema, {
      type: 'rtc.signal',
      targetPeerId: 'bob',
      payload: { kind: 'offer', sdp: 'v=0' },
    })).toBe(true)
    expect(Check(ClientMessageSchema, {
      type: 'rtc.signal',
      targetPeerId: 'bob',
      payload: { kind: 'candidate', candidate: 'unexpected shape' },
    })).toBe(false)
  })
})
