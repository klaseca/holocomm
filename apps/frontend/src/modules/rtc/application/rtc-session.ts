import type { RtcPeerState, RtcSignal } from '../domain/rtc-signal.ts'
import type { ScreenShareState } from '../domain/screen-share.ts'
import type { MicrophoneState } from '../domain/voice.ts'
import type { RtcMediaSettings } from './media-settings.ts'

export interface RtcSession {
  joinPeer: (peerId: string) => Promise<void>
  leavePeer: (peerId: string) => Promise<void>
  handleSignal: (peerId: string, payload: RtcSignal) => Promise<void>
  close: () => Promise<void>
  setMediaSettings: (settings: RtcMediaSettings) => Promise<void>
  subscribePeerState: (listener: (peerId: string, state: RtcPeerState) => void) => () => void
  enableMicrophone: () => Promise<void>
  disableMicrophone: () => Promise<void>
  subscribeMicrophone: (listener: (state: MicrophoneState) => void) => () => void
  subscribeLocalAudio: (listener: (stream: MediaStream | undefined) => void) => () => void
  subscribeRemoteAudio: (
    listener: (peerId: string, stream: MediaStream | undefined) => void,
  ) => () => void
  startScreenShare: () => Promise<void>
  stopScreenShare: () => Promise<void>
  subscribeScreenShare: (listener: (state: ScreenShareState) => void) => () => void
  subscribeLocalScreen: (listener: (stream: MediaStream | undefined) => void) => () => void
  subscribeRemoteScreen: (
    listener: (peerId: string, stream: MediaStream | undefined) => void,
  ) => () => void
}
