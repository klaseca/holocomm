import { describe, expect, test } from 'vitest'

import { normalizeRoomSlug } from './room-slug.ts'

describe('normalizeRoomSlug', () => {
  test('creates a stable URL-safe slug', () => {
    expect(normalizeRoomSlug('  Gaming Tonight!  ')).toBe('gaming-tonight')
  })

  test.each(['', '---', 'a'.repeat(65)])('rejects invalid room name %j', (value) => {
    expect(() => normalizeRoomSlug(value)).toThrow(
      'Room name must produce a 1–64 character slug',
    )
  })
})
