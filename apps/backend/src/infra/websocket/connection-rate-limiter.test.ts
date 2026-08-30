import { describe, expect, test } from 'vitest'

import { ConnectionRateLimiter } from './connection-rate-limiter.ts'

describe('connectionRateLimiter', () => {
  test('rejects once per window and forgets disconnected clients', () => {
    let now = 0

    const limiter = new ConnectionRateLimiter(2, 1_000, () => now)

    expect(limiter.check('alice')).toBe('allowed')
    expect(limiter.check('alice')).toBe('allowed')
    expect(limiter.check('alice')).toBe('rejected')
    expect(limiter.check('alice')).toBe('rejected-silently')
    now = 1_000
    expect(limiter.check('alice')).toBe('allowed')
    limiter.remove('alice')
    expect(limiter.check('alice')).toBe('allowed')
  })
})
