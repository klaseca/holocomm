import { readonly, type Ref, ref } from 'vue'
import { Context } from 'vue-context-ts'

export type ScreenQuality = '720p' | '1080p' | '1440p' | '2160p'
export type ScreenFrameRate = 15 | 30 | 60
export type ScreenBitrate = '1-mbps' | '2.5-mbps' | '5-mbps' | '8-mbps' | '14-mbps'
export type ScreenAudioQuality = 'data-saver' | 'balanced' | 'high'
export type VoiceQuality = 'data-saver' | 'balanced' | 'high'

export interface MediaPreferences {
  readonly autoGainControl: boolean
  readonly echoCancellation: boolean
  readonly noiseSuppression: boolean
  readonly screenAudioAutoGainControl: boolean
  readonly screenAudioEnabled: boolean
  readonly screenAudioEchoCancellation: boolean
  readonly screenAudioNoiseSuppression: boolean
  readonly screenAudioQuality: ScreenAudioQuality
  readonly screenAudioStereo: boolean
  readonly screenQuality: ScreenQuality
  readonly screenFrameRate: ScreenFrameRate
  readonly screenBitrate: ScreenBitrate
  readonly voiceQuality: VoiceQuality
}

export interface RtcMediaSettings {
  readonly screen: {
    readonly width: number
    readonly height: number
    readonly frameRate: number
    readonly maxBitrate: number
  }
  readonly screenAudio: {
    readonly autoGainControl: boolean
    readonly enabled: boolean
    readonly echoCancellation: boolean
    readonly maxBitrate: number
    readonly noiseSuppression: boolean
    readonly stereo: boolean
  }
  readonly voice: {
    readonly autoGainControl: boolean
    readonly echoCancellation: boolean
    readonly maxBitrate: number
    readonly noiseSuppression: boolean
  }
}

export interface MediaSettingsStorage {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
}

export interface LocalMediaSettings {
  readonly preferences: Readonly<Ref<MediaPreferences>>
  setPreferences: (preferences: MediaPreferences) => void
}

export const SCREEN_QUALITY_OPTIONS = [
  { value: '720p', label: '720p' },
  { value: '1080p', label: '1080p' },
  { value: '1440p', label: '1440p' },
  { value: '2160p', label: '2160p' },
] as const

export const SCREEN_FRAME_RATE_OPTIONS = [15, 30, 60] as const

const screenFrameRateValues: readonly unknown[] = SCREEN_FRAME_RATE_OPTIONS

export const SCREEN_BITRATE_OPTIONS = [
  { value: '1-mbps', label: '1 Mbps', description: 'Low bandwidth' },
  { value: '2.5-mbps', label: '2.5 Mbps', description: 'Good for 720p' },
  { value: '5-mbps', label: '5 Mbps', description: 'Balanced default' },
  { value: '8-mbps', label: '8 Mbps', description: 'High detail or motion' },
  { value: '14-mbps', label: '14 Mbps', description: 'Very high bandwidth' },
] as const

export const SCREEN_AUDIO_QUALITY_OPTIONS = [
  { value: 'data-saver', label: 'Data saver', description: 'Up to 64 kbps' },
  { value: 'balanced', label: 'Balanced', description: 'Up to 128 kbps' },
  { value: 'high', label: 'High', description: 'Up to 256 kbps' },
] as const

export const VOICE_QUALITY_OPTIONS = [
  { value: 'data-saver', label: 'Data saver', description: 'Up to 32 kbps' },
  { value: 'balanced', label: 'Balanced', description: 'Up to 64 kbps' },
  { value: 'high', label: 'High', description: 'Up to 128 kbps' },
] as const

export const DEFAULT_MEDIA_PREFERENCES: MediaPreferences = {
  autoGainControl: true,
  echoCancellation: true,
  noiseSuppression: true,
  screenAudioAutoGainControl: false,
  screenAudioEnabled: true,
  screenAudioEchoCancellation: false,
  screenAudioNoiseSuppression: false,
  screenAudioQuality: 'high',
  screenAudioStereo: true,
  screenQuality: '1080p',
  screenFrameRate: 30,
  screenBitrate: '5-mbps',
  voiceQuality: 'balanced',
}

const STORAGE_KEY = 'holocomm.media-settings'

const screenProfiles: Record<ScreenQuality, Pick<RtcMediaSettings['screen'], 'width' | 'height'>> = {
  '720p': { width: 1280, height: 720 },
  '1080p': { width: 1920, height: 1080 },
  '1440p': { width: 2560, height: 1440 },
  '2160p': { width: 3840, height: 2160 },
}

const screenBitrates: Record<ScreenBitrate, number> = {
  '1-mbps': 1_000_000,
  '2.5-mbps': 2_500_000,
  '5-mbps': 5_000_000,
  '8-mbps': 8_000_000,
  '14-mbps': 14_000_000,
}

const screenAudioBitrates: Record<ScreenAudioQuality, number> = {
  'data-saver': 64_000,
  'balanced': 128_000,
  'high': 256_000,
}

const voiceBitrates: Record<VoiceQuality, number> = {
  'data-saver': 32_000,
  'balanced': 64_000,
  'high': 128_000,
}

