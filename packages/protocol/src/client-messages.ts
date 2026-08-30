import Type from 'typebox'

import { DISPLAY_NAME_MAX_LENGTH, ROOM_SLUG_MAX_LENGTH } from './input-policy.ts'
import { RtcSignalPayloadSchema } from './rtc-signaling.ts'

export const JoinRoomCommandSchema = Type.Object({
  type: Type.Literal('room.join'),
  room: Type.String({ minLength: 1, maxLength: ROOM_SLUG_MAX_LENGTH }),
  displayName: Type.String({ minLength: 1, maxLength: DISPLAY_NAME_MAX_LENGTH }),
}, { additionalProperties: false })

export const WatchRoomCommandSchema = Type.Object({
  type: Type.Literal('room.watch'),
  room: Type.String({ minLength: 1, maxLength: ROOM_SLUG_MAX_LENGTH }),
}, { additionalProperties: false })

export const LeaveRoomCommandSchema = Type.Object({
  type: Type.Literal('room.leave'),
}, { additionalProperties: false })

export const SendChatMessageCommandSchema = Type.Object({
  type: Type.Literal('chat.send'),
  content: Type.String({ minLength: 1, maxLength: 2_000 }),
}, { additionalProperties: false })

export const UpdateParticipantMediaCommandSchema = Type.Object({
  type: Type.Literal('participant.media.update'),
  microphoneMuted: Type.Boolean(),
  screenSharing: Type.Boolean(),
}, { additionalProperties: false })

export const SendRtcSignalCommandSchema = Type.Object({
  type: Type.Literal('rtc.signal'),
  targetPeerId: Type.String({ minLength: 1 }),
  payload: RtcSignalPayloadSchema,
}, { additionalProperties: false })

export const ClientMessageSchema = Type.Union([
  WatchRoomCommandSchema,
  JoinRoomCommandSchema,
  LeaveRoomCommandSchema,
  SendChatMessageCommandSchema,
  UpdateParticipantMediaCommandSchema,
  SendRtcSignalCommandSchema,
])

export type JoinRoomCommand = Type.Static<typeof JoinRoomCommandSchema>
export type WatchRoomCommand = Type.Static<typeof WatchRoomCommandSchema>
export type SendChatMessageCommand = Type.Static<typeof SendChatMessageCommandSchema>
export type UpdateParticipantMediaCommand = Type.Static<typeof UpdateParticipantMediaCommandSchema>
export type SendRtcSignalCommand = Type.Static<typeof SendRtcSignalCommandSchema>
export type ClientMessage = Type.Static<typeof ClientMessageSchema>
