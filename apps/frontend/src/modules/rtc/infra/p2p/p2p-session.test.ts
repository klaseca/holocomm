import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { DEFAULT_RTC_MEDIA_SETTINGS } from '../../application/media-settings.ts'
import type { RtcSignal } from '../../domain/rtc-signal.ts'
import { P2pSession } from './p2p-session.ts'

const connections: FakePeerConnection[] = []

class FakePeerConnection {
  connectionState: RTCPeerConnectionState = 'new'

  localDescription: RTCSessionDescription | null = null

  remoteDescription: RTCSessionDescription | null = null

  readonly addedCandidates: RTCIceCandidateInit[] = []

  readonly replacementTracks: Array<MediaStreamTrack | null> = []

  readonly senderParameters: RTCRtpSendParameters[] = []

  readonly offerOptions: Array<RTCOfferOptions | undefined> = []

  dataChannelCreated = false

  restartIce = vi.fn()

  readonly listeners = new Map<string, Array<(event: never) => void>>()

  readonly transceivers: Array<Pick<RTCRtpTransceiver, 'direction' | 'sender'>> = []

  constructor() {
    connections.push(this)
  }

  addEventListener(type: string, listener: (event: never) => void): void {
    const listeners = this.listeners.get(type) ?? []

    listeners.push(listener)
    this.listeners.set(type, listeners)
  }

  addTransceiver(): Pick<RTCRtpTransceiver, 'direction' | 'sender'> {
    const senderIndex = this.transceivers.length

    const initialParameters = { encodings: [{}] } as RTCRtpSendParameters

    this.senderParameters[senderIndex] = initialParameters

    const transceiver = {
      direction: 'sendrecv' as RTCRtpTransceiverDirection,
      sender: {
        getParameters: () => this.senderParameters[senderIndex] ?? initialParameters,
        replaceTrack: async (track: MediaStreamTrack | null) => {
          this.replacementTracks.push(track)
        },
        setParameters: async (parameters: RTCRtpSendParameters) => {
          this.senderParameters[senderIndex] = parameters
        },
      } as RTCRtpSender,
    }

    this.transceivers.push(transceiver)

    return transceiver
  }

  createDataChannel(): Pick<RTCDataChannel, 'close'> {
    this.dataChannelCreated = true

    return { close() {} }
  }

  async createOffer(options?: RTCOfferOptions): Promise<RTCSessionDescriptionInit> {
    this.offerOptions.push(options)

    return { type: 'offer', sdp: 'offer-sdp' }
  }

  async createAnswer(): Promise<RTCSessionDescriptionInit> {
    return { type: 'answer', sdp: 'answer-sdp' }
  }

  async setLocalDescription(description: RTCSessionDescriptionInit): Promise<void> {
    this.localDescription = description as RTCSessionDescription
  }

  async setRemoteDescription(description: RTCSessionDescriptionInit): Promise<void> {
    this.remoteDescription = description as RTCSessionDescription

    if (description.type === 'offer' && this.transceivers.length === 0) {
      this.addTransceiver()
      this.addTransceiver()
      this.addTransceiver()
    }
  }

  getTransceivers(): RTCRtpTransceiver[] {
    return this.transceivers as RTCRtpTransceiver[]
  }

  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    this.addedCandidates.push(candidate)
  }

  close(): void {}

  emitConnectionState(state: RTCPeerConnectionState): void {
    this.connectionState = state
    for (const listener of this.listeners.get('connectionstatechange') ?? []) {
      listener(new Event('connectionstatechange') as never)
    }
  }

  emitTrack(track: MediaStreamTrack, transceiverIndex: number): void {
    const event = {
      streams: [],
      track,
      transceiver: this.transceivers[transceiverIndex],
    }

    for (const listener of this.listeners.get('track') ?? []) {
      listener(event as never)
    }
  }
}

