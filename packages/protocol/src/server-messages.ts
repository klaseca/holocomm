import Type from 'typebox'

import { DISPLAY_NAME_MAX_LENGTH, ROOM_SLUG_MAX_LENGTH } from './input-policy.ts'
import { RtcSignalPayloadSchema } from './rtc-signaling.ts'

const ParticipantIdentitySchema = Type.Object({
  id: Type.String({ minLength: 1 }),
  displayName: Type.String({ minLength: 1, maxLength: DISPLAY_NAME_MAX_LENGTH }),
}, { additionalProperties: false })

export const ParticipantSchema = Type.Object({
  id: Type.String({ minLength: 1 }),
  displayName: Type.String({ minLength: 1, maxLength: DISPLAY_NAME_MAX_LENGTH }),
  microphoneMuted: Type.Boolean(),
  screenSharing: Type.Boolean(),
}, { additionalProperties: false })

export const ChatMessageSchema = Type.Object({
  id: Type.String({ minLength: 1 }),
  roomId: Type.String({ minLength: 1 }),
  author: ParticipantIdentitySchema,
  content: Type.String({ minLength: 1, maxLength: 2_000 }),
  createdAt: Type.Integer({ minimum: 0 }),
}, { additionalProperties: false })

export const RoomSnapshotSchema = Type.Object({
  type: Type.Literal('room.snapshot'),
  room: Type.Object({
    id: Type.String({ minLength: 1 }),
    slug: Type.String({ minLength: 1, maxLength: ROOM_SLUG_MAX_LENGTH }),
  }),
  self: ParticipantSchema,
  participants: Type.Array(ParticipantSchema),
}, { additionalProperties: false })

export const RoomPreviewSchema = Type.Object({
  type: Type.Literal('room.preview'),
  room: Type.Object({
    slug: Type.String({ minLength: 1, maxLength: ROOM_SLUG_MAX_LENGTH }),
  }),
  participants: Type.Array(ParticipantSchema),
}, { additionalProperties: false })

export const ParticipantJoinedSchema = Type.Object({
  type: Type.Literal('participant.joined'),
  participant: ParticipantSchema,
}, { additionalProperties: false })

export const ParticipantLeftSchema = Type.Object({
  type: Type.Literal('participant.left'),
  participantId: Type.String({ minLength: 1 }),
}, { additionalProperties: false })

export const ParticipantMediaUpdatedSchema = Type.Object({
  type: Type.Literal('participant.media.updated'),
  participant: ParticipantSchema,
}, { additionalProperties: false })

export const ChatMessageEventSchema = Type.Object({
  type: Type.Literal('chat.message'),
  message: ChatMessageSchema,
}, { additionalProperties: false })

export const RtcSignalEventSchema = Type.Object({
  type: Type.Literal('rtc.signal'),
  sourcePeerId: Type.String({ minLength: 1 }),
  payload: RtcSignalPayloadSchema,
}, { additionalProperties: false })

export const ErrorCodeSchema = Type.Union([
  Type.Literal('INVALID_MESSAGE'),
  Type.Literal('INVALID_ROOM_NAME'),
  Type.Literal('INVALID_DISPLAY_NAME'),
  Type.Literal('ROOM_FULL'),
  Type.Literal('ROOM_NOT_FOUND'),
  Type.Literal('MESSAGE_TOO_LONG'),
  Type.Literal('RTC_PEER_LIMIT'),
  Type.Literal('RTC_SIGNAL_INVALID'),
  Type.Literal('RATE_LIMITED'),
  Type.Literal('INTERNAL_ERROR'),
])

export const ErrorMessageSchema = Type.Object({
  type: Type.Literal('error'),
  code: ErrorCodeSchema,
  message: Type.String({ minLength: 1 }),
}, { additionalProperties: false })

export const ServerMessageSchema = Type.Union([
  RoomPreviewSchema,
  RoomSnapshotSchema,
  ParticipantJoinedSchema,
  ParticipantLeftSchema,
  ParticipantMediaUpdatedSchema,
  ChatMessageEventSchema,
  RtcSignalEventSchema,
  ErrorMessageSchema,
])

export type ParticipantDto = Type.Static<typeof ParticipantSchema>
export type ChatMessageDto = Type.Static<typeof ChatMessageSchema>
export type RoomSnapshot = Type.Static<typeof RoomSnapshotSchema>
export type RoomPreview = Type.Static<typeof RoomPreviewSchema>
export type ParticipantJoined = Type.Static<typeof ParticipantJoinedSchema>
export type ParticipantLeft = Type.Static<typeof ParticipantLeftSchema>
export type ParticipantMediaUpdated = Type.Static<typeof ParticipantMediaUpdatedSchema>
export type ChatMessageEvent = Type.Static<typeof ChatMessageEventSchema>
export type RtcSignalEvent = Type.Static<typeof RtcSignalEventSchema>
export type ErrorCode = Type.Static<typeof ErrorCodeSchema>
export type ErrorMessage = Type.Static<typeof ErrorMessageSchema>
export type ServerMessage = Type.Static<typeof ServerMessageSchema>
