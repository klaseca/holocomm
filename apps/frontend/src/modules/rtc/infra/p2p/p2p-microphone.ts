import type { RtcMediaSettings } from '../../application/media-settings.ts'
import { MicrophoneAccessError, type MicrophoneState } from '../../domain/voice.ts'
import {
  applySenderBitrate,
  applyTrackConstraints,
  type P2pMediaPeer,
  stopStream,
} from './p2p-media-utils.ts'
import { Rnnoise } from './rnnoise.ts'

export class P2pMicrophone {
  private captureStream: MediaStream | undefined

  private stream: MediaStream | undefined

  private suppression = new Rnnoise()

  private acquisition = 0

  private active = false

  private enabled = false

  private requestedSettings: RtcMediaSettings['voice'] | undefined

  private operation: Promise<void> | undefined

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
    return this.stream?.getAudioTracks()[0]
  }

  async close(): Promise<void> {
    ++this.acquisition
    this.active = false
    this.enabled = false
    this.releaseCapture()
    this.suppression = new Rnnoise()
    this.emitStream(undefined)
    this.emitState('off')
  }

  async applySettings(): Promise<void> {
    if (this.active) {
      await this.updateCapture()
    }
  }

  async enable(): Promise<void> {
    this.active = true
    this.enabled = true

    const captureTrack = this.captureStream?.getAudioTracks()[0]

    if (captureTrack !== undefined) {
      captureTrack.enabled = true
    }

    if (this.track?.readyState === 'live') {
      this.track.enabled = true

      this.emitStream(this.stream)
      this.emitState('enabled')

      if (this.hasRequestedSettings()) {
        return
      }
    }

    await this.updateCapture()
  }

  disable(): void {
    this.enabled = false

    if (this.track !== undefined) {
      this.track.enabled = false
    }

    const captureTrack = this.captureStream?.getAudioTracks()[0]

    if (captureTrack !== undefined) {
      captureTrack.enabled = false
    }

    if (this.active) {
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

  private async updateCapture(): Promise<void> {
    const acquisition = this.acquisition

    const update = async () => {
      if (!this.isCurrent(acquisition) || this.hasRequestedSettings()) {
        return
      }

      try {
        await this.configure(this.settings().voice, acquisition)
      } catch (error) {
        if (!this.isCurrent(acquisition)) {
          return
        }

        this.releaseCapture()
        this.active = false
        this.emitStream(undefined)

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

    // Keep processing changes and capture replacement in order.
    const operation = this.operation?.then(update, update) ?? update()

    this.operation = operation

    return operation
  }

  private async configure(settings: RtcMediaSettings['voice'], acquisition: number): Promise<void> {
    const track = this.captureStream?.getAudioTracks()[0]

    const constraints = this.constraints(settings)

    if (track?.readyState === 'live') {
      let applied = false

      try {
        await applyTrackConstraints(track, constraints)
        applied = this.matchesSettings(track, settings)
      } catch {
        // Some processing changes require a new capture source.
      }

      if (!this.isCurrent(acquisition)) {
        return
      }

      if (applied && track.readyState === 'live') {
        await this.publish(settings, acquisition)

        return
      }
    }

    const restarting = this.captureStream !== undefined

    // Chromium can reuse the old processing settings while its source is open.
    this.releaseCapture()

    if (restarting) {
      this.emitStream(undefined)
    } else {
      this.emitState('requesting')
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: constraints, video: false })

    if (!this.isCurrent(acquisition)) {
      stopStream(stream)

      return
    }

    this.captureStream = stream

    const captureTrack = stream.getAudioTracks()[0]

    if (captureTrack === undefined) {
      throw new MicrophoneAccessError('unavailable', 'No microphone track was provided')
    }

    captureTrack.enabled = this.enabled

    await this.publish(settings, acquisition)
  }

  private async publish(settings: RtcMediaSettings['voice'], acquisition: number): Promise<void> {
    const capture = this.captureStream

    if (capture === undefined) {
      return
    }

    let stream = capture

    if (this.shouldUseRnnoise(settings)) {
      const suppression = this.suppression

      try {
        stream = suppression.stream ?? await suppression.start(capture, () => {
          if (this.suppression !== suppression || !this.isCurrent(acquisition)) {
            return
          }

          this.requestedSettings = undefined
          void this.updateCapture().catch(() => undefined)
        })
      } catch {
        if (!this.isCurrent(acquisition)) {
          return
        }

        await this.configure(settings, acquisition)

        return
      }
    }

    if (!this.isCurrent(acquisition)) {
      return
    }

    if (stream !== this.stream) {
      const track = stream.getAudioTracks()[0]

      if (track === undefined) {
        throw new MicrophoneAccessError('unavailable', 'No microphone track was provided')
      }

      track.enabled = this.enabled
      this.stream = stream
      await Promise.all([...this.peers()].map(async peer => (
        peer.microphoneSender?.replaceTrack(track)
      )))
      await Promise.all([...this.peers()].map(async peer => (
        applySenderBitrate(peer.microphoneSender, this.settings().voice.maxBitrate)
      )))

      if (!this.isCurrent(acquisition)) {
        return
      }

      this.emitStream(stream)
      this.emitState(this.enabled ? 'enabled' : 'muted')
    }

    if (!this.shouldUseRnnoise(settings)) {
      this.suppression.stop()
    }

    this.requestedSettings = settings
  }

  private releaseCapture(): void {
    this.suppression.stop()

    if (this.captureStream !== undefined) {
      stopStream(this.captureStream)
    }

    this.captureStream = undefined
    this.stream = undefined
    this.requestedSettings = undefined
  }

  private isCurrent(acquisition: number): boolean {
    return this.active && acquisition === this.acquisition
  }

  private hasRequestedSettings(): boolean {
    const settings = this.settings().voice

    return this.track?.readyState === 'live'
      && this.captureStream?.getAudioTracks()[0]?.readyState === 'live'
      && this.requestedSettings?.autoGainControl === settings.autoGainControl
      && this.requestedSettings.echoCancellation === settings.echoCancellation
      && this.requestedSettings.noiseSuppression === settings.noiseSuppression
  }

  private shouldUseRnnoise(settings: RtcMediaSettings['voice']): boolean {
    return settings.noiseSuppression && !this.suppression.hasFailed && Rnnoise.isSupported
  }

  private matchesSettings(track: MediaStreamTrack, settings: RtcMediaSettings['voice']): boolean {
    const actual = track.getSettings()

    return (actual.autoGainControl === undefined
      || actual.autoGainControl === settings.autoGainControl)
    && (actual.echoCancellation === undefined
      || Boolean(actual.echoCancellation) === settings.echoCancellation)
    && (actual.noiseSuppression === undefined
      || actual.noiseSuppression === this.constraints(settings).noiseSuppression)
  }

  private constraints(settings: RtcMediaSettings['voice']): MediaTrackConstraints {
    return {
      autoGainControl: settings.autoGainControl,
      channelCount: { ideal: 1 },
      echoCancellation: settings.echoCancellation,
      noiseSuppression: settings.noiseSuppression && !this.shouldUseRnnoise(settings),
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