beforeEach(() => {
  connections.length = 0
  vi.stubGlobal('RTCPeerConnection', FakePeerConnection)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('p2pSession', () => {
  test('creates a data channel and sends an offer for a joining peer', async () => {
    const sent: Array<{ peerId: string, payload: RtcSignal }> = []

    const session = new P2pSession({
      send(peerId, payload) {
        sent.push({ peerId, payload })

        return true
      },
    }, {})

    await session.joinPeer('bob')

    expect(connections[0]?.dataChannelCreated).toBe(true)
    expect(sent).toEqual([{ peerId: 'bob', payload: { kind: 'offer', sdp: 'offer-sdp' } }])
  })

  test('queues an early ICE candidate and replies to an offer with an answer', async () => {
    const sent: RtcSignal[] = []

    const session = new P2pSession({
      send(_peerId, payload) {
        sent.push(payload)

        return true
      },
    }, {})

    await session.handleSignal('alice', {
      kind: 'ice-candidate',
      candidate: 'candidate-1',
      sdpMid: '0',
      sdpMLineIndex: 0,
    })
    await session.handleSignal('alice', {
      kind: 'ice-candidate',
      candidate: 'candidate-1',
      sdpMid: '0',
      sdpMLineIndex: 0,
    })
    expect(connections[0]?.addedCandidates).toEqual([])

    await session.handleSignal('alice', { kind: 'offer', sdp: 'offer-sdp' })

    expect(connections[0]?.addedCandidates).toEqual([{
      candidate: 'candidate-1',
      sdpMid: '0',
      sdpMLineIndex: 0,
      usernameFragment: undefined,
    }])
    expect(sent).toEqual([{ kind: 'answer', sdp: 'answer-sdp' }])
  })

  test('answers on the offered transceivers and publishes the local microphone', async () => {
    const track = createMediaTrack('audio')

    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue({
          getAudioTracks: () => [track],
          getTracks: () => [track],
        }),
      },
    })

    const session = new P2pSession({ send: () => true }, {})

    await session.enableMicrophone()
    await session.handleSignal('alice', { kind: 'offer', sdp: 'offer-sdp' })

    expect(connections[0]?.transceivers).toHaveLength(3)
    expect(connections[0]?.transceivers.map(transceiver => transceiver.direction)).toEqual([
      'sendrecv',
      'sendrecv',
      'sendrecv',
    ])
    expect(connections[0]?.replacementTracks).toEqual([track, null, null])
  })

  test('publishes and mutes a microphone track without renegotiating', async () => {
    const track = {
      enabled: true,
      kind: 'audio',
      readyState: 'live',
      stop: vi.fn(),
    } as unknown as MediaStreamTrack

    const stream = {
      getAudioTracks: () => [track],
      getTracks: () => [track],
    } as unknown as MediaStream

    const getUserMedia = vi.fn().mockResolvedValue(stream)

    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia,
      },
    })

    const session = new P2pSession({ send: () => true }, {})

    const states: string[] = []

    const localStreams: Array<MediaStream | undefined> = []

    session.subscribeMicrophone(state => states.push(state))
    session.subscribeLocalAudio(localStream => localStreams.push(localStream))
    await session.joinPeer('bob')

    await session.enableMicrophone()
    await session.disableMicrophone()

    expect(getUserMedia).toHaveBeenCalledWith({
      audio: {
        autoGainControl: true,
        channelCount: { ideal: 1 },
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: { ideal: 48_000 },
      },
      video: false,
    })
    expect(connections[0]?.replacementTracks).toEqual([track])
    expect(track.enabled).toBe(false)
    expect(states).toEqual(['requesting', 'enabled', 'muted'])
    expect(localStreams).toEqual([stream])
  })

  test('reports denied microphone permission', async () => {
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: vi.fn().mockRejectedValue(new DOMException('Denied', 'NotAllowedError')),
      },
    })

    const session = new P2pSession({ send: () => true }, {})

    const states: string[] = []

    session.subscribeMicrophone(state => states.push(state))

    await expect(session.enableMicrophone()).rejects.toMatchObject({ reason: 'denied' })
    expect(states).toEqual(['requesting', 'denied'])
  })

  test('stops a microphone stream that resolves after the session closes', async () => {
    const track = createMediaTrack('audio')

    const stream = createDeferredMediaStream([track])

    vi.stubGlobal('navigator', {
      mediaDevices: { getUserMedia: vi.fn().mockReturnValue(stream.promise) },
    })

    const session = new P2pSession({ send: () => true }, {})

    const states: string[] = []

    session.subscribeMicrophone(state => states.push(state))

    const enabling = session.enableMicrophone()

    await session.close()
    stream.resolve()
    await enabling

    expect(track.stop.mock.calls).toHaveLength(1)
    expect(states).toEqual(['requesting', 'off'])
  })

  test('publishes and stops a screen track without renegotiating', async () => {
    const track = createMediaTrack('video')

    const audioTrack = createMediaTrack('audio')

    const stream = {
      getVideoTracks: () => [track],
      getAudioTracks: () => [audioTrack],
      getTracks: () => [track, audioTrack],
    } as unknown as MediaStream

    const getDisplayMedia = vi.fn().mockResolvedValue(stream)

    vi.stubGlobal('navigator', {
      mediaDevices: {
        getDisplayMedia,
      },
    })

    const session = new P2pSession({ send: () => true }, {})

    const states: string[] = []

    const localStreams: Array<MediaStream | undefined> = []

    session.subscribeScreenShare(state => states.push(state))
    session.subscribeLocalScreen(localStream => localStreams.push(localStream))
    await session.joinPeer('bob')

    await session.startScreenShare()
    await session.stopScreenShare()

    expect(getDisplayMedia).toHaveBeenCalledWith({
      video: {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 30, max: 30 },
      },
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        channelCount: { ideal: 2 },
        sampleRate: { ideal: 48_000 },
      },
    })
    expect(connections[0]?.senderParameters[0]?.encodings[0]?.maxBitrate).toBe(64_000)
    expect(connections[0]?.senderParameters[1]?.encodings[0]?.maxBitrate).toBe(5_000_000)
    expect(connections[0]?.senderParameters[2]?.encodings[0]?.maxBitrate).toBe(256_000)
    expect(connections[0]?.senderParameters[1]?.degradationPreference).toBe('maintain-framerate')
    expect(connections[0]?.replacementTracks).toEqual([track, audioTrack, null, null])
    expect(track.stop.mock.calls).toHaveLength(1)
    expect(audioTrack.stop.mock.calls).toHaveLength(1)
    expect(states).toEqual(['requesting', 'sharing', 'off'])
    expect(localStreams).toEqual([stream, undefined])
  })

  test('applies optional processing and bitrate to shared audio', async () => {
    const track = createMediaTrack('video')

    const audioTrack = createMediaTrack('audio')

    const getDisplayMedia = vi.fn().mockResolvedValue({
      getVideoTracks: () => [track],
      getAudioTracks: () => [audioTrack],
      getTracks: () => [track, audioTrack],
    })

    vi.stubGlobal('navigator', { mediaDevices: { getDisplayMedia } })

    const session = new P2pSession({ send: () => true }, {}, {
      mediaSettings: {
        ...DEFAULT_RTC_MEDIA_SETTINGS,
        screenAudio: {
          autoGainControl: true,
          enabled: true,
          echoCancellation: true,
          maxBitrate: 128_000,
          noiseSuppression: true,
          stereo: false,
        },
      },
    })

    await session.joinPeer('bob')

    await session.startScreenShare()

    expect(getDisplayMedia).toHaveBeenCalledWith({
      video: {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 30, max: 30 },
      },
      audio: {
        autoGainControl: true,
        channelCount: { ideal: 1 },
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: { ideal: 48_000 },
      },
    })
    expect(connections[0]?.senderParameters[2]?.encodings[0]?.maxBitrate).toBe(128_000)
  })

  test('cleans up when the browser-native screen sharing control stops', async () => {
    const track = createMediaTrack('video')

    vi.stubGlobal('navigator', {
      mediaDevices: {
        getDisplayMedia: vi.fn().mockResolvedValue({
          getVideoTracks: () => [track],
          getAudioTracks: () => [],
          getTracks: () => [track],
        }),
      },
    })

    const session = new P2pSession({ send: () => true }, {})

    const states: string[] = []

    session.subscribeScreenShare(state => states.push(state))
    await session.joinPeer('bob')
    await session.startScreenShare()

    track.end()

    await vi.waitFor(() => expect(states.at(-1)).toBe('off'))
    expect(connections[0]?.replacementTracks.at(-1)).toBe(null)
  })

  test('stops a screen stream that resolves after the session closes', async () => {
    const track = createMediaTrack('video')

    const stream = createDeferredMediaStream([track])

    vi.stubGlobal('navigator', {
      mediaDevices: { getDisplayMedia: vi.fn().mockReturnValue(stream.promise) },
    })

    const session = new P2pSession({ send: () => true }, {})

    const states: string[] = []

    session.subscribeScreenShare(state => states.push(state))

    const sharing = session.startScreenShare()

    await session.close()
    stream.resolve()
    await sharing

    expect(track.stop.mock.calls).toHaveLength(1)
    expect(states).toEqual(['requesting', 'off'])
  })

  test('reports a peer that does not connect before the RTC timeout', async () => {
    vi.useFakeTimers()

    const session = new P2pSession({ send: () => true }, {}, { connectionTimeoutMs: 100 })

    const states: string[] = []

    session.subscribePeerState((_peerId, state) => states.push(state))

    await session.joinPeer('bob')
    await vi.advanceTimersByTimeAsync(100)

    expect(states).toEqual(['connecting', 'failed'])
    await session.close()
  })

  test('restarts ICE for an initiating peer after the connection fails', async () => {
    vi.useFakeTimers()

    const sent: RtcSignal[] = []

    const session = new P2pSession({
      send(_peerId, payload) {
        sent.push(payload)

        return true
      },
    }, {})

    await session.joinPeer('bob')

    connections[0]?.emitConnectionState('failed')
    await vi.advanceTimersByTimeAsync(0)

    expect(connections[0]?.restartIce).toHaveBeenCalledOnce()
    expect(connections[0]?.offerOptions).toEqual([undefined, { iceRestart: true }])
    expect(sent).toHaveLength(2)
    await session.close()
  })

  test('adds shared audio to the remote screen stream instead of microphone audio', async () => {
    vi.stubGlobal('MediaStream', FakeMediaStream)

    const session = new P2pSession({ send: () => true }, {})

    const screens: MediaStream[] = []

    const microphoneStreams: MediaStream[] = []

    session.subscribeRemoteScreen((_peerId, stream) => {
      if (stream != null) {
        screens.push(stream)
      }
    })
    session.subscribeRemoteAudio((_peerId, stream) => {
      if (stream != null) {
        microphoneStreams.push(stream)
      }
    })
    await session.handleSignal('alice', { kind: 'offer', sdp: 'offer-sdp' })

    connections[0]?.emitTrack(createMediaTrack('video'), 1)
    connections[0]?.emitTrack(createMediaTrack('audio'), 2)

    expect(screens).toHaveLength(1)
    expect(screens[0]?.getTracks().map(track => track.kind)).toEqual(['video', 'audio'])
    expect(microphoneStreams).toEqual([])
  })

  test('publishes a received microphone track as remote audio', async () => {
    vi.stubGlobal('MediaStream', FakeMediaStream)

    const session = new P2pSession({ send: () => true }, {})

    const remoteStreams: MediaStream[] = []

    session.subscribeRemoteAudio((_peerId, stream) => {
      if (stream != null) {
        remoteStreams.push(stream)
      }
    })
    await session.handleSignal('alice', { kind: 'offer', sdp: 'offer-sdp' })

    connections[0]?.emitTrack(createMediaTrack('audio'), 0)

    expect(remoteStreams).toHaveLength(1)
    expect(remoteStreams[0]?.getTracks().map(track => track.kind)).toEqual(['audio'])
  })
})

