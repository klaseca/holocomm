import { isValidDisplayName, isValidRoomSlug } from '@holocomm/protocol'

export { normalizeDisplayName, normalizeRoomSlug } from '@holocomm/protocol'

export function validateDisplayName(value: string): string | undefined {
  if (!isValidDisplayName(value)) {
    return 'Use a display name between 1 and 32 characters.'
  }

  return undefined
}

export function validateRoomSlug(value: string): string | undefined {
  if (!isValidRoomSlug(value)) {
    return 'Use a room name that produces a 1–64 character slug.'
  }

  return undefined
}

export function generateRoomSlug(): string {
  return `room-${crypto.randomUUID()}`
}
