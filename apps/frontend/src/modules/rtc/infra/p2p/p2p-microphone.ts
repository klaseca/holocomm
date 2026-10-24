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
    return this.trackValue
  }

  async close(): Promise<void> {
    ++this.acquisition
    this.active = false
    this.enabled = false
    this.trackValue?.stop()
    this.trackValue = undefined
    this.stream = undefined
    this.requestedSettings = undefined
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

    if (this.trackValue?.readyState === 'live') {
      this.trackValue.enabled = true
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

    if (this.trackValue !== undefined) {
      this.trackValue.enabled = false
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

    // Serialize captures: Chromium can reuse a still-open source's old processing settings.
    const update = async () => {
      if (!this.active || acquisition !== this.acquisition) {
        return
      }

      const track = this.trackValue

      if (track?.readyState === 'live') {
        if (this.hasRequestedSettings()) {
          return
        }

        const settings = this.settings().voice

        let applied = false

        try {
          await applyTrackConstraints(track, this.constraints(settings))
          applied = this.matchesSettings(track, settings)
        } catch {
          // Some processing changes require a new capture source.
        }

        if (!this.active || acquisition !== this.acquisition) {
          return
        }

        if (applied && track.readyState === 'live') {
          this.requestedSettings = settings

          return
        }
      }

      await this.acquire(acquisition)
    }

    const operation = this.operation?.then(update, update) ?? update()

    this.operation = operation

    return operation
  }

  private async acquire(acquisition: number): Promise<void> {
    const settings = this.settings().voice

    const restarting = this.trackValue !== undefined

    // Chromium can reuse the old processing settings while its source is open.
    // Release it before capturing again when applyConstraints was insufficient.
    this.trackValue?.stop()
    this.trackValue = undefined
    this.stream = undefined
    this.requestedSettings = undefined

    if (restarting) {
      this.emitStream(undefined)
    } else {
      this.emitState('requesting')
    }

    let acquiredStream: MediaStream | undefined

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: this.constraints(settings),
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
      this.requestedSettings = settings
      track.enabled = this.enabled
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
      this.emitState(this.enabled ? 'enabled' : 'muted')
    } catch (error) {
      if (acquisition !== this.acquisition) {
        acquiredStream && stopStream(acquiredStream)

        return
      }

      if (acquiredStream != null) {
        if (this.stream === acquiredStream) {
          this.trackValue = undefined
          this.stream = undefined
          this.requestedSettings = undefined
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

      this.active = false
      this.emitState(microphoneError.reason === 'denied' ? 'denied' : 'error')
      throw microphoneError
    }
  }

  private hasRequestedSettings(): boolean {
    const settings = this.settings().voice

    return this.requestedSettings?.autoGainControl === settings.autoGainControl
      && this.requestedSettings.echoCancellation === settings.echoCancellation
      && this.requestedSettings.noiseSuppression === settings.noiseSuppression
  }

  private matchesSettings(track: MediaStreamTrack, settings: RtcMediaSettings['voice']): boolean {
    const actual = track.getSettings()

    // Unreported properties cannot be verified and must not force a restart.
    return (actual.autoGainControl === undefined
      || actual.autoGainControl === settings.autoGainControl)
    && (actual.echoCancellation === undefined
      || Boolean(actual.echoCancellation) === settings.echoCancellation)
    && (actual.noiseSuppression === undefined
      || actual.noiseSuppression === settings.noiseSuppression)
  }

  private constraints(settings: RtcMediaSettings['voice']): MediaTrackConstraints {
    return {
      autoGainControl: settings.autoGainControl,
      channelCount: { ideal: 1 },
      echoCancellation: settings.echoCancellation,
      noiseSuppression: settings.noiseSuppression,
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
