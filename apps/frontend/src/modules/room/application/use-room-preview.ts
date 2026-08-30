import { type ClientMessage, type ParticipantDto, ServerMessageSchema } from '@holocomm/protocol'
import { Check } from 'typebox/value'
import { onBeforeUnmount, readonly, ref } from 'vue'

import { reconnectDelayMs } from './reconnect-policy.ts'

export type RoomPreviewState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'error'

export function useRoomPreview(slug: string, webSocketUrl: string) {
  const state = ref<RoomPreviewState>('idle')

  const participants = ref<ParticipantDto[]>([])

  const error = ref<string>()

  let socket: WebSocket | undefined

  let reconnectTimer: ReturnType<typeof setTimeout> | undefined

  let reconnectAttempt = 0

  let stopped = true

  let generation = 0

  function watch(): void {
    stopSocket()
    stopped = false
    reconnectAttempt = 0
    error.value = undefined
    openSocket(false)
  }

  function stop(): void {
    stopped = true
    ++generation
    clearReconnectTimer()
    stopSocket()
    participants.value = []
    error.value = undefined
    state.value = 'idle'
  }

  function openSocket(reconnecting: boolean): void {
    const currentGeneration = ++generation

    state.value = reconnecting ? 'reconnecting' : 'connecting'

    const nextSocket = new WebSocket(webSocketUrl)

    socket = nextSocket

    nextSocket.addEventListener('open', () => {
      if (socket !== nextSocket || currentGeneration !== generation) {
        return
      }

      send(nextSocket, { type: 'room.watch', room: slug })
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

      error.value = 'Room presence is temporarily unavailable.'
    })

    nextSocket.addEventListener('close', () => {
      if (socket !== nextSocket) {
        return
      }

      socket = undefined

      if (stopped) {
        return
      }

      state.value = 'reconnecting'
      reconnectTimer = setTimeout(() => {
        reconnectTimer = undefined

        if (!stopped) {
          openSocket(true)
        }
      }, reconnectDelayMs(reconnectAttempt++))
    })
  }

  function handlePayload(payload: string): void {
    let parsed: unknown

    try {
      parsed = JSON.parse(payload)
    } catch {
      failPreview()

      return
    }

    if (!Check(ServerMessageSchema, parsed)) {
      failPreview()

      return
    }

    const message = parsed

    switch (message.type) {
      case 'room.preview':
        reconnectAttempt = 0
        error.value = undefined
        participants.value = message.participants
        state.value = 'connected'
        break
      case 'participant.joined':
        if (!participants.value.some(participant => participant.id === message.participant.id)) {
          participants.value = [...participants.value, message.participant]
        }

        break
      case 'participant.media.updated':
        participants.value = participants.value.map(participant => (
          participant.id === message.participant.id ? message.participant : participant
        ))
        break
      case 'participant.left':
        participants.value = participants.value.filter(
          participant => participant.id !== message.participantId,
        )
        break
      case 'error':
        error.value = message.message
        state.value = 'error'
        break
      case 'chat.message':
      case 'room.snapshot':
      case 'rtc.signal':
        break
    }
  }

  function failPreview(): void {
    stopped = true
    error.value = 'The server sent an invalid room preview.'
    state.value = 'error'
    stopSocket()
  }

  function stopSocket(): void {
    const currentSocket = socket

    socket = undefined
    currentSocket?.close(1000, 'Room preview closed')
  }

  function clearReconnectTimer(): void {
    if (reconnectTimer === undefined) {
      return
    }

    clearTimeout(reconnectTimer)
    reconnectTimer = undefined
  }

  onBeforeUnmount(stop)

  return {
    state: readonly(state),
    participants: readonly(participants),
    error: readonly(error),
    watch,
    stop,
  }
}

function send(socket: WebSocket, message: ClientMessage): void {
  socket.send(JSON.stringify(message))
}
