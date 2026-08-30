import type { RtcPeerState, RtcSignal } from '../domain/rtc-signal.ts'
import type { ScreenShareState } from '../domain/screen-share.ts'
import type { MicrophoneState } from '../domain/voice.ts'
import type { RtcMediaSettings } from './media-settings.ts'
import type { RtcSession } from './rtc-session.ts'

export class ClientRtcController {
  private readonly session: RtcSession

  constructor(session: RtcSession) {
    this.session = session
  }

  async peerJoined(peerId: string): Promise<void> {
    return this.session.joinPeer(peerId)
  }

  async peerLeft(peerId: string): Promise<void> {
    return this.session.leavePeer(peerId)
  }

  async signalReceived(peerId: string, payload: RtcSignal): Promise<void> {
    return this.session.handleSignal(peerId, payload)
  }

  async disconnect(): Promise<void> {
    return this.session.close()
  }

  async setMediaSettings(settings: RtcMediaSettings): Promise<void> {
    return this.session.setMediaSettings(settings)
  }

  async enableMicrophone(): Promise<void> {
    return this.session.enableMicrophone()
  }

  async disableMicrophone(): Promise<void> {
    return this.session.disableMicrophone()
  }

  async startScreenShare(): Promise<void> {
    return this.session.startScreenShare()
  }

  async stopScreenShare(): Promise<void> {
    return this.session.stopScreenShare()
  }

  subscribePeerState(listener: (peerId: string, state: RtcPeerState) => void): () => void {
    return this.session.subscribePeerState(listener)
  }

  subscribeMicrophone(listener: (state: MicrophoneState) => void): () => void {
    return this.session.subscribeMicrophone(listener)
  }

  subscribeLocalAudio(listener: (stream: MediaStream | undefined) => void): () => void {
    return this.session.subscribeLocalAudio(listener)
  }

  subscribeRemoteAudio(
    listener: (peerId: string, stream: MediaStream | undefined) => void,
  ): () => void {
    return this.session.subscribeRemoteAudio(listener)
  }

  subscribeScreenShare(listener: (state: ScreenShareState) => void): () => void {
    return this.session.subscribeScreenShare(listener)
  }

  subscribeLocalScreen(listener: (stream: MediaStream | undefined) => void): () => void {
    return this.session.subscribeLocalScreen(listener)
  }

  subscribeRemoteScreen(
    listener: (peerId: string, stream: MediaStream | undefined) => void,
  ): () => void {
    return this.session.subscribeRemoteScreen(listener)
  }
}