class FakeMediaStream {
  private readonly tracks: MediaStreamTrack[]

  constructor(tracks: MediaStreamTrack[] = []) {
    this.tracks = [...tracks]
  }

  addTrack(track: MediaStreamTrack): void {
    this.tracks.push(track)
  }

  getTracks(): MediaStreamTrack[] {
    return [...this.tracks]
  }

  removeTrack(track: MediaStreamTrack): void {
    const index = this.tracks.indexOf(track)

    if (index >= 0) {
      this.tracks.splice(index, 1)
    }
  }
}

let trackSequence = 0

function createMediaTrack(
  kind: 'audio' | 'video',
): MediaStreamTrack & { end: () => void, stop: ReturnType<typeof vi.fn> } {
  let endedListener: (() => void) | undefined

  const track = {
    enabled: true,
    id: `${kind}-${++trackSequence}`,
    kind,
    muted: false,
    readyState: 'live',
    stop: vi.fn(),
    addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
      if (type !== 'ended') {
        return
      }

      endedListener = typeof listener === 'function'
        ? () => listener(new Event('ended'))
        : () => listener.handleEvent(new Event('ended'))
    },
    end() {
      endedListener?.()
    },
  }

  return track as unknown as MediaStreamTrack & {
    end: () => void
    stop: ReturnType<typeof vi.fn>
  }
}

function createDeferredMediaStream(tracks: MediaStreamTrack[]) {
  let resolvePromise: ((stream: MediaStream) => void) | undefined

  const stream = {
    getAudioTracks: () => tracks.filter(track => track.kind === 'audio'),
    getVideoTracks: () => tracks.filter(track => track.kind === 'video'),
    getTracks: () => tracks,
  } as unknown as MediaStream

  const promise = new Promise<MediaStream>((resolve) => {
    resolvePromise = resolve
  })

  return {
    promise,
    resolve: () => resolvePromise?.(stream),
  }
}
