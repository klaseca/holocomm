import type { ClientMessage, ServerMessage } from '@holocomm/protocol'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { createRoomSession } from './use-room-session.ts'

const sockets: FakeWebSocket[] = []

const microphoneTracks: Array<{
  readyState: MediaStreamTrackState
  stop: ReturnType<typeof vi.fn>
}> = []

class FakeWebSocket extends EventTarget {
  static readonly CLOSED = 3

  static readonly CONNECTING = 0

  static readonly OPEN = 1

  readonly sent: ClientMessage[] = []

  readyState = FakeWebSocket.CONNECTING

  constructor() {
    super()
    sockets.push(this)
  }

  open(): void {
    this.readyState = FakeWebSocket.OPEN
    this.dispatchEvent(new Event('open'))
  }

  receive(message: ServerMessage): void {
    this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(message) }))
  }

  send(payload: string): void {
    this.sent.push(JSON.parse(payload) as ClientMessage)
  }

  close(): void {
    if (this.readyState === FakeWebSocket.CLOSED) {
      return
    }

    this.readyState = FakeWebSocket.CLOSED
    this.dispatchEvent(new CloseEvent('close'))
  }
}

beforeEach(() => {
  sockets.length = 0
  microphoneTracks.length = 0
  vi.stubGlobal('WebSocket', FakeWebSocket)
  vi.stubGlobal('window', {
    location: { host: 'localhost:5173', protocol: 'http:' },
  })
  vi.stubGlobal('navigator', {
    mediaDevices: {
      getUserMedia: vi.fn(async () => {
        const track = {
          enabled: true,
          readyState: 'live' as const,
          stop: vi.fn(),
        }

        microphoneTracks.push(track)

        return {
          getAudioTracks: () => [track],
          getTracks: () => [track],
        }
      }),
    },
  })
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('room session orchestration', () => {
  test('joins, accepts a snapshot, and sends chat only through an open socket', async () => {
    const session = createRoomSession(
      'ws://localhost:3000/ws',
      ['stun:stun.l.google.com:19302'],
    )

    session.connect('gaming-tonight', 'Alice')
    await vi.waitFor(() => expect(sockets).toHaveLength(1))

    expect(session.sendChat('before open')).toBe(false)
    sockets[0].open()
    expect(sockets[0].sent[0]).toEqual({
      type: 'room.join',
      room: 'gaming-tonight',
      displayName: 'Alice',
    })
    sockets[0].receive(snapshot('alice'))

    expect(session.connectionState.value).toBe('connected')
    expect(session.sendChat('hello')).toBe(true)
    expect(sockets[0].sent.at(-1)).toEqual({ type: 'chat.send', content: 'hello' })
    session.destroy()
  })

  test('cleans media and creates a fresh socket after a connection loss', async () => {
    vi.useFakeTimers()

    const session = createRoomSession(
      'ws://localhost:3000/ws',
      ['stun:stun.l.google.com:19302'],
    )

    session.connect('gaming-tonight', 'Alice')
    await vi.advanceTimersByTimeAsync(0)
    sockets[0].open()
    sockets[0].receive(snapshot('alice'))
    await vi.waitFor(() => expect(session.microphoneState.value).toBe('enabled'))

    sockets[0].close()
    expect(session.connectionState.value).toBe('reconnecting')
    await vi.advanceTimersByTimeAsync(500)
    await vi.waitFor(() => expect(sockets).toHaveLength(2))

    expect(microphoneTracks[0]?.stop).toHaveBeenCalledOnce()
    sockets[1].open()
    sockets[1].receive(snapshot('alice-reconnected'))
    expect(session.connectionState.value).toBe('connected')
    session.destroy()
  })
})

function snapshot(participantId: string): ServerMessage {
  const participant = {
    id: participantId,
    displayName: 'Alice',
    microphoneMuted: false,
    screenSharing: false,
  }

  return {
    type: 'room.snapshot',
    room: { id: 'room-id', slug: 'gaming-tonight' },
    self: participant,
    participants: [participant],
  }
}
