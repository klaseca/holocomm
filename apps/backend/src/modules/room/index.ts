export {
  type CurrentRoomContext,
  type JoinPresenceResult,
  type LeavePresenceResult,
  type PeerRoute,
  type PresenceSnapshot,
  RoomPresenceService,
  type WatchPresenceResult,
} from './application/room-presence-service.ts'
export {
  type JoinRoomResult,
  RoomRegistry,
  type RoomRegistryOptions,
} from './application/room-registry.ts'
export { normalizeRoomSlug } from './domain/room-slug.ts'
export type { Participant, Room } from './domain/room.ts'
