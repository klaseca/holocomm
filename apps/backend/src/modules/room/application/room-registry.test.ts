import { afterEach, describe, expect, test, vi } from 'vitest'

import { createGuestIdentity } from '#/modules/identity/index.ts'

import { RoomRegistry } from './room-registry.ts'

afterEach(() => {
  vi.useRealTimers()
})

describe('roomRegistry', () => {
  test('creates a room on first join and reuses it for normalized names', () => {
    const registry = new RoomRegistry()

    const alice = createGuestIdentity('Alice')

    const bob = createGuestIdentity('Bob')

    const firstJoin = registry.join('Gaming Tonight', alice)

    const secondJoin = registry.join('gaming-tonight', bob)

    expect(firstJoin.created).toBe(true)
    expect(secondJoin.created).toBe(false)
    expect(secondJoin.room).toBe(firstJoin.room)
    expect(firstJoin.room.participants.size).toBe(2)
    expect(registry.size).toBe(1)
  })

  test('makes repeated join and leave operations idempotent', () => {
    const registry = new RoomRegistry()

    const alice = createGuestIdentity('Alice')

    registry.join('lobby', alice)
    registry.join('lobby', alice)

    expect(registry.get('lobby')?.participants.size).toBe(1)
    expect(registry.leave('lobby', alice.participantId)).toBe(true)
    expect(registry.leave('lobby', alice.participantId)).toBe(false)
  })

  test('enforces the participant limit', () => {
    const registry = new RoomRegistry({ maxParticipants: 1 })

    registry.join('lobby', createGuestIdentity('Alice'))

    expect(() => registry.join('lobby', createGuestIdentity('Bob'))).toThrow(
      'Room has reached its participant limit',
    )
  })

  test('destroys an empty room after its grace TTL', () => {
    vi.useFakeTimers()

    const registry = new RoomRegistry({ emptyRoomTtlMs: 1_000 })

    const alice = createGuestIdentity('Alice')

    registry.join('lobby', alice)
    registry.leave('lobby', alice.participantId)

    vi.advanceTimersByTime(999)
    expect(registry.get('lobby')).toBeDefined()

    vi.advanceTimersByTime(1)
    expect(registry.get('lobby')).toBeUndefined()
  })

  test('cancels destruction when another participant joins during the grace TTL', () => {
    vi.useFakeTimers()

    const registry = new RoomRegistry({ emptyRoomTtlMs: 1_000 })

    const alice = createGuestIdentity('Alice')

    registry.join('lobby', alice)
    registry.leave('lobby', alice.participantId)
    vi.advanceTimersByTime(500)

    registry.join('lobby', createGuestIdentity('Bob'))
    vi.advanceTimersByTime(1_000)

    expect(registry.get('lobby')?.participants.size).toBe(1)
  })
})
