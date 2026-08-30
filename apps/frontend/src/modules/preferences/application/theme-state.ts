import { readonly, type Ref, ref } from 'vue'
import { Context } from 'vue-context-ts'

export type ThemePreference = 'system' | 'dark' | 'light'
export type ColorScheme = 'dark' | 'light'

export interface ThemeStorage {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
}

export interface ThemeRoot {
  removeAttribute: (name: string) => void
  setAttribute: (name: string, value: string) => void
}

export interface SystemThemeQuery {
  readonly matches: boolean
  addEventListener: (type: 'change', listener: () => void) => void
  removeEventListener: (type: 'change', listener: () => void) => void
}

export interface ThemeState {
  readonly preference: Readonly<Ref<ThemePreference>>
  readonly colorScheme: Readonly<Ref<ColorScheme>>
  cyclePreference: () => void
  destroy: () => void
  setPreference: (preference: ThemePreference) => void
}

const STORAGE_KEY = 'holocomm.theme'

const preferences: readonly ThemePreference[] = ['system', 'dark', 'light']

export const themeStateContext = new Context({
  key: Symbol('holocomm:theme-state'),
  defaultValue: Context.valueType<ThemeState>(),
})

export function createThemeState(
  storage: ThemeStorage,
  root: ThemeRoot,
  systemTheme: SystemThemeQuery,
): ThemeState {
  const preference = ref(readPreference(storage))

  const colorScheme = ref<ColorScheme>(resolveColorScheme(preference.value, systemTheme.matches))

  function apply(): void {
    colorScheme.value = resolveColorScheme(preference.value, systemTheme.matches)

    if (colorScheme.value === 'light') {
      root.setAttribute('data-color-scheme', 'light')
    } else {
      root.removeAttribute('data-color-scheme')
    }
  }

  function setPreference(nextPreference: ThemePreference): void {
    preference.value = nextPreference
    try {
      storage.setItem(STORAGE_KEY, nextPreference)
    } catch {
      // Theme selection still works for the current session when storage is unavailable.
    }
    apply()
  }

  function cyclePreference(): void {
    const currentIndex = preferences.indexOf(preference.value)

    setPreference(preferences[(currentIndex + 1) % preferences.length])
  }

  function handleSystemThemeChange(): void {
    if (preference.value === 'system') {
      apply()
    }
  }

  function destroy(): void {
    systemTheme.removeEventListener('change', handleSystemThemeChange)
  }

  systemTheme.addEventListener('change', handleSystemThemeChange)
  apply()

  return {
    preference: readonly(preference),
    colorScheme: readonly(colorScheme),
    cyclePreference,
    destroy,
    setPreference,
  }
}

function readPreference(storage: ThemeStorage): ThemePreference {
  try {
    const value = storage.getItem(STORAGE_KEY)

    return isThemePreference(value) ? value : 'system'
  } catch {
    return 'system'
  }
}

function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'dark' || value === 'light'
}

function resolveColorScheme(preference: ThemePreference, systemPrefersDark: boolean): ColorScheme {
  if (preference !== 'system') {
    return preference
  }

  return systemPrefersDark ? 'dark' : 'light'
}
