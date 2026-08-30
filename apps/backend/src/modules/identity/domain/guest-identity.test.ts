import { describe, expect, test } from 'vitest'

import { createGuestIdentity, normalizeDisplayName } from './guest-identity.ts'

describe('guest identity', () => {
  test('normalizes the display name and creates secure session identifiers', () => {
    const identity = createGuestIdentity('  Alice   Cooper  ')

    expect(identity.displayName).toBe('Alice Cooper')
    expect(identity.participantId).toMatch(/^[0-9a-f-]{36}$/)
    expect(identity.sessionId).toMatch(/^[0-9a-f-]{36}$/)
    expect(identity.participantId).not.toBe(identity.sessionId)
  })

  test.each(['', '   ', 'a'.repeat(33), 'Alice\u0000'])(
    'rejects invalid display name %j',
    (value) => {
      expect(() => normalizeDisplayName(value)).toThrow(
        'Display name must be 1–32 characters',
      )
    },
  )
})
