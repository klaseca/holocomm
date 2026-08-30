import { describe, expect, test } from 'vitest'

import {
  isValidDisplayName,
  isValidRoomSlug,
  normalizeDisplayName,
  normalizeRoomSlug,
} from './input-policy.ts'

describe('shared input policy', () => {
  test('normalizes names and rejects control characters', () => {
    expect(normalizeDisplayName('  Alice   Cooper  ')).toBe('Alice Cooper')
    expect(isValidDisplayName('Alice')).toBe(true)
    expect(isValidDisplayName('Alice\u007F')).toBe(false)
  })

  test('normalizes room slugs consistently', () => {
    expect(normalizeRoomSlug(' Gaming Tonight! ')).toBe('gaming-tonight')
    expect(isValidRoomSlug(' Gaming Tonight! ')).toBe(true)
    expect(isValidRoomSlug('---')).toBe(false)
  })
})
