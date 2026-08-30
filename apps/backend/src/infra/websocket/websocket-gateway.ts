import { type ChatMessageDto, type ClientMessage, ClientMessageSchema, type ParticipantDto, type ServerMessage } from '@holocomm/protocol'
import { Check } from 'typebox/value'

import type { ChatService, Message } from '#/modules/chat/index.ts'
import type {
  LeavePresenceResult,
  Participant,
  RoomPresenceService,
} from '#/modules/room/index.ts'
import type { RtcSignalingService } from '#/modules/rtc/index.ts'
import { ApplicationError } from '#/shared/errors/application-error.ts'
import type { AppLogger } from '#/shared/logging/app-logger.ts'

import { ConnectionRateLimiter } from './connection-rate-limiter.ts'
import type { WebSocketConnection } from './websocket-connection.ts'

export class WebSocketGateway {
  private readonly connections = new Map<string, WebSocketConnection>()

  private readonly presence: RoomPresenceService

  private readonly chat: ChatService

  private readonly rtc: RtcSignalingService

  private readonly rateLimiter: ConnectionRateLimiter

  private readonly logger: AppLogger

  constructor(
    presence: RoomPresenceService,
    chat: ChatService,
    rtc: RtcSignalingService,
    logger: AppLogger,
    rateLimitPerSecond = 120,
  ) {
    this.presence = presence
    this.chat = chat
    this.rtc = rtc
    this.rateLimiter = new ConnectionRateLimiter(rateLimitPerSecond, 1_000)
    this.logger = logger
  }

  connect(connection: WebSocketConnection): void {
    if (this.connections.has(connection.id)) {
      connection.close(1008, 'Duplicate connection identifier')

      return
    }

    this.connections.set(connection.id, connection)
  }

  receive(connectionId: string, payload: string): void {
    const connection = this.connections.get(connectionId)

    if (connection === undefined) {
      return
    }

    const rateLimitDecision = this.rateLimiter.check(connectionId)

    if (rateLimitDecision !== 'allowed') {
      if (rateLimitDecision === 'rejected') {
        this.sendError(
          connection,
          new ApplicationError(
            'RATE_LIMITED',
            'Too many WebSocket messages; wait a moment and try again',
          ),
        )
      }

      return
    }

    let parsed: unknown

    try {
      parsed = JSON.parse(payload)
    } catch {
      this.sendError(
        connection,
        new ApplicationError('INVALID_MESSAGE', 'Message is not valid JSON'),
      )

      return
    }

    try {
      if (!Check(ClientMessageSchema, parsed)) {
        throw new ApplicationError(
          'INVALID_MESSAGE',
          'Message does not match the WebSocket protocol',
        )
      }

      this.handleMessage(connection, parsed)
    } catch (error) {
      this.sendError(connection, error)
    }
  }

  disconnect(connectionId: string): void {
    this.rateLimiter.remove(connectionId)

    if (!this.connections.delete(connectionId)) {
      return
    }

    this.broadcastLeave(this.presence.leave(connectionId))
  }

  private handleMessage(connection: WebSocketConnection, message: ClientMessage): void {
    switch (message.type) {
      case 'room.watch': {
        const result = this.presence.watch(connection.id, message.room)

        connection.send({
          type: 'room.preview',
          room: { slug: result.roomSlug },
          participants: result.participants.map(toParticipantDto),
        })
        break
      }
      case 'room.join': {
        const result = this.presence.join(connection.id, message.room, message.displayName)

        connection.send({
          type: 'room.snapshot',
          room: { id: result.snapshot.room.id, slug: result.snapshot.room.slug },
          self: toParticipantDto(result.snapshot.self),
          participants: result.snapshot.participants.map(toParticipantDto),
        })
        this.broadcast(result.recipientConnectionIds, {
          type: 'participant.joined',
          participant: toParticipantDto(result.participant),
        })
        break
      }
      case 'room.leave':
        this.broadcastLeave(this.presence.leave(connection.id))
        break
      case 'chat.send': {
        const context = this.presence.getCurrentRoom(connection.id)

        if (context === undefined) {
          throw new ApplicationError('ROOM_NOT_FOUND', 'Join a room before sending messages')
        }

        const chatMessage = this.chat.createMessage({
          roomId: context.room.id,
          author: {
            id: context.participant.id,
            displayName: context.participant.displayName,
          },
          content: message.content,
        })

        this.broadcast(context.recipientConnectionIds, {
          type: 'chat.message',
          message: toChatMessageDto(chatMessage),
        })
        break
      }
      case 'participant.media.update': {
        const result = this.presence.updateMediaState(
          connection.id,
          message.microphoneMuted,
          message.screenSharing,
        )

        this.broadcast(result.recipientConnectionIds, {
          type: 'participant.media.updated',
          participant: toParticipantDto(result.participant),
        })
        break
      }
      case 'rtc.signal': {
        const route = this.rtc.route(connection.id, message.targetPeerId, message.payload)

        this.connections.get(route.targetConnectionId)?.send(route.message)
        break
      }
    }
  }

  private broadcastLeave(result: LeavePresenceResult | undefined): void {
    if (result === undefined) {
      return
    }

    this.broadcast(result.recipientConnectionIds, {
      type: 'participant.left',
      participantId: result.participant.id,
    })
  }

  private broadcast(connectionIds: readonly string[], message: ServerMessage): void {
    for (const connectionId of connectionIds) {
      this.connections.get(connectionId)?.send(message)
    }
  }

  private sendError(connection: WebSocketConnection, error: unknown): void {
    const applicationError
      = error instanceof ApplicationError
        ? error
        : new ApplicationError('INTERNAL_ERROR', 'An unexpected server error occurred')

    if (!(error instanceof ApplicationError)) {
      this.logger.error({
        connectionId: connection.id,
        err: error,
      }, 'Unhandled WebSocket message error')
    }

    connection.send({
      type: 'error',
      code: applicationError.code,
      message: applicationError.message,
    })
  }
}

function toParticipantDto(participant: Participant): ParticipantDto {
  return {
    id: participant.id,
    displayName: participant.displayName,
    microphoneMuted: participant.microphoneMuted,
    screenSharing: participant.screenSharing,
  }
}

function toChatMessageDto(message: Message): ChatMessageDto {
  return {
    id: message.id,
    roomId: message.roomId,
    author: { ...message.author },
    content: message.content,
    createdAt: message.createdAt,
  }
}
