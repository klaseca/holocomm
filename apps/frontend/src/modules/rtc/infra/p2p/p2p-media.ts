import { DEFAULT_RTC_MEDIA_SETTINGS, type RtcMediaSettings } from '../../application/media-settings.ts'
import type { ScreenShareState } from '../../domain/screen-share.ts'
import type { MicrophoneState } from '../../domain/voice.ts'
import {
  applySenderBitrate,
  type P2pMediaPeer,
} from './p2p-media-utils.ts'
import { P2pMicrophone } from './p2p-microphone.ts'
import { P2pScreenShare } from './p2p-screen-share.ts'

export type { P2pMediaPeer } from './p2p-media-utils.ts'

export class P2pMedia {
  private mediaSettings: RtcMediaSettings

  private readonly microphone: P2pMicrophone

  private readonly screenShare: P2pScreenShare

  private readonly peers: () => Iterable<P2pMediaPeer>

  constructor(
    settings: RtcMediaSettings | undefined,
    peers: () => Iterable<P2pMediaPeer>,
  ) {
    this.mediaSettings = settings ?? DEFAULT_RTC_MEDIA_SETTINGS
    this.peers = peers

    const currentSettings = () => this.mediaSettings

    this.microphone = new P2pMicrophone(currentSettings, peers)
    this.screenShare = new P2pScreenShare(currentSettings, peers)
  }

  get microphoneTrack(): MediaStreamTrack | undefined {
    return this.microphone.track
  }

  get screenTrack(): MediaStreamTrack | undefined {
    return this.screenShare.track
  }

  get screenAudioTrack(): MediaStreamTrack | undefined {
    return this.screenShare.audioTrack
  }

  async close(): Promise<void> {
    await Promise.all([this.microphone.close(), this.screenShare.stop()])
  }

  async setSettings(settings: RtcMediaSettings): Promise<void> {
    this.mediaSettings = settings
    await Promise.allSettled([
      this.microphone.applySettings(),
      this.screenShare.applySettings(),
      ...[...this.peers()].map(async peer => this.applyPeerSettings(peer)),
    ])
  }

  async enableMicrophone(): Promise<void> {
    await this.microphone.enable()
  }

  disableMicrophone(): void {
    this.microphone.disable()
  }

  async startScreenShare(): Promise<void> {
    await this.screenShare.start()
  }

  async stopScreenShare(): Promise<void> {
    await this.screenShare.stop()
  }

  subscribeMicrophone(listener: (state: MicrophoneState) => void): () => void {
    return this.microphone.subscribeState(listener)
  }

  subscribeLocalAudio(listener: (stream: MediaStream | undefined) => void): () => void {
    return this.microphone.subscribeStream(listener)
  }

  subscribeScreenShare(listener: (state: ScreenShareState) => void): () => void {
    return this.screenShare.subscribeState(listener)
  }

  subscribeLocalScreen(listener: (stream: MediaStream | undefined) => void): () => void {
    return this.screenShare.subscribeStream(listener)
  }

  async applyPeerSettings(peer: P2pMediaPeer): Promise<void> {
    await Promise.allSettled([
      applySenderBitrate(peer.microphoneSender, this.mediaSettings.voice.maxBitrate),
      applySenderBitrate(
        peer.screenSender,
        this.mediaSettings.screen.maxBitrate,
        'maintain-framerate',
      ),
      applySenderBitrate(peer.screenAudioSender, this.mediaSettings.screenAudio.maxBitrate),
    ])
  }
}
