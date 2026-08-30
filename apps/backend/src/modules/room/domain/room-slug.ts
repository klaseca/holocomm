import { isValidRoomSlug, normalizeRoomSlug as normalizeSlug } from '@holocomm/protocol'

import { ApplicationError } from '#/shared/errors/application-error.ts'

export function normalizeRoomSlug(value: string): string {
  const slug = normalizeSlug(value)

  if (!isValidRoomSlug(slug)) {
    throw new ApplicationError('INVALID_ROOM_NAME', 'Room name must produce a 1–64 character slug')
  }

  return slug
}
