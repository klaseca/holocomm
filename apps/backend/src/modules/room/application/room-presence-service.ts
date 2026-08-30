import { createGuestIdentity } from '#/modules/identity/index.ts'
import { ApplicationError } from '#/shared/errors/application-error.ts'

import { normalizeRoomSlug } from '../domain/room-slug.ts'
import type { Participant, Room } from '../domain/room.ts'
import type { RoomRegistry } from './room-registry.ts'

export interface PresenceSnapshot {
  readonly room: Room
  readonly self: Participant
  readonly participants: readonly Participant[]
}

export interface JoinPresenceResult {
  readonly snapshot: PresenceSnapshot
  readonly participant: Participant
  readonly recipientConnectionIds: readonly string[]
}

export interface WatchPresenceResult {
  readonly roomSlug: string
  readonly participants: readonly Participant[]
}

export interface LeavePresenceResult {
  readonly participant: Participant
  readonly recipientConnectionIds: readonly string[]
}

export interface CurrentRoomContext {
  readonly room: Room
  readonly participant: Participant
  readonly recipientConnectionIds: readonly string[]
}

export interface PeerRoute {
  readonly sourcePeerId: string
  readonly targetConnectionId: string
}

export interface UpdateMediaStateResult {
  readonly participant: Participant
  readonly recipientConnectionIds: readonly string[]
}

interface Membership {
  readonly roomSlug: string
  readonly participant: Participant
}

export class RoomPresenceService {
  private readonly memberships = new Map<string, Membership>()

  private readonly watchers = new Map<string, string>()

  private readonly roomRegistry: RoomRegistry

  constructor(roomRegistry: RoomRegistry) {
    this.roomRegistry = roomRegistry
  }

  join(connectionId: string, roomName: string, displayName: string): JoinPresenceResult {
    if (this.memberships.has(connectionId)) {
      throw new ApplicationError('INVALID_MESSAGE', 'Connection has already joined a room')
    }

    this.watchers.delete(connectionId)

    const identity = createGuestIdentity(displayName)

    const { room } = this.roomRegistry.join(roomName, identity)

    const participant = room.participants.get(identity.participantId)

    if (participant === undefined) {
      throw new ApplicationError('INTERNAL_ERROR', 'Participant was not added to the room')
    }

    const recipientConnectionIds = this.audienceConnectionIdsInRoom(room.slug)

    this.memberships.set(connectionId, { roomSlug: room.slug, participant })

    return {
      snapshot: {
        room,
        self: participant,
        participants: [...room.participants.values()],
      },
      participant,
      recipientConnectionIds,
    }
  }

  watch(connectionId: string, roomName: string): WatchPresenceResult {
    if (this.memberships.has(connectionId)) {
      throw new ApplicationError('INVALID_MESSAGE', 'Leave the room before watching it')
    }

    const roomSlug = normalizeRoomSlug(roomName)

    this.watchers.set(connectionId, roomSlug)

    const room = this.roomRegistry.get(roomSlug)

    return {
      roomSlug,
      participants: room === undefined ? [] : [...room.participants.values()],
    }
  }

  leave(connectionId: string): LeavePresenceResult | undefined {
    this.watchers.delete(connectionId)

    const membership = this.memberships.get(connectionId)

    if (membership === undefined) {
      return undefined
    }

    this.memberships.delete(connectionId)

    this.roomRegistry.leave(membership.roomSlug, membership.participant.id)

    return {
      participant: membership.participant,
      recipientConnectionIds: this.audienceConnectionIdsInRoom(membership.roomSlug),
    }
  }

  getCurrentRoom(connectionId: string): CurrentRoomContext | undefined {
    const membership = this.memberships.get(connectionId)

    if (membership === undefined) {
      return undefined
    }

    const room = this.roomRegistry.get(membership.roomSlug)

    if (room === undefined) {
      return undefined
    }

    return {
      room,
      participant: membership.participant,
      recipientConnectionIds: this.participantConnectionIdsInRoom(room.slug),
    }
  }

  updateMediaState(
    connectionId: string,
    microphoneMuted: boolean,
    screenSharing: boolean,
  ): UpdateMediaStateResult {
    const membership = this.memberships.get(connectionId)

    if (membership === undefined) {
      throw new ApplicationError('ROOM_NOT_FOUND', 'Join a room before updating media state')
    }

    membership.participant.microphoneMuted = microphoneMuted
    membership.participant.screenSharing = screenSharing

    return {
      participant: membership.participant,
      recipientConnectionIds: this.audienceConnectionIdsInRoom(membership.roomSlug),
    }
  }

  resolvePeer(connectionId: string, targetPeerId: string): PeerRoute | undefined {
    const source = this.memberships.get(connectionId)

    if (source === undefined || source.participant.id === targetPeerId) {
      return undefined
    }

    for (const [targetConnectionId, target] of this.memberships) {
      if (target.roomSlug === source.roomSlug && target.participant.id === targetPeerId) {
        return { sourcePeerId: source.participant.id, targetConnectionId }
      }
    }

    return undefined
  }

  private participantConnectionIdsInRoom(roomName: string): string[] {
    const slug = normalizeRoomSlug(roomName)

    const connectionIds: string[] = []

    for (const [connectionId, membership] of this.memberships) {
      if (membership.roomSlug === slug) {
        connectionIds.push(connectionId)
      }
    }

    return connectionIds
  }

  private audienceConnectionIdsInRoom(roomName: string): string[] {
    const slug = normalizeRoomSlug(roomName)

    const connectionIds = new Set(this.participantConnectionIdsInRoom(slug))

    for (const [connectionId, watchedRoomSlug] of this.watchers) {
      if (watchedRoomSlug === slug) {
        connectionIds.add(connectionId)
      }
    }

    return [...connectionIds]
  }
}
