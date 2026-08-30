import Type from 'typebox'

export const RtcOfferSignalSchema = Type.Object({
  kind: Type.Literal('offer'),
  sdp: Type.String({ minLength: 1 }),
}, { additionalProperties: false })

export const RtcAnswerSignalSchema = Type.Object({
  kind: Type.Literal('answer'),
  sdp: Type.String({ minLength: 1 }),
}, { additionalProperties: false })

export const RtcIceCandidateSignalSchema = Type.Object({
  kind: Type.Literal('ice-candidate'),
  candidate: Type.String({ minLength: 1 }),
  sdpMid: Type.Union([Type.String(), Type.Null()]),
  sdpMLineIndex: Type.Union([Type.Integer({ minimum: 0 }), Type.Null()]),
  usernameFragment: Type.Optional(Type.Union([Type.String(), Type.Null()])),
}, { additionalProperties: false })

export const RtcSignalPayloadSchema = Type.Union([
  RtcOfferSignalSchema,
  RtcAnswerSignalSchema,
  RtcIceCandidateSignalSchema,
])

export type RtcSignalPayload = Type.Static<typeof RtcSignalPayloadSchema>
