import type { RtcMediaSettings } from '../../application/media-settings.ts'
import { MicrophoneAccessError, type MicrophoneState } from '../../domain/voice.ts'
import {
  applySenderBitrate,
  applyTrackConstraints,
  type P2pMediaPeer,
  stopStream,
} from './p2p-media-utils.ts'

export class P2pMicrophone {
  private trackValue: MediaStreamTrack | undefined

  private stream: MediaStream | undefined

  private acquisition = 0

  private readonly stateListeners = new Set<(state: MicrophoneState) => void>()

  private readonly streamListeners = new Set<(stream: MediaStream | undefined) => void>()

  private readonly settings: () => RtcMediaSettings

  private readonly peers: () => Iterable<P2pMediaPeer>

  constructor(
    settings: () => RtcMediaSettings,
    peers: () => Iterable<P2pMediaPeer>,
  ) {
    this.settings = settings
    this.peers = peers
  }

  get track(): MediaStreamTrack | undefined {
    return this.trackValue
  }

  async close(): Promise<void> {
    ++this.acquisition
    this.trackValue?.stop()
    this.trackValue = undefined
    this.stream = undefined
    this.emitStream(undefined)
    this.emitState('off')
  }

  async applySettings(): Promise<void> {
    if (this.trackValue?.readyState === 'live') {
      await applyTrackConstraints(this.trackValue, this.constraints())
    }
  }

  async enable(): Promise<void> {
    if (this.trackValue?.readyState === 'live') {
      this.trackValue.enabled = true
      this.emitStream(this.stream)
      this.emitState('enabled')

      return
    }

    const acquisition = ++this.acquisition

    let acquiredStream: MediaStream | undefined

    this.emitState('requesting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: this.constraints(),
        video: false,
      })

      acquiredStream = stream

      if (acquisition !== this.acquisition) {
        stopStream(stream)

        return
      }

      const track = stream.getAudioTracks()[0]

      if (track === undefined) {
        stopStream(stream)
        throw new MicrophoneAccessError('unavailable', 'No microphone track was provided')
      }

      this.trackValue = track
      this.stream = stream
      await Promise.all([...this.peers()].map(async peer => (
        peer.microphoneSender?.replaceTrack(track)
      )))
      await Promise.all([...this.peers()].map(async peer => (
        applySenderBitrate(peer.microphoneSender, this.settings().voice.maxBitrate)
      )))

      if (acquisition !== this.acquisition) {
        if (this.trackValue === track) {
          this.trackValue = undefined
          this.stream = undefined
        }

        stopStream(stream)

        return
      }

      this.emitStream(stream)
      this.emitState('enabled')
    } catch (error) {
      if (acquisition !== this.acquisition) {
        acquiredStream && stopStream(acquiredStream)

        return
      }

      if (acquiredStream != null) {
        if (this.stream === acquiredStream) {
          this.trackValue = undefined
          this.stream = undefined
        }

        stopStream(acquiredStream)
      }

      const denied = error instanceof DOMException
        && (error.name === 'NotAllowedError' || error.name === 'SecurityError')

      const microphoneError = error instanceof MicrophoneAccessError
        ? error
        : new MicrophoneAccessError(
            denied ? 'denied' : 'unavailable',
            denied ? 'Microphone permission was denied' : 'Microphone is unavailable',
          )

      this.emitState(microphoneError.reason === 'denied' ? 'denied' : 'error')
      throw microphoneError
    }
  }

  disable(): void {
    if (this.trackValue !== undefined) {
      this.trackValue.enabled = false
      this.emitState('muted')
    }
  }

  subscribeState(listener: (state: MicrophoneState) => void): () => void {
    this.stateListeners.add(listener)

    return () => this.stateListeners.delete(listener)
  }

  subscribeStream(listener: (stream: MediaStream | undefined) => void): () => void {
    this.streamListeners.add(listener)

    return () => this.streamListeners.delete(listener)
  }

  private constraints(): MediaTrackConstraints {
    return {
      autoGainControl: this.settings().voice.autoGainControl,
      channelCount: { ideal: 1 },
      echoCancellation: this.settings().voice.echoCancellation,
      noiseSuppression: this.settings().voice.noiseSuppression,
      sampleRate: { ideal: 48_000 },
    }
  }

  private emitState(state: MicrophoneState): void {
    for (const listener of this.stateListeners) {
      listener(state)
    }
  }

  private emitStream(stream: MediaStream | undefined): void {
    for (const listener of this.streamListeners) {
      listener(stream)
    }
  }
}
