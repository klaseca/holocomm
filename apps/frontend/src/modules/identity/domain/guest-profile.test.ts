import { describe, expect, test } from 'vitest'

import {
  generateRoomSlug,
  normalizeDisplayName,
  normalizeRoomSlug,
  validateDisplayName,
  validateRoomSlug,
} from './guest-profile.ts'

describe('guest profile', () => {
  test('normalizes display names and room slugs before joining', () => {
    expect(normalizeDisplayName('  Alice   Cooper ')).toBe('Alice Cooper')
    expect(normalizeRoomSlug(' Gaming Tonight! ')).toBe('gaming-tonight')
  })

  test('rejects empty and oversized values', () => {
    expect(validateDisplayName('   ')).toBeDefined()
    expect(validateDisplayName('a'.repeat(33))).toBeDefined()
    expect(validateRoomSlug('---')).toBeDefined()
    expect(validateRoomSlug('a'.repeat(65))).toBeDefined()
  })

  test('generates room slugs with a complete random UUID', () => {
    expect(generateRoomSlug()).toMatch(
      /^room-[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/,
    )
  })
})
