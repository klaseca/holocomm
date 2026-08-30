import { readonly, type Ref, ref } from 'vue'
import { Context } from 'vue-context-ts'

import {
  normalizeDisplayName,
  normalizeRoomSlug,
  validateDisplayName,
  validateRoomSlug,
} from '../domain/guest-profile.ts'

export interface LocalProfile {
  readonly displayName: string
}

export interface SavedRoom {
  readonly slug: string
  readonly lastJoinedAt: number
}

interface StoredUserState {
  readonly version: 1
  readonly profile?: LocalProfile
  readonly rooms: SavedRoom[]
}

export interface LocalStoragePort {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
}

export interface LocalUserState {
  readonly profile: Readonly<Ref<LocalProfile | undefined>>
  readonly rooms: Readonly<Ref<readonly SavedRoom[]>>
  forgetRoom: (slug: string) => void
  rememberRoom: (slug: string, joinedAt?: number) => void
  setDisplayName: (displayName: string) => void
}

const STORAGE_KEY = 'holocomm.user-state'

export const localUserStateContext = new Context({
  key: Symbol('holocomm:local-user-state'),
  defaultValue: Context.valueType<LocalUserState>(),
})

export function createLocalUserState(storage: LocalStoragePort): LocalUserState {
  const stored = readStoredState(storage)

  const profile = ref<LocalProfile | undefined>(stored.profile)

  const rooms = ref<readonly SavedRoom[]>(stored.rooms)

  function persist(): void {
    const state: StoredUserState = {
      version: 1,
      profile: profile.value,
      rooms: [...rooms.value],
    }

    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // The app remains usable when storage is unavailable or full.
    }
  }

  function setDisplayName(displayName: string): void {
    if (validateDisplayName(displayName) != null) {
      return
    }

    profile.value = { displayName: normalizeDisplayName(displayName) }
    persist()
  }

  function rememberRoom(slug: string, joinedAt = Date.now()): void {
    if (validateRoomSlug(slug) != null) {
      return
    }

    const normalizedSlug = normalizeRoomSlug(slug)

    const savedRoom = { slug: normalizedSlug, lastJoinedAt: joinedAt }

    const existingIndex = rooms.value.findIndex(room => room.slug === normalizedSlug)

    rooms.value
      = existingIndex === -1
        ? [...rooms.value, savedRoom]
        : rooms.value.map((room, index) => (index === existingIndex ? savedRoom : room))
    persist()
  }

  function forgetRoom(slug: string): void {
    const normalizedSlug = normalizeRoomSlug(slug)

    const nextRooms = rooms.value.filter(room => room.slug !== normalizedSlug)

    if (nextRooms.length === rooms.value.length) {
      return
    }

    rooms.value = nextRooms
    persist()
  }

  return {
    profile: readonly(profile),
    rooms: readonly(rooms),
    forgetRoom,
    rememberRoom,
    setDisplayName,
  }
}

function readStoredState(storage: LocalStoragePort): StoredUserState {
  try {
    const raw = storage.getItem(STORAGE_KEY)

    if (raw === null) {
      return emptyStoredState()
    }

    const parsed: unknown = JSON.parse(raw)

    if (!isRecord(parsed) || parsed.version !== 1) {
      return emptyStoredState()
    }

    const profile = readProfile(parsed.profile)

    const rooms = Array.isArray(parsed.rooms) ? parsed.rooms.flatMap(readRoom) : []

    return { version: 1, profile, rooms: deduplicateRooms(rooms) }
  } catch {
    return emptyStoredState()
  }
}

function readProfile(value: unknown): LocalProfile | undefined {
  if (!isRecord(value) || typeof value.displayName !== 'string') {
    return undefined
  }

  if (validateDisplayName(value.displayName) != null) {
    return undefined
  }

  return { displayName: normalizeDisplayName(value.displayName) }
}

function readRoom(value: unknown): SavedRoom[] {
  if (
    !isRecord(value)
    || typeof value.slug !== 'string'
    || typeof value.lastJoinedAt !== 'number'
    || !Number.isFinite(value.lastJoinedAt)
    || validateRoomSlug(value.slug) != null
  ) {
    return []
  }

  return [
    {
      slug: normalizeRoomSlug(value.slug),
      lastJoinedAt: value.lastJoinedAt,
    },
  ]
}

function deduplicateRooms(rooms: readonly SavedRoom[]): SavedRoom[] {
  return [...new Map(rooms.map(room => [room.slug, room])).values()]
}

function emptyStoredState(): StoredUserState {
  return { version: 1, rooms: [] }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
