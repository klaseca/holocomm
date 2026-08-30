import type { GuestIdentity } from '#/modules/identity/index.ts'

export interface Participant {
  readonly id: string
  readonly sessionId: string
  readonly displayName: string
  readonly joinedAt: number
  microphoneMuted: boolean
  screenSharing: boolean
}

export interface Room {
  readonly id: string
  readonly slug: string
  readonly createdAt: number
  readonly participants: Map<string, Participant>
}

export function createParticipant(identity: GuestIdentity, joinedAt: number): Participant {
  return {
    id: identity.participantId,
    sessionId: identity.sessionId,
    displayName: identity.displayName,
    joinedAt,
    microphoneMuted: true,
    screenSharing: false,
  }
}
