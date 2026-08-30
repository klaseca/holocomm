import type { RtcMediaSettings } from '../../application/media-settings.ts'
import type { RtcSession } from '../../application/rtc-session.ts'
import type { RtcSignaling } from '../../application/rtc-signaling.ts'
import type { RtcPeerState, RtcSignal } from '../../domain/rtc-signal.ts'
import type { ScreenShareState } from '../../domain/screen-share.ts'
import type { MicrophoneState } from '../../domain/voice.ts'
import { P2pMedia, type P2pMediaPeer } from './p2p-media.ts'

interface PeerContext extends P2pMediaPeer {
  readonly connection: RTCPeerConnection
  readonly pendingCandidates: RTCIceCandidateInit[]
  readonly receivedCandidateKeys: Set<string>
  dataChannel?: RTCDataChannel
  microphoneSender?: RTCRtpSender
  screenSender?: RTCRtpSender
  screenAudioSender?: RTCRtpSender
  screenAudioTransceiver?: RTCRtpTransceiver
  readonly connectionTimeout: ReturnType<typeof setTimeout>
  readonly initiator: boolean
  recovering: boolean
  recoveryTimer?: ReturnType<typeof setTimeout>
  remoteScreenStream?: MediaStream
}

const PEER_RECOVERY_DELAY_MS = 2_000

const PEER_RECOVERY_RETRY_MS = 5_000

export interface P2pSessionOptions {
  readonly connectionTimeoutMs?: number
  readonly mediaSettings?: RtcMediaSettings
}

export class P2pSession implements RtcSession {
  private readonly configuration: RTCConfiguration

  private readonly peers = new Map<string, PeerContext>()

  private readonly signaling: RtcSignaling

  private readonly connectionTimeoutMs: number

  private readonly media: P2pMedia

  private readonly listeners = new Set<(peerId: string, state: RtcPeerState) => void>()

  private readonly remoteAudioListeners = new Set<(
    peerId: string,
    stream: MediaStream | undefined,
  ) => void>()

  private readonly remoteScreenListeners = new Set<(
    peerId: string,
    stream: MediaStream | undefined,
  ) => void>()

  constructor(
    signaling: RtcSignaling,
    configuration: RTCConfiguration,
    options: P2pSessionOptions = {},
  ) {
    this.signaling = signaling
    this.configuration = configuration
    this.connectionTimeoutMs = options.connectionTimeoutMs ?? 15_000
    this.media = new P2pMedia(options.mediaSettings, () => this.peers.values())
  }

  async joinPeer(peerId: string): Promise<void> {
    if (this.peers.has(peerId)) {
      return
    }

    const peer = this.createPeer(peerId, true)

    await this.media.applyPeerSettings(peer)
    peer.dataChannel = peer.connection.createDataChannel('holocomm-control', { ordered: true })

    const offer = await peer.connection.createOffer()

    await peer.connection.setLocalDescription(offer)

    const sdp = peer.connection.localDescription?.sdp

    if (sdp != null) {
      this.signaling.send(peerId, { kind: 'offer', sdp })
    }
  }

  async leavePeer(peerId: string): Promise<void> {
    const peer = this.peers.get(peerId)

    if (peer === undefined) {
      return
    }

    this.peers.delete(peerId)
    clearTimeout(peer.connectionTimeout)

    if (peer.recoveryTimer != null) {
      clearTimeout(peer.recoveryTimer)
    }

    peer.dataChannel?.close()
    peer.connection.close()
    this.emitRemoteAudio(peerId, undefined)
    this.emitRemoteScreen(peerId, undefined)
    this.emit(peerId, 'disconnected')
  }

  async handleSignal(peerId: string, payload: RtcSignal): Promise<void> {
    const peer = this.peers.get(peerId) ?? this.createPeer(peerId)

    switch (payload.kind) {
      case 'offer': {
        await peer.connection.setRemoteDescription({ type: 'offer', sdp: payload.sdp })
        await this.configureAnswererMedia(peer)
        await this.media.applyPeerSettings(peer)
        await this.flushCandidates(peer)

        const answer = await peer.connection.createAnswer()

        await peer.connection.setLocalDescription(answer)

        const sdp = peer.connection.localDescription?.sdp

        if (sdp != null) {
          this.signaling.send(peerId, { kind: 'answer', sdp })
        }

        break
      }
      case 'answer':
        await peer.connection.setRemoteDescription({ type: 'answer', sdp: payload.sdp })
        await this.flushCandidates(peer)
        break
      case 'ice-candidate': {
        const candidateKey = JSON.stringify([
          payload.candidate,
          payload.sdpMid,
          payload.sdpMLineIndex,
          payload.usernameFragment,
        ])

        if (peer.receivedCandidateKeys.has(candidateKey)) {
          break
        }

        peer.receivedCandidateKeys.add(candidateKey)

        const candidate: RTCIceCandidateInit = {
          candidate: payload.candidate,
          sdpMid: payload.sdpMid,
          sdpMLineIndex: payload.sdpMLineIndex,
          usernameFragment: payload.usernameFragment,
        }

        if (peer.connection.remoteDescription === null) {
          peer.pendingCandidates.push(candidate)
        } else {
          await peer.connection.addIceCandidate(candidate)
        }

        break
      }
    }
  }

