import type { RtcMediaSettings } from '../../application/media-settings.ts'
import { ScreenShareError, type ScreenShareState } from '../../domain/screen-share.ts'
import {
  applySenderBitrate,
  applyTrackConstraints,
  type P2pMediaPeer,
  stopStream,
} from './p2p-media-utils.ts'

export class P2pScreenShare {
  private trackValue: MediaStreamTrack | undefined

  private audioTrackValue: MediaStreamTrack | undefined

  private acquisition = 0

  private readonly stateListeners = new Set<(state: ScreenShareState) => void>()

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

  get audioTrack(): MediaStreamTrack | undefined {
    return this.audioTrackValue
  }

  async applySettings(): Promise<void> {
    const operations: Array<Promise<unknown>> = []

    if (this.trackValue?.readyState === 'live') {
      operations.push(applyTrackConstraints(this.trackValue, this.videoConstraints()))
    }

    if (this.audioTrackValue?.readyState === 'live') {
      if (this.settings().screenAudio.enabled) {
        operations.push(applyTrackConstraints(this.audioTrackValue, this.audioConstraints()))
      } else {
        this.audioTrackValue.stop()
        this.audioTrackValue = undefined
        operations.push(...[...this.peers()].map(async peer => (
          peer.screenAudioSender?.replaceTrack(null)
        )))
      }
    }

    await Promise.allSettled(operations)
  }

  async start(): Promise<void> {
    if (this.trackValue?.readyState === 'live') {
      return
    }

    const acquisition = ++this.acquisition

    let acquiredStream: MediaStream | undefined

    this.emitState('requesting')
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: this.videoConstraints(),
        audio: this.settings().screenAudio.enabled ? this.audioConstraints() : false,
      })

      acquiredStream = stream

      if (acquisition !== this.acquisition) {
        stopStream(stream)

        return
      }

      const track = stream.getVideoTracks()[0]

      if (track === undefined) {
        stopStream(stream)
        throw new ScreenShareError('unavailable', 'No screen video track was provided')
      }

      this.trackValue = track
      track.contentHint = 'detail'
      this.audioTrackValue = stream.getAudioTracks()[0]

      const audioTrack = this.audioTrackValue

      audioTrack?.addEventListener('ended', () => {
        if (this.audioTrackValue !== audioTrack) {
          return
        }

        this.audioTrackValue = undefined
        void Promise.allSettled([...this.peers()].map(async peer => (
          peer.screenAudioSender?.replaceTrack(null)
        )))
      }, { once: true })
      track.addEventListener('ended', () => {
        if (this.trackValue === track) {
          void this.stop().catch(() => this.emitState('error'))
        }
      }, { once: true })

      await Promise.all([...this.peers()].map(async peer => peer.screenSender?.replaceTrack(track)))
      await Promise.all([...this.peers()].map(async peer => (
        applySenderBitrate(
          peer.screenSender,
          this.settings().screen.maxBitrate,
          'maintain-framerate',
        )
      )))

      if (this.audioTrackValue != null) {
        await Promise.all([...this.peers()].map(async peer => (
          peer.screenAudioSender?.replaceTrack(this.audioTrackValue ?? null)
        )))
        await Promise.all([...this.peers()].map(async peer => (
          applySenderBitrate(peer.screenAudioSender, this.settings().screenAudio.maxBitrate)
        )))
      }

      if (acquisition !== this.acquisition) {
        if (this.trackValue === track) {
          this.trackValue = undefined
          this.audioTrackValue = undefined
        }

        stopStream(stream)

        return
      }

      this.emitStream(stream)
      this.emitState('sharing')
    } catch (error) {
      if (acquisition !== this.acquisition) {
        if (acquiredStream != null) {
          stopStream(acquiredStream)
        }

        return
      }

      const denied = error instanceof DOMException
        && (error.name === 'NotAllowedError' || error.name === 'SecurityError')

      const screenShareError = error instanceof ScreenShareError
        ? error
        : new ScreenShareError(
            denied ? 'denied' : 'unavailable',
            denied ? 'Screen sharing permission was denied' : 'Screen sharing is unavailable',
          )

      const failedTrack = this.trackValue

      const failedAudioTrack = this.audioTrackValue

      this.trackValue = undefined
      this.audioTrackValue = undefined
      await Promise.allSettled([...this.peers()].map(async peer => (
        peer.screenSender?.replaceTrack(null)
      )))
      await Promise.allSettled([...this.peers()].map(async peer => (
        peer.screenAudioSender?.replaceTrack(null)
      )))
      failedTrack?.stop()
      failedAudioTrack?.stop()
      this.emitStream(undefined)
      this.emitState(screenShareError.reason === 'denied' ? 'denied' : 'error')
      throw screenShareError
    }
  }

  async stop(): Promise<void> {
    ++this.acquisition

    const track = this.trackValue

    const audioTrack = this.audioTrackValue

    if (track === undefined && audioTrack === undefined) {
      this.emitStream(undefined)
      this.emitState('off')

      return
    }

    this.trackValue = undefined
    this.audioTrackValue = undefined
    try {
      await Promise.all([...this.peers()].map(async (peer) => {
        await peer.screenSender?.replaceTrack(null)
        await peer.screenAudioSender?.replaceTrack(null)
      }))
    } finally {
      track?.stop()
      audioTrack?.stop()
      this.emitStream(undefined)
      this.emitState('off')
    }
  }

  subscribeState(listener: (state: ScreenShareState) => void): () => void {
    this.stateListeners.add(listener)

    return () => this.stateListeners.delete(listener)
  }

  subscribeStream(listener: (stream: MediaStream | undefined) => void): () => void {
    this.streamListeners.add(listener)

    return () => this.streamListeners.delete(listener)
  }

  private videoConstraints(): MediaTrackConstraints {
    return {
      width: { ideal: this.settings().screen.width },
      height: { ideal: this.settings().screen.height },
      frameRate: {
        ideal: this.settings().screen.frameRate,
        max: this.settings().screen.frameRate,
      },
    }
  }

  private audioConstraints(): MediaTrackConstraints {
    return {
      autoGainControl: this.settings().screenAudio.autoGainControl,
      channelCount: { ideal: this.settings().screenAudio.stereo ? 2 : 1 },
      echoCancellation: this.settings().screenAudio.echoCancellation,
      noiseSuppression: this.settings().screenAudio.noiseSuppression,
      sampleRate: { ideal: 48_000 },
    }
  }

  private emitState(state: ScreenShareState): void {
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
