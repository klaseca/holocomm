import { describe, expect, test } from 'vitest'

import { createLocalUserState, type LocalStoragePort } from './local-user-state.ts'

class MemoryStorage implements LocalStoragePort {
  value: string | null = null

  getItem(): string | null {
    return this.value
  }

  setItem(_key: string, value: string): void {
    this.value = value
  }
}

describe('local user state', () => {
  test('persists a normalized profile without reordering existing rooms', () => {
    const storage = new MemoryStorage()

    const state = createLocalUserState(storage)

    state.setDisplayName('  Alice   Example ')
    state.rememberRoom(' Team Room ', 10)
    state.rememberRoom('other-room', 20)
    state.rememberRoom('team-room', 30)
    state.rememberRoom('other-room', 40)

    expect(state.profile.value).toEqual({ displayName: 'Alice Example' })
    expect(state.rooms.value).toEqual([
      { slug: 'team-room', lastJoinedAt: 30 },
      { slug: 'other-room', lastJoinedAt: 40 },
    ])
    expect(createLocalUserState(storage).rooms.value).toEqual(state.rooms.value)
  })

  test('removes a saved room without affecting the profile', () => {
    const storage = new MemoryStorage()

    const state = createLocalUserState(storage)

    state.setDisplayName('Alice')
    state.rememberRoom('friends', 10)

    state.forgetRoom('friends')

    expect(state.profile.value).toEqual({ displayName: 'Alice' })
    expect(state.rooms.value).toEqual([])
  })

  test('ignores malformed or unsupported stored data', () => {
    const storage = new MemoryStorage()

    storage.value = JSON.stringify({ version: 2, profile: { displayName: 'Alice' } })

    const state = createLocalUserState(storage)

    expect(state.profile.value).toBeUndefined()
    expect(state.rooms.value).toEqual([])
  })
})