  async close(): Promise<void> {
    const peerIds = [...this.peers.keys()]

    await Promise.all(peerIds.map(async peerId => this.leavePeer(peerId)))
    await this.media.close()
  }

  async setMediaSettings(settings: RtcMediaSettings): Promise<void> {
    await this.media.setSettings(settings)
  }

  subscribePeerState(listener: (peerId: string, state: RtcPeerState) => void): () => void {
    this.listeners.add(listener)

    return () => this.listeners.delete(listener)
  }

  async enableMicrophone(): Promise<void> {
    await this.media.enableMicrophone()
  }

  async disableMicrophone(): Promise<void> {
    this.media.disableMicrophone()
  }

  subscribeMicrophone(listener: (state: MicrophoneState) => void): () => void {
    return this.media.subscribeMicrophone(listener)
  }

  subscribeLocalAudio(listener: (stream: MediaStream | undefined) => void): () => void {
    return this.media.subscribeLocalAudio(listener)
  }

  subscribeRemoteAudio(
    listener: (peerId: string, stream: MediaStream | undefined) => void,
  ): () => void {
    this.remoteAudioListeners.add(listener)

    return () => this.remoteAudioListeners.delete(listener)
  }

  async startScreenShare(): Promise<void> {
    await this.media.startScreenShare()
  }

  async stopScreenShare(): Promise<void> {
    await this.media.stopScreenShare()
  }

  subscribeScreenShare(listener: (state: ScreenShareState) => void): () => void {
    return this.media.subscribeScreenShare(listener)
  }

  subscribeLocalScreen(listener: (stream: MediaStream | undefined) => void): () => void {
    return this.media.subscribeLocalScreen(listener)
  }

  subscribeRemoteScreen(
    listener: (peerId: string, stream: MediaStream | undefined) => void,
  ): () => void {
    this.remoteScreenListeners.add(listener)

    return () => this.remoteScreenListeners.delete(listener)
  }

  private createPeer(peerId: string, initiator = false): PeerContext {
    const connection = new RTCPeerConnection(this.configuration)

    let microphoneTransceiver: RTCRtpTransceiver | undefined

    let screenTransceiver: RTCRtpTransceiver | undefined

    let screenAudioTransceiver: RTCRtpTransceiver | undefined

    if (initiator) {
      microphoneTransceiver = connection.addTransceiver(this.media.microphoneTrack ?? 'audio', {
        direction: 'sendrecv',
      })
      screenTransceiver = connection.addTransceiver(this.media.screenTrack ?? 'video', {
        direction: 'sendrecv',
      })
      screenAudioTransceiver = connection.addTransceiver(this.media.screenAudioTrack ?? 'audio', {
        direction: 'sendrecv',
      })
    }

    const peer: PeerContext = {
      connection,
      pendingCandidates: [],
      receivedCandidateKeys: new Set(),
      microphoneSender: microphoneTransceiver?.sender,
      initiator,
      recovering: false,
      screenSender: screenTransceiver?.sender,
      screenAudioSender: screenAudioTransceiver?.sender,
      screenAudioTransceiver,
      connectionTimeout: setTimeout(() => {
        if (
          this.peers.get(peerId)?.connection === connection
          && connection.connectionState !== 'connected'
        ) {
          this.emit(peerId, 'failed')
          this.schedulePeerRecovery(peerId, peer, 0)
        }
      }, this.connectionTimeoutMs),
    }

    this.peers.set(peerId, peer)
    this.emit(peerId, 'connecting')

    connection.addEventListener('icecandidate', (event) => {
      if (event.candidate === null) {
        return
      }

      const candidate = event.candidate

      this.signaling.send(peerId, {
        kind: 'ice-candidate',
        candidate: candidate.candidate,
        sdpMid: candidate.sdpMid,
        sdpMLineIndex: candidate.sdpMLineIndex,
        usernameFragment: candidate.usernameFragment,
      })
    })
    connection.addEventListener('connectionstatechange', () => {
      if (connection.connectionState !== 'new' && connection.connectionState !== 'connecting') {
        clearTimeout(peer.connectionTimeout)
      }

      this.emitConnectionState(peerId, connection.connectionState)

      if (connection.connectionState === 'connected') {
        this.clearPeerRecovery(peer)
        void this.media.applyPeerSettings(peer)
      } else if (connection.connectionState === 'failed') {
        this.schedulePeerRecovery(peerId, peer, 0)
      } else if (connection.connectionState === 'disconnected') {
        this.schedulePeerRecovery(peerId, peer, PEER_RECOVERY_DELAY_MS)
      } else if (connection.connectionState === 'closed') {
        this.clearPeerRecovery(peer)
      }
    })
    connection.addEventListener('datachannel', (event) => {
      peer.dataChannel = event.channel
    })
    connection.addEventListener('track', (event) => {
      const isScreenAudio = event.transceiver === peer.screenAudioTransceiver
        || connection.getTransceivers().indexOf(event.transceiver) === 2

      if (isScreenAudio || event.track.kind === 'video') {
        const stream = peer.remoteScreenStream ?? event.streams[0] ?? new MediaStream()

        peer.remoteScreenStream = stream

        if (!stream.getTracks().some(track => track.id === event.track.id)) {
          stream.addTrack(event.track)
        }

        if (isScreenAudio) {
          event.track.addEventListener('ended', () => stream.removeTrack(event.track), { once: true })

          return
        }

        const showScreen = () => {
          if (this.peers.has(peerId)) {
            this.emitRemoteScreen(peerId, stream)
          }
        }

        const hideScreen = () => this.emitRemoteScreen(peerId, undefined)

        event.track.addEventListener('unmute', showScreen)
        event.track.addEventListener('mute', hideScreen)
        event.track.addEventListener('ended', hideScreen, { once: true })

        if (!event.track.muted) {
          showScreen()
        }

        return
      }

      const stream = event.streams[0] ?? new MediaStream([event.track])

      if (event.track.kind === 'audio') {
        this.emitRemoteAudio(peerId, stream)
      }
    })

    return peer
  }

