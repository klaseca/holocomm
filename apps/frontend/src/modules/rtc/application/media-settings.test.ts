import { describe, expect, test } from 'vitest'

import { createLocalMediaSettings, DEFAULT_MEDIA_PREFERENCES, type MediaSettingsStorage, resolveMediaPreferences } from './media-settings.ts'

class MemoryStorage implements MediaSettingsStorage {
  value: string | null = null

  getItem(): string | null {
    return this.value
  }

  setItem(_key: string, value: string): void {
    this.value = value
  }
}

describe('local media settings', () => {
  test('persists valid media preferences', () => {
    const storage = new MemoryStorage()

    const settings = createLocalMediaSettings(storage)

    settings.setPreferences({
      autoGainControl: false,
      echoCancellation: true,
      noiseSuppression: false,
      screenAudioAutoGainControl: true,
      screenAudioEnabled: true,
      screenAudioEchoCancellation: false,
      screenAudioNoiseSuppression: true,
      screenAudioQuality: 'balanced',
      screenAudioStereo: false,
      screenQuality: '1440p',
      screenFrameRate: 60,
      screenBitrate: '14-mbps',
      voiceQuality: 'high',
    })

    expect(createLocalMediaSettings(storage).preferences.value).toEqual(settings.preferences.value)
    expect(resolveMediaPreferences(settings.preferences.value)).toEqual({
      screen: { width: 2560, height: 1440, frameRate: 60, maxBitrate: 14_000_000 },
      screenAudio: {
        autoGainControl: true,
        enabled: true,
        echoCancellation: false,
        maxBitrate: 128_000,
        noiseSuppression: true,
        stereo: false,
      },
      voice: {
        autoGainControl: false,
        echoCancellation: true,
        maxBitrate: 128_000,
        noiseSuppression: false,
      },
    })
  })

  test('falls back to balanced defaults for malformed preferences', () => {
    const storage = new MemoryStorage()

    storage.value = JSON.stringify({
      version: 1,
      screenQuality: '8k',
      screenFrameRate: 120,
      screenBitrate: '100-mbps',
      voiceQuality: 'studio',
    })

    expect(createLocalMediaSettings(storage).preferences.value).toEqual(DEFAULT_MEDIA_PREFERENCES)
  })

  test('adds the independent default bitrate to previously stored preferences', () => {
    const storage = new MemoryStorage()

    storage.value = JSON.stringify({
      version: 1,
      screenQuality: '720p',
      screenFrameRate: 15,
      voiceQuality: 'data-saver',
    })

    expect(createLocalMediaSettings(storage).preferences.value).toEqual({
      autoGainControl: true,
      echoCancellation: true,
      noiseSuppression: true,
      screenAudioAutoGainControl: false,
      screenAudioEnabled: true,
      screenAudioEchoCancellation: false,
      screenAudioNoiseSuppression: false,
      screenAudioQuality: 'high',
      screenAudioStereo: true,
      screenQuality: '720p',
      screenFrameRate: 15,
      screenBitrate: '5-mbps',
      voiceQuality: 'data-saver',
    })
  })
})
