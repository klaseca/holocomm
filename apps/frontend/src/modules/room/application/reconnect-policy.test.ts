import { describe, expect, test } from 'vitest'

import { reconnectDelayMs } from './reconnect-policy.ts'

describe('reconnectDelayMs', () => {
  test('backs off repeated reconnects without stopping retries', () => {
    expect([0, 1, 2, 3, 4, 5, 20].map(reconnectDelayMs)).toEqual([
      500,
      1_000,
      2_000,
      4_000,
      8_000,
      10_000,
      10_000,
    ])
  })
})