  private async flushCandidates(peer: PeerContext): Promise<void> {
    for (const candidate of peer.pendingCandidates.splice(0)) {
      await peer.connection.addIceCandidate(candidate)
    }
  }

  private async configureAnswererMedia(peer: PeerContext): Promise<void> {
    if (peer.microphoneSender != null) {
      return
    }

    const [microphone, screen, screenAudio] = peer.connection.getTransceivers()

    if (microphone == null || screen == null || screenAudio == null) {
      throw new Error('RTC offer does not contain the expected media sections')
    }

    microphone.direction = 'sendrecv'
    screen.direction = 'sendrecv'
    screenAudio.direction = 'sendrecv'
    peer.microphoneSender = microphone.sender
    peer.screenSender = screen.sender
    peer.screenAudioSender = screenAudio.sender
    peer.screenAudioTransceiver = screenAudio
    await Promise.all([
      microphone.sender.replaceTrack(this.media.microphoneTrack ?? null),
      screen.sender.replaceTrack(this.media.screenTrack ?? null),
      screenAudio.sender.replaceTrack(this.media.screenAudioTrack ?? null),
    ])
  }

  private schedulePeerRecovery(peerId: string, peer: PeerContext, delay: number): void {
    if (!peer.initiator || peer.recovering || peer.connection.connectionState === 'closed') {
      return
    }

    if (peer.recoveryTimer != null) {
      if (delay !== 0) {
        return
      }

      clearTimeout(peer.recoveryTimer)
    }

    peer.recoveryTimer = setTimeout(() => {
      peer.recoveryTimer = undefined
      void this.recoverPeer(peerId, peer)
    }, delay)
  }

  private async recoverPeer(peerId: string, peer: PeerContext): Promise<void> {
    if (
      this.peers.get(peerId) !== peer
      || peer.connection.connectionState === 'connected'
      || peer.connection.connectionState === 'closed'
    ) {
      return
    }

    peer.recovering = true
    try {
      peer.connection.restartIce()

      const offer = await peer.connection.createOffer({ iceRestart: true })

      await peer.connection.setLocalDescription(offer)

      const sdp = peer.connection.localDescription?.sdp

      if (sdp != null) {
        this.signaling.send(peerId, { kind: 'offer', sdp })
      }
    } catch {
      this.emit(peerId, 'failed')
    } finally {
      peer.recovering = false

      if ((peer.connection.connectionState as RTCPeerConnectionState) !== 'connected') {
        this.schedulePeerRecovery(peerId, peer, PEER_RECOVERY_RETRY_MS)
      }
    }
  }

  private clearPeerRecovery(peer: PeerContext): void {
    if (peer.recoveryTimer != null) {
      clearTimeout(peer.recoveryTimer)
    }

    peer.recoveryTimer = undefined
    peer.recovering = false
  }

  private emitConnectionState(peerId: string, state: RTCPeerConnectionState): void {
    switch (state) {
      case 'new':
      case 'connecting':
        this.emit(peerId, 'connecting')
        break
      case 'connected':
        this.emit(peerId, 'connected')
        break
      case 'disconnected':
      case 'closed':
        this.emit(peerId, 'disconnected')
        break
      case 'failed':
        this.emit(peerId, 'failed')
        break
    }
  }

  private emit(peerId: string, state: RtcPeerState): void {
    for (const listener of this.listeners) {
      listener(peerId, state)
    }
  }

  private emitRemoteAudio(peerId: string, stream: MediaStream | undefined): void {
    for (const listener of this.remoteAudioListeners) {
      listener(peerId, stream)
    }
  }

  private emitRemoteScreen(peerId: string, stream: MediaStream | undefined): void {
    for (const listener of this.remoteScreenListeners) {
      listener(peerId, stream)
    }
  }
}