export const localMediaSettingsContext = new Context({
  key: Symbol('holocomm:local-media-settings'),
  defaultValue: Context.valueType<LocalMediaSettings>(),
})

export function createLocalMediaSettings(storage: MediaSettingsStorage): LocalMediaSettings {
  const preferences = ref(readPreferences(storage))

  function setPreferences(nextPreferences: MediaPreferences): void {
    if (!isMediaPreferences(nextPreferences)) {
      return
    }

    preferences.value = { ...nextPreferences }
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify({ version: 3, ...nextPreferences }))
    } catch {
      // Media changes still apply for this tab when persistent storage is unavailable.
    }
  }

  return { preferences: readonly(preferences), setPreferences }
}

export function resolveMediaPreferences(preferences: MediaPreferences): RtcMediaSettings {
  return {
    screen: {
      ...screenProfiles[preferences.screenQuality],
      frameRate: preferences.screenFrameRate,
      maxBitrate: screenBitrates[preferences.screenBitrate],
    },
    screenAudio: {
      autoGainControl: preferences.screenAudioAutoGainControl,
      enabled: preferences.screenAudioEnabled,
      echoCancellation: preferences.screenAudioEchoCancellation,
      maxBitrate: screenAudioBitrates[preferences.screenAudioQuality],
      noiseSuppression: preferences.screenAudioNoiseSuppression,
      stereo: preferences.screenAudioStereo,
    },
    voice: {
      autoGainControl: preferences.autoGainControl,
      echoCancellation: preferences.echoCancellation,
      maxBitrate: voiceBitrates[preferences.voiceQuality],
      noiseSuppression: preferences.noiseSuppression,
    },
  }
}

export const DEFAULT_RTC_MEDIA_SETTINGS = resolveMediaPreferences(DEFAULT_MEDIA_PREFERENCES)

function readPreferences(storage: MediaSettingsStorage): MediaPreferences {
  try {
    const raw = storage.getItem(STORAGE_KEY)

    if (raw === null) {
      return DEFAULT_MEDIA_PREFERENCES
    }

    const parsed: unknown = JSON.parse(raw)

    if (
      !isRecord(parsed)
      || (parsed.version !== 1 && parsed.version !== 2 && parsed.version !== 3)
    ) {
      return DEFAULT_MEDIA_PREFERENCES
    }

    const preferences = {
      autoGainControl: parsed.autoGainControl ?? DEFAULT_MEDIA_PREFERENCES.autoGainControl,
      echoCancellation: parsed.echoCancellation ?? DEFAULT_MEDIA_PREFERENCES.echoCancellation,
      noiseSuppression: parsed.noiseSuppression ?? DEFAULT_MEDIA_PREFERENCES.noiseSuppression,
      screenAudioAutoGainControl: parsed.screenAudioAutoGainControl
        ?? DEFAULT_MEDIA_PREFERENCES.screenAudioAutoGainControl,
      screenAudioEnabled: parsed.screenAudioEnabled
        ?? DEFAULT_MEDIA_PREFERENCES.screenAudioEnabled,
      screenAudioEchoCancellation: parsed.screenAudioEchoCancellation
        ?? DEFAULT_MEDIA_PREFERENCES.screenAudioEchoCancellation,
      screenAudioNoiseSuppression: parsed.screenAudioNoiseSuppression
        ?? DEFAULT_MEDIA_PREFERENCES.screenAudioNoiseSuppression,
      screenAudioQuality: parsed.screenAudioQuality
        ?? DEFAULT_MEDIA_PREFERENCES.screenAudioQuality,
      screenAudioStereo: parsed.screenAudioStereo
        ?? DEFAULT_MEDIA_PREFERENCES.screenAudioStereo,
      screenQuality: parsed.screenQuality,
      screenFrameRate: parsed.screenFrameRate,
      screenBitrate: parsed.screenBitrate ?? DEFAULT_MEDIA_PREFERENCES.screenBitrate,
      voiceQuality: parsed.voiceQuality,
    }

    return isMediaPreferences(preferences) ? preferences : DEFAULT_MEDIA_PREFERENCES
  } catch {
    return DEFAULT_MEDIA_PREFERENCES
  }
}

function isMediaPreferences(value: unknown): value is MediaPreferences {
  if (!isRecord(value)) {
    return false
  }

  return typeof value.autoGainControl === 'boolean'
    && typeof value.echoCancellation === 'boolean'
    && typeof value.noiseSuppression === 'boolean'
    && typeof value.screenAudioAutoGainControl === 'boolean'
    && typeof value.screenAudioEnabled === 'boolean'
    && typeof value.screenAudioEchoCancellation === 'boolean'
    && typeof value.screenAudioNoiseSuppression === 'boolean'
    && SCREEN_AUDIO_QUALITY_OPTIONS.some(option => option.value === value.screenAudioQuality)
    && typeof value.screenAudioStereo === 'boolean'
    && SCREEN_QUALITY_OPTIONS.some(option => option.value === value.screenQuality)
    && screenFrameRateValues.includes(value.screenFrameRate)
    && SCREEN_BITRATE_OPTIONS.some(option => option.value === value.screenBitrate)
    && VOICE_QUALITY_OPTIONS.some(option => option.value === value.voiceQuality)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
