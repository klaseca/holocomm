import type { RtcMediaSettings } from '../../application/media-settings.ts'
import { ScreenShareError, type ScreenShareState } from '../../domain/screen-share.ts'
import { isSupportsOwnAudioRestriction } from '../screen-capture-capabilities.ts'
import {
  applySenderBitrate,
  applyTrackConstraints,
  type P2pMediaPeer,
  stopStream,
} from './p2p-media-utils.ts'

export class P2pScreenShare {
  private trackValue: MediaStreamTrack | undefined

  private audioTrackValue: MediaStreamTrack | undefined

  private audioSettings: RtcMediaSettings['screenAudio'] | undefined

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
    return this.audioTrackValue?.enabled ? this.audioTrackValue : undefined
  }

  async applySettings(): Promise<void> {
    if (this.trackValue?.readyState !== 'live') {
      return
    }

    await Promise.allSettled([
      applyTrackConstraints(this.trackValue, this.videoConstraints()),
      this.applyAudioSettings(),
    ])
  }

  async start(): Promise<void> {
    if (this.trackValue?.readyState === 'live') {
      return
    }

    const acquisition = ++this.acquisition

    let acquiredStream: MediaStream | undefined

    const audioSettings = this.settings().screenAudio

    this.emitState('requesting')
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: this.videoConstraints(),
        audio: audioSettings.enabled ? this.audioConstraints(audioSettings) : false,
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
      this.audioSettings = audioSettings

      const audioTrack = this.audioTrackValue

      if (audioTrack !== undefined) {
        audioTrack.enabled = this.settings().screenAudio.enabled
      }

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
        )
      )))

      if (this.audioTrack != null) {
        await Promise.all([...this.peers()].map(async peer => (
          peer.screenAudioSender?.replaceTrack(this.audioTrack ?? null)
        )))
        await Promise.all([...this.peers()].map(async peer => (
          applySenderBitrate(peer.screenAudioSender, this.settings().screenAudio.maxBitrate)
        )))
      }

      if (acquisition !== this.acquisition) {
        if (this.trackValue === track) {
          this.trackValue = undefined
          this.audioTrackValue = undefined
          this.audioSettings = undefined
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
      this.audioSettings = undefined
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
    const acquisition = ++this.acquisition

    const track = this.trackValue

    const audioTrack = this.audioTrackValue

    this.audioSettings = undefined

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

      if (acquisition === this.acquisition) {
        this.emitStream(undefined)
        this.emitState('off')
      }
    }
  }

  private async applyAudioSettings(): Promise<void> {
    const settings = this.settings().screenAudio

    const previous = this.audioSettings

    const track = this.audioTrackValue

    const acquisition = this.acquisition

    if (track?.readyState === 'live' && track.enabled !== settings.enabled) {
      track.enabled = settings.enabled

      if (previous !== undefined) {
        this.audioSettings = { ...previous, enabled: settings.enabled }
      }

      await Promise.all([...this.peers()].map(async peer => (
        peer.screenAudioSender?.replaceTrack(settings.enabled ? track : null)
      )))
    }

    if (!settings.enabled || acquisition !== this.acquisition) {
      if (previous !== undefined && acquisition === this.acquisition) {
        this.audioSettings = { ...previous, enabled: settings.enabled }
      }

      return
    }

    if (track?.readyState === 'live' && previous !== undefined) {
      const restrictionChanged = isSupportsOwnAudioRestriction(track)
        && previous.restrictOwnAudio !== settings.restrictOwnAudio

      if (!restrictionChanged
        && previous.autoGainControl === settings.autoGainControl
        && previous.echoCancellation === settings.echoCancellation
        && previous.noiseSuppression === settings.noiseSuppression
        && previous.stereo === settings.stereo) {
        return
      }

      // Restriction selects the source at capture time. Applying it live can
      // change reported settings without changing which audio is captured.
      if (!restrictionChanged) {
        const liveSettings = { ...settings, restrictOwnAudio: previous.restrictOwnAudio }

        try {
          await applyTrackConstraints(track, this.audioConstraints(liveSettings))

          if (this.matchesAudioSettings(track, liveSettings)) {
            if (acquisition === this.acquisition) {
              this.audioSettings = liveSettings
            }

            return
          }
        } catch {
          // Some processing changes require a fresh capture source.
        }
      }
    } else if (previous?.enabled !== false) {
      // Do not reprompt for an audio track the user did not include in the picker.
      return
    }

    if (acquisition !== this.acquisition) {
      return
    }

    // Chromium may reuse the old audio processing while its source is open.
    const stopping = this.stop()

    const restartAcquisition = this.acquisition

    await stopping

    if (restartAcquisition === this.acquisition) {
      await this.start()
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

  private matchesAudioSettings(
    track: MediaStreamTrack,
    settings: RtcMediaSettings['screenAudio'],
  ): boolean {
    const actual = track.getSettings()

    return (actual.autoGainControl === undefined
      || actual.autoGainControl === settings.autoGainControl)
    && (actual.echoCancellation === undefined
      || Boolean(actual.echoCancellation) === settings.echoCancellation)
    && (actual.noiseSuppression === undefined
      || actual.noiseSuppression === settings.noiseSuppression)
    && (actual.channelCount === undefined || actual.channelCount === (settings.stereo ? 2 : 1))
  }

  private audioConstraints(settings: RtcMediaSettings['screenAudio']): MediaTrackConstraints {
    return {
      autoGainControl: settings.autoGainControl,
      channelCount: { ideal: settings.stereo ? 2 : 1 },
      echoCancellation: settings.echoCancellation,
      noiseSuppression: settings.noiseSuppression,
      sampleRate: { ideal: 48_000 },
      ...(isSupportsOwnAudioRestriction()
        ? { restrictOwnAudio: settings.restrictOwnAudio }
        : {}),
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
