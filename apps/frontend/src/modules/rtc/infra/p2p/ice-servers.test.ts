import { describe, expect, test } from 'vitest'

import { resolveIceServers } from './ice-servers.ts'

describe('resolveIceServers', () => {
  test('uses the development STUN server by default', () => {
    expect(resolveIceServers(undefined)).toEqual([{
      urls: ['stun:stun.l.google.com:19302'],
    }])
  })

  test('accepts runtime configuration', () => {
    expect(resolveIceServers(['stun:one.example', 'turn:two.example'])).toEqual([{
      urls: ['stun:one.example', 'turn:two.example'],
    }])
  })
})
