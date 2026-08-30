import { type ChatMessageDto, type ClientMessage, type ParticipantDto, type ServerMessage, ServerMessageSchema } from '@holocomm/protocol'
import { Check } from 'typebox/value'
import { readonly, ref, shallowRef } from 'vue'
import { Context } from 'vue-context-ts'

import type { RtcMediaSettings } from '#/modules/rtc/application/media-settings.ts'
import { createRtcController, MicrophoneAccessError, type MicrophoneState, type RtcPeerState, ScreenShareError, type ScreenShareState } from '#/modules/rtc/index.ts'

import { reconnectDelayMs, WEBSOCKET_CONNECTION_TIMEOUT_MS } from './reconnect-policy.ts'

export type ConnectionState
  = | 'idle'
    | 'connecting'
    | 'joining'
    | 'reconnecting'
    | 'connected'
    | 'disconnected'
    | 'error'

export interface ParticipantAudioSettings {
  readonly muted: boolean
  readonly volume: number
}

export function createRoomSession(webSocketUrl: string, iceServers: readonly string[]) {
  const roomSlug = ref<string>()

  const connectionState = ref<ConnectionState>('idle')

  const participants = ref<ParticipantDto[]>([])

  const messages = ref<ChatMessageDto[]>([])

  const self = shallowRef<ParticipantDto>()

  const error = ref<string>()

  const rtcError = ref<string>()

  const peerStates = ref<Record<string, RtcPeerState>>({})

  const microphoneState = ref<MicrophoneState>('off')

  const microphoneError = ref<string>()

  const localAudioStream = shallowRef<MediaStream>()

  const remoteAudioStreams = shallowRef<Record<string, MediaStream>>({})

  const participantAudioSettings = ref<Record<string, ParticipantAudioSettings>>({})

  const screenShareState = ref<ScreenShareState>('off')

  const screenShareError = ref<string>()

  const localScreenStream = shallowRef<MediaStream>()

  const remoteScreenStreams = shallowRef<Record<string, MediaStream>>({})

  let socket: WebSocket | undefined

  let leaving = false

  let currentDisplayName = ''

  let reconnectAttempt = 0

  let reconnectTimer: ReturnType<typeof setTimeout> | undefined

  let connectionTimer: ReturnType<typeof setTimeout> | undefined

  let errorTimer: ReturnType<typeof setTimeout> | undefined

  let connectionGeneration = 0

  let rtcReset: Promise<void> = Promise.resolve()

  const receivedMessageIds = new Set<string>()

  const rtc = createRtcController({
    iceServers,
    signaling: {
      send(targetPeerId, payload) {
        return send({ type: 'rtc.signal', targetPeerId, payload })
      },
    },
  })

  rtc.subscribePeerState((peerId, state) => {
    peerStates.value = { ...peerStates.value, [peerId]: state }

    if (state === 'failed') {
      rtcError.value = 'A direct peer connection timed out.'
    }
  })
  rtc.subscribeMicrophone((state) => {
    microphoneState.value = state
    syncLocalMediaState()
  })
  rtc.subscribeLocalAudio((stream) => {
    localAudioStream.value = stream
  })
  rtc.subscribeRemoteAudio((peerId, stream) => {
    const nextStreams = { ...remoteAudioStreams.value }

    if (stream === undefined) {
      delete nextStreams[peerId]
    } else {
      nextStreams[peerId] = stream
    }

    remoteAudioStreams.value = nextStreams
  })
  rtc.subscribeScreenShare((state) => {
    screenShareState.value = state
    syncLocalMediaState()
  })
  rtc.subscribeLocalScreen((stream) => {
    localScreenStream.value = stream
  })
  rtc.subscribeRemoteScreen((peerId, stream) => {
    const nextStreams = { ...remoteScreenStreams.value }

    if (stream === undefined) {
      delete nextStreams[peerId]
    } else {
      nextStreams[peerId] = stream
    }

    remoteScreenStreams.value = nextStreams
  })

  function connect(slug: string, displayName: string): void {
    leaving = false
    roomSlug.value = slug
    currentDisplayName = displayName
    reconnectAttempt = 0
    clearReconnectTimer()
    clearErrorTimer()
    resetSession(true)
    startConnection(false)
  }

  function startConnection(reconnecting: boolean): void {
    const generation = ++connectionGeneration

    connectionState.value = reconnecting ? 'reconnecting' : 'connecting'
    void rtcReset.then(async () => {
      if (generation !== connectionGeneration || leaving) {
        return
      }

      await requestMicrophone()

      if (generation !== connectionGeneration || leaving) {
        return
      }

      openSocket(generation)
    })
  }

  function openSocket(generation: number): void {
    leaving = false
    error.value = undefined
    clearErrorTimer()
    rtcError.value = undefined
    microphoneError.value = undefined
    screenShareError.value = undefined

    const nextSocket = new WebSocket(webSocketUrl)

    socket = nextSocket
    connectionTimer = setTimeout(() => {
      if (socket !== nextSocket || generation !== connectionGeneration) {
        return
      }

      error.value = 'The room service did not respond in time.'
      nextSocket.close(4000, 'WebSocket connection timed out')
    }, WEBSOCKET_CONNECTION_TIMEOUT_MS)

    nextSocket.addEventListener('open', () => {
      if (socket !== nextSocket) {
        return
      }

      connectionState.value = 'joining'

      const slug = roomSlug.value

      if (slug === undefined) {
        return
      }

      send({ type: 'room.join', room: slug, displayName: currentDisplayName })
    })

    nextSocket.addEventListener('message', (event) => {
      if (socket !== nextSocket || typeof event.data !== 'string') {
        return
      }

      handlePayload(event.data)
    })

    nextSocket.addEventListener('error', () => {
      if (socket !== nextSocket) {
        return
      }

      error.value = 'The room connection was interrupted.'
    })

    nextSocket.addEventListener('close', () => {
      if (socket !== nextSocket) {
        return
      }

      socket = undefined
      clearConnectionTimer()

      if (leaving) {
        return
      }

      resetRtcState()
      scheduleReconnect()
    })
  }

  function scheduleReconnect(): void {
    connectionState.value = 'reconnecting'
    error.value ??= 'Connection lost. Reconnecting automatically…'

    const delay = reconnectDelayMs(reconnectAttempt++)

    reconnectTimer = setTimeout(() => {
      reconnectTimer = undefined

      if (!leaving) {
        startConnection(true)
      }
    }, delay)
  }

  function sendChat(content: string): boolean {
    const normalizedContent = content.trim()

    if (normalizedContent.length === 0 || normalizedContent.length > 2_000) {
      return false
    }

    return send({ type: 'chat.send', content: normalizedContent })
  }

  function setParticipantVolume(participantId: string, volume: number): void {
    const current = participantAudioSettings.value[participantId] ?? { muted: false, volume: 1 }

    participantAudioSettings.value = {
      ...participantAudioSettings.value,
      [participantId]: { ...current, volume: Math.min(1, Math.max(0, volume)) },
    }
  }

  function toggleParticipantMuted(participantId: string): void {
    const current = participantAudioSettings.value[participantId] ?? { muted: false, volume: 1 }

    participantAudioSettings.value = {
      ...participantAudioSettings.value,
      [participantId]: { ...current, muted: !current.muted },
    }
  }

  function leave(): void {
    leaving = true
    currentDisplayName = ''
    clearReconnectTimer()
    clearErrorTimer()
    send({ type: 'room.leave' })
    resetSession(true)
    roomSlug.value = undefined
    connectionState.value = 'idle'
  }

  function destroy(): void {
    leaving = true
    currentDisplayName = ''
    resetSession(true)
    roomSlug.value = undefined
    connectionState.value = 'idle'
  }

  function toggleMicrophone(): void {
    microphoneError.value = undefined

    if (microphoneState.value === 'enabled') {
      void rtc.disableMicrophone()

      return
    }

    void requestMicrophone()
  }

  async function requestMicrophone(): Promise<void> {
    microphoneError.value = undefined
    try {
      await rtc.enableMicrophone()
    } catch (error) {
      microphoneError.value
        = error instanceof MicrophoneAccessError && error.reason === 'denied'
          ? 'Allow microphone access in the browser to speak.'
          : 'No microphone is available. Check your device settings.'
    }
  }

  function toggleScreenShare(): void {
    screenShareError.value = undefined

    if (screenShareState.value === 'sharing') {
      void rtc.stopScreenShare().catch(() => {
        screenShareError.value = 'Could not stop screen sharing cleanly.'
      })

      return
    }

    void rtc.startScreenShare().catch((error: unknown) => {
      screenShareError.value
        = error instanceof ScreenShareError && error.reason === 'denied'
          ? 'Screen sharing was cancelled or blocked by the browser.'
          : 'Screen sharing is unavailable in this browser.'
    })
  }

  async function configureMedia(settings: RtcMediaSettings): Promise<void> {
    return rtc.setMediaSettings(settings)
  }

  function resetSession(clearMessages: boolean): void {
    ++connectionGeneration
    clearReconnectTimer()
    clearConnectionTimer()
    clearErrorTimer()

    const currentSocket = socket

    socket = undefined
    currentSocket?.close(1000, 'Client left room')
    participants.value = []
    participantAudioSettings.value = {}

    if (clearMessages) {
      messages.value = []
      receivedMessageIds.clear()
    }

    self.value = undefined
    resetRtcState()
  }

  function resetRtcState(): void {
    rtcReset = rtcReset
      .catch(() => undefined)
      .then(async () => {
        await rtc.disconnect()
        clearRtcUiState()
      })
      .catch(() => {
        rtcError.value = 'Could not clean up the previous direct connections.'
      })
    clearRtcUiState()
  }

  function clearRtcUiState(): void {
    peerStates.value = {}
    remoteAudioStreams.value = {}
    remoteScreenStreams.value = {}
    localAudioStream.value = undefined
    localScreenStream.value = undefined
    microphoneState.value = 'off'
    screenShareState.value = 'off'
  }

  function send(message: ClientMessage): boolean {
    if (socket?.readyState !== WebSocket.OPEN) {
      return false
    }

    socket.send(JSON.stringify(message))

    return true
  }

  function handlePayload(payload: string): void {
    let parsed: unknown

    try {
      parsed = JSON.parse(payload)
    } catch {
      return failProtocol()
    }

    if (!Check(ServerMessageSchema, parsed)) {
      return failProtocol()
    }

    handleMessage(parsed)
  }

  function handleMessage(message: ServerMessage): void {
    switch (message.type) {
      case 'room.snapshot':
        clearConnectionTimer()
        reconnectAttempt = 0
        error.value = undefined
        self.value = message.self
        participants.value = [
          ...new Map(
            message.participants.map(participant => [participant.id, participant]),
          ).values(),
        ]
        connectionState.value = 'connected'
        syncLocalMediaState()
        break
      case 'participant.joined':
        if (participants.value.some(participant => participant.id === message.participant.id)) {
          break
        }

        participants.value = [...participants.value, message.participant]

        if (message.participant.id !== self.value?.id) {
          runRtc(async () => rtc.peerJoined(message.participant.id))
        }

        break
      case 'participant.left':
        participants.value = participants.value.filter(
          participant => participant.id !== message.participantId,
        )
        removePeerState(message.participantId)
        runRtc(async () => rtc.peerLeft(message.participantId))
        break
      case 'participant.media.updated':
        participants.value = participants.value.map(participant =>
          participant.id === message.participant.id ? message.participant : participant,
        )

        if (self.value?.id === message.participant.id) {
          self.value = message.participant
        }

        break
      case 'chat.message':
        if (receivedMessageIds.has(message.message.id)) {
          break
        }

        receivedMessageIds.add(message.message.id)
        messages.value = [...messages.value, message.message]
        break
      case 'rtc.signal':
        runRtc(async () => rtc.signalReceived(message.sourcePeerId, message.payload))
        break
      case 'error':
        error.value = message.message

        if (connectionState.value !== 'connected') {
          leaving = true
          resetSession(false)
          connectionState.value = 'error'
        } else {
          clearErrorTimer()

          const currentError = message.message

          errorTimer = setTimeout(() => {
            if (error.value === currentError) {
              error.value = undefined
            }

            errorTimer = undefined
          }, 5_000)
        }

        break
      case 'room.preview':
        break
    }
  }

  function runRtc(operation: () => Promise<void>): void {
    operation().catch(() => {
      rtcError.value = 'Could not establish a direct peer connection.'
    })
  }

  function removePeerState(peerId: string): void {
    const nextStates = { ...peerStates.value }

    delete nextStates[peerId]
    peerStates.value = nextStates

    const nextAudioSettings = { ...participantAudioSettings.value }

    delete nextAudioSettings[peerId]
    participantAudioSettings.value = nextAudioSettings
  }

  function failProtocol(): void {
    leaving = true
    error.value = 'The server sent an invalid WebSocket message.'
    resetSession(false)
    connectionState.value = 'error'
  }

  function clearReconnectTimer(): void {
    if (reconnectTimer === undefined) {
      return
    }

    clearTimeout(reconnectTimer)
    reconnectTimer = undefined
  }

  function clearConnectionTimer(): void {
    if (connectionTimer === undefined) {
      return
    }

    clearTimeout(connectionTimer)
    connectionTimer = undefined
  }

  function clearErrorTimer(): void {
    if (errorTimer === undefined) {
      return
    }

    clearTimeout(errorTimer)
    errorTimer = undefined
  }

  function syncLocalMediaState(): void {
    const microphoneMuted = microphoneState.value !== 'enabled'

    const screenSharing = screenShareState.value === 'sharing'

    const selfId = self.value?.id

    if (selfId != null) {
      const update = (participant: ParticipantDto): ParticipantDto =>
        participant.id === selfId ? { ...participant, microphoneMuted, screenSharing } : participant

      participants.value = participants.value.map(update)
      self.value = update(self.value!)
    }

    send({ type: 'participant.media.update', microphoneMuted, screenSharing })
  }

  return {
    webSocketUrl,
    roomSlug: readonly(roomSlug),
    connectionState: readonly(connectionState),
    participants: readonly(participants),
    messages: readonly(messages),
    self: readonly(self),
    error: readonly(error),
    rtcError: readonly(rtcError),
    peerStates: readonly(peerStates),
    microphoneState: readonly(microphoneState),
    microphoneError: readonly(microphoneError),
    localAudioStream: readonly(localAudioStream),
    remoteAudioStreams: readonly(remoteAudioStreams),
    participantAudioSettings: readonly(participantAudioSettings),
    screenShareState: readonly(screenShareState),
    screenShareError: readonly(screenShareError),
    localScreenStream: readonly(localScreenStream),
    remoteScreenStreams: readonly(remoteScreenStreams),
    connect,
    sendChat,
    setParticipantVolume,
    toggleParticipantMuted,
    toggleMicrophone,
    toggleScreenShare,
    configureMedia,
    leave,
    destroy,
  }
}

export type RoomSession = ReturnType<typeof createRoomSession>

export const roomSessionContext = new Context({
  key: Symbol('holocomm:room-session'),
  defaultValue: Context.valueType<RoomSession>(),
})
