export const DISPLAY_NAME_MAX_LENGTH = 32
export const ROOM_SLUG_MAX_LENGTH = 64

export function normalizeDisplayName(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

export function isValidDisplayName(value: string): boolean {
  const displayName = normalizeDisplayName(value)

  return displayName.length > 0
    && displayName.length <= DISPLAY_NAME_MAX_LENGTH
    && !containsControlCharacter(displayName)
}

export function normalizeRoomSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function isValidRoomSlug(value: string): boolean {
  const slug = normalizeRoomSlug(value)

  return slug.length > 0 && slug.length <= ROOM_SLUG_MAX_LENGTH
}

function containsControlCharacter(value: string): boolean {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0)

    return codePoint != null && (codePoint < 32 || codePoint === 127)
  })
}
