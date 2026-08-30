import { describe, expect, test } from 'vitest'

import { createThemeState, type SystemThemeQuery, type ThemeRoot } from './theme-state.ts'

class FakeRoot implements ThemeRoot {
  readonly attributes = new Map<string, string>()

  removeAttribute(name: string): void {
    this.attributes.delete(name)
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value)
  }
}

class FakeSystemTheme implements SystemThemeQuery {
  matches: boolean

  private listener?: () => void

  constructor(matches: boolean) {
    this.matches = matches
  }

  addEventListener(_type: 'change', listener: () => void): void {
    this.listener = listener
  }

  removeEventListener(_type: 'change', listener: () => void): void {
    if (this.listener === listener) {
      this.listener = undefined
    }
  }

  setDark(matches: boolean): void {
    this.matches = matches
    this.listener?.()
  }
}

describe('theme state', () => {
  test('follows system preference by default and reacts to changes', () => {
    const root = new FakeRoot()

    const systemTheme = new FakeSystemTheme(false)

    const state = createThemeState(new MapStorage(), root, systemTheme)

    expect(state.preference.value).toBe('system')
    expect(state.colorScheme.value).toBe('light')
    expect(root.attributes.get('data-color-scheme')).toBe('light')

    systemTheme.setDark(true)
    expect(state.colorScheme.value).toBe('dark')
    expect(root.attributes.has('data-color-scheme')).toBe(false)
  })

  test('persists an explicit preference and ignores system changes', () => {
    const storage = new MapStorage()

    const root = new FakeRoot()

    const systemTheme = new FakeSystemTheme(true)

    const state = createThemeState(storage, root, systemTheme)

    state.setPreference('light')
    systemTheme.setDark(false)

    expect(storage.getItem('holocomm.theme')).toBe('light')
    expect(state.colorScheme.value).toBe('light')
    expect(root.attributes.get('data-color-scheme')).toBe('light')
  })

  test('cycles through system, dark, and light preferences', () => {
    const state = createThemeState(new MapStorage(), new FakeRoot(), new FakeSystemTheme(false))

    state.cyclePreference()
    expect(state.preference.value).toBe('dark')
    state.cyclePreference()
    expect(state.preference.value).toBe('light')
    state.cyclePreference()
    expect(state.preference.value).toBe('system')
  })
})

class MapStorage {
  private readonly values = new Map<string, string>()

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }
}
