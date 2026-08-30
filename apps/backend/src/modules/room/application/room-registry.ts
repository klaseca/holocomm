import type { GuestIdentity } from '#/modules/identity/index.ts'
import { ApplicationError } from '#/shared/errors/application-error.ts'

import { normalizeRoomSlug } from '../domain/room-slug.ts'
import { createParticipant, type Room } from '../domain/room.ts'

export interface RoomRegistryOptions {
  readonly emptyRoomTtlMs: number
  readonly maxParticipants: number
}

export interface JoinRoomResult {
  readonly room: Room
  readonly created: boolean
}

const DEFAULT_OPTIONS: RoomRegistryOptions = {
  emptyRoomTtlMs: 60_000,
  maxParticipants: 4,
}

export class RoomRegistry {
  private readonly rooms = new Map<string, Room>()

  private readonly destructionTimers = new Map<string, ReturnType<typeof setTimeout>>()

  private readonly options: RoomRegistryOptions

  constructor(options: Partial<RoomRegistryOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options }

    if (this.options.emptyRoomTtlMs < 0) {
      throw new RangeError('emptyRoomTtlMs cannot be negative')
    }

    if (!Number.isInteger(this.options.maxParticipants) || this.options.maxParticipants < 1) {
      throw new RangeError('maxParticipants must be a positive integer')
    }
  }

  get size(): number {
    return this.rooms.size
  }

  get(roomName: string): Room | undefined {
    return this.rooms.get(normalizeRoomSlug(roomName))
  }

  join(roomName: string, identity: GuestIdentity): JoinRoomResult {
    const slug = normalizeRoomSlug(roomName)

    let room = this.rooms.get(slug)

    const created = room === undefined

    if (room === undefined) {
      const now = Date.now()

      room = {
        id: crypto.randomUUID(),
        slug,
        createdAt: now,
        participants: new Map(),
      }
      this.rooms.set(slug, room)
    }

    this.cancelDestruction(slug)

    if (room.participants.has(identity.participantId)) {
      return { room, created }
    }

    if (room.participants.size >= this.options.maxParticipants) {
      if (created) {
        this.rooms.delete(slug)
      }

      throw new ApplicationError('ROOM_FULL', 'Room has reached its participant limit')
    }

    room.participants.set(identity.participantId, createParticipant(identity, Date.now()))

    return { room, created }
  }

  leave(roomName: string, participantId: string): boolean {
    const slug = normalizeRoomSlug(roomName)

    const room = this.rooms.get(slug)

    if (room === undefined || !room.participants.delete(participantId)) {
      return false
    }

    if (room.participants.size === 0) {
      this.scheduleDestruction(room)
    }

    return true
  }

  destroy(roomName: string): boolean {
    const slug = normalizeRoomSlug(roomName)

    this.cancelDestruction(slug)

    return this.rooms.delete(slug)
  }

  private scheduleDestruction(room: Room): void {
    this.cancelDestruction(room.slug)

    const timer = setTimeout(() => {
      this.destructionTimers.delete(room.slug)

      if (this.rooms.get(room.slug) === room && room.participants.size === 0) {
        this.rooms.delete(room.slug)
      }
    }, this.options.emptyRoomTtlMs)

    this.destructionTimers.set(room.slug, timer)
  }

  private cancelDestruction(slug: string): void {
    const timer = this.destructionTimers.get(slug)

    if (timer != null) {
      clearTimeout(timer)
      this.destructionTimers.delete(slug)
    }
  }
}
