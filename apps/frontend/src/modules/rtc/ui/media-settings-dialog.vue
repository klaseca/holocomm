<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import { Button, Dialog, Select, Switch } from '#/ui/primitives'

import { localMediaSettingsContext, SCREEN_AUDIO_QUALITY_OPTIONS, SCREEN_BITRATE_OPTIONS, SCREEN_FRAME_RATE_OPTIONS, SCREEN_QUALITY_OPTIONS, type ScreenAudioQuality, type ScreenBitrate, type ScreenFrameRate, type ScreenQuality, VOICE_QUALITY_OPTIONS, type VoiceQuality } from '../application/media-settings.ts'
import { isSupportsOwnAudioRestriction } from '../infra/screen-capture-capabilities.ts'

const props = defineProps<{
  screenStream?: MediaStream
}>()

const open = defineModel<boolean>({ default: false })

const mediaSettings = localMediaSettingsContext.inject()

const autoGainControl = ref(mediaSettings.preferences.value.autoGainControl)

const echoCancellation = ref(mediaSettings.preferences.value.echoCancellation)

const noiseSuppression = ref(mediaSettings.preferences.value.noiseSuppression)

const screenAudioAutoGainControl = ref(
  mediaSettings.preferences.value.screenAudioAutoGainControl,
)

const screenAudioEnabled = ref(mediaSettings.preferences.value.screenAudioEnabled)

const screenAudioEchoCancellation = ref(
  mediaSettings.preferences.value.screenAudioEchoCancellation,
)

const screenAudioNoiseSuppression = ref(
  mediaSettings.preferences.value.screenAudioNoiseSuppression,
)

const screenAudioQuality = ref<ScreenAudioQuality>(
  mediaSettings.preferences.value.screenAudioQuality,
)

const screenAudioRestrictOwnAudio = ref(
  mediaSettings.preferences.value.screenAudioRestrictOwnAudio,
)

const ownAudioRestrictionSupported = isSupportsOwnAudioRestriction()

const ownAudioRestrictionAvailable = computed(() => {
  const track = props.screenStream?.getAudioTracks()[0]

  return track?.readyState === 'live' && isSupportsOwnAudioRestriction(track)
})

const ownAudioRestrictionDescription = computed(() => {
  if (!ownAudioRestrictionSupported) {
    return 'This browser cannot exclude call audio. You can use echo cancellation instead.'
  }

  const track = props.screenStream?.getAudioTracks()[0]

  if (track?.readyState !== 'live') {
    return 'Start sharing with audio to check availability.'
  }

  if (!ownAudioRestrictionAvailable.value) {
    return 'Unavailable for this source or device. Use echo cancellation instead.'
  }

  const settings = track.getSettings()

  if (screenAudioRestrictOwnAudio.value
    && (!('restrictOwnAudio' in settings) || settings.restrictOwnAudio !== true)) {
    return 'Not enabled for the current stream. Changing this requires a new screen selection.'
  }

  return 'Requests exclusion of audio from this page when sharing starts. Works independently of echo cancellation.'
})

const screenAudioStereo = ref(mediaSettings.preferences.value.screenAudioStereo)

const screenQuality = ref<ScreenQuality>(mediaSettings.preferences.value.screenQuality)

const screenFrameRate = ref<ScreenFrameRate>(mediaSettings.preferences.value.screenFrameRate)

const screenBitrate = ref<ScreenBitrate>(mediaSettings.preferences.value.screenBitrate)

const voiceQuality = ref<VoiceQuality>(mediaSettings.preferences.value.voiceQuality)

const screenFrameRateOptions = SCREEN_FRAME_RATE_OPTIONS.map(frameRate => ({
  value: String(frameRate),
  label: `${frameRate} FPS`,
}))

const screenFrameRateModel = computed({
  get: () => String(screenFrameRate.value),
  set: (value: string) => {
    screenFrameRate.value = Number(value) as ScreenFrameRate
  },
})

watch(open, (isOpen) => {
  if (!isOpen) {
    return
  }

  autoGainControl.value = mediaSettings.preferences.value.autoGainControl
  echoCancellation.value = mediaSettings.preferences.value.echoCancellation
  noiseSuppression.value = mediaSettings.preferences.value.noiseSuppression
  screenAudioAutoGainControl.value = mediaSettings.preferences.value.screenAudioAutoGainControl
  screenAudioEnabled.value = mediaSettings.preferences.value.screenAudioEnabled
  screenAudioEchoCancellation.value
    = mediaSettings.preferences.value.screenAudioEchoCancellation
  screenAudioNoiseSuppression.value
    = mediaSettings.preferences.value.screenAudioNoiseSuppression
  screenAudioQuality.value = mediaSettings.preferences.value.screenAudioQuality
  screenAudioRestrictOwnAudio.value = mediaSettings.preferences.value.screenAudioRestrictOwnAudio
  screenAudioStereo.value = mediaSettings.preferences.value.screenAudioStereo
  screenQuality.value = mediaSettings.preferences.value.screenQuality
  screenFrameRate.value = mediaSettings.preferences.value.screenFrameRate
  screenBitrate.value = mediaSettings.preferences.value.screenBitrate
  voiceQuality.value = mediaSettings.preferences.value.voiceQuality
})

function save(): void {
  mediaSettings.setPreferences({
    autoGainControl: autoGainControl.value,
    echoCancellation: echoCancellation.value,
    noiseSuppression: noiseSuppression.value,
    screenAudioAutoGainControl: screenAudioAutoGainControl.value,
    screenAudioEnabled: screenAudioEnabled.value,
    screenAudioEchoCancellation: screenAudioEchoCancellation.value,
    screenAudioNoiseSuppression: screenAudioNoiseSuppression.value,
    screenAudioQuality: screenAudioQuality.value,
    screenAudioRestrictOwnAudio: screenAudioRestrictOwnAudio.value,
    screenAudioStereo: screenAudioStereo.value,
    screenQuality: screenQuality.value,
    screenFrameRate: screenFrameRate.value,
    screenBitrate: screenBitrate.value,
    voiceQuality: voiceQuality.value,
  })
  open.value = false
}
</script>

<template>
  <Dialog
    v-model="open"
    description="Tune outgoing media for your connection and device."
    size="lg"
    title="Media quality"
  >
    <form id="media-settings-form" class="media-settings" @submit.prevent="save">
      <fieldset>
        <legend>Screen sharing</legend>
        <label>
          <span>Resolution</span>
          <Select
            v-model="screenQuality"
            accessible-label="Screen share resolution"
            :options="SCREEN_QUALITY_OPTIONS"
          />
        </label>
        <label>
          <span>Frame rate</span>
          <Select
            v-model="screenFrameRateModel"
            accessible-label="Screen share frame rate"
            :options="screenFrameRateOptions"
          />
        </label>
        <label>
          <span>Maximum bitrate</span>
          <Select
            v-model="screenBitrate"
            accessible-label="Screen share maximum bitrate"
            :options="SCREEN_BITRATE_OPTIONS"
          />
        </label>
        <div class="media-settings__processing">
          <Switch
            v-model="screenAudioEnabled"
            label="Share system audio"
            description="Requests audio from the screen, window, or tab you choose to share."
          />
          <template v-if="screenAudioEnabled">
            <label>
              <span>Audio quality</span>
              <Select
                v-model="screenAudioQuality"
                accessible-label="Screen share audio quality"
                :options="SCREEN_AUDIO_QUALITY_OPTIONS"
              />
            </label>
            <Switch
              v-model="screenAudioStereo"
              label="Stereo audio"
              description="Preserves spatial separation for music, games, and video."
            />
            <Switch
              label="Exclude call audio"
              :description="ownAudioRestrictionDescription"
              :disabled="!ownAudioRestrictionAvailable"
              :model-value="ownAudioRestrictionAvailable && screenAudioRestrictOwnAudio"
              @update:model-value="screenAudioRestrictOwnAudio = $event"
            />
            <Switch
              v-model="screenAudioEchoCancellation"
              label="Echo cancellation"
              description="Reduces participants' voices returning through shared audio, but may affect music and game sound."
            />
            <Switch
              v-model="screenAudioNoiseSuppression"
              label="Noise suppression"
              description="Filters background noise, but may affect music and game audio."
            />
            <Switch
              v-model="screenAudioAutoGainControl"
              label="Automatic gain control"
              description="Normalizes volume, but may reduce the dynamics of shared audio."
            />
          </template>
          <p>
            If the browser cannot apply audio capture changes during a stream, saving asks you
            to choose a screen again. Bitrate changes and muting shared audio do not restart it.
          </p>
        </div>
        <p>Higher settings use more upload bandwidth and processing power.</p>
      </fieldset>

      <fieldset>
        <legend>Microphone</legend>
        <label>
          <span>Voice quality</span>
          <Select
            v-model="voiceQuality"
            accessible-label="Voice quality"
            :options="VOICE_QUALITY_OPTIONS"
          />
        </label>
        <div class="media-settings__processing">
          <Switch
            v-model="echoCancellation"
            label="Echo cancellation"
            description="Reduces audio from your speakers returning through the microphone."
          />
          <Switch
            v-model="noiseSuppression"
            label="Noise suppression"
            description="Filters steady background noise such as fans and keyboard sounds."
          />
          <Switch
            v-model="autoGainControl"
            label="Automatic gain control"
            description="Keeps quiet and loud speech at a more consistent level."
          />
        </div>
        <p>Microphone audio is captured as 48 kHz mono when supported by the browser.</p>
      </fieldset>
    </form>

    <template #footer>
      <Button variant="secondary" @click="open = false">Cancel</Button>
      <Button native-type="submit" form="media-settings-form">Save settings</Button>
    </template>
  </Dialog>
</template>

<style scoped>
.media-settings {
  display: grid;
  gap: var(--base-size-16);
}

fieldset {
  display: grid;
  gap: var(--base-size-16);
  margin: 0;
  border: var(--border-width-thin) solid var(--border-color-default);
  border-radius: var(--border-radius-default);
  padding: var(--base-size-16);
  background: var(--bg-color-muted);
}

legend {
  padding-inline: var(--base-size-8);
  color: var(--fg-color-default);
  font-weight: var(--base-text-weight-semibold);
}

label {
  display: grid;
  gap: var(--base-size-8);
  color: var(--fg-color-muted);
  font-size: var(--text-body-size-medium);
}

p {
  margin: 0;
  color: var(--fg-color-muted);
  font-size: var(--text-body-size-small);
  line-height: var(--text-body-line-height-medium);
}

.media-settings__processing {
  display: grid;
  gap: var(--base-size-16);
  border-top: var(--border-width-thin) solid var(--border-color-default);
  padding-top: var(--base-size-16);
}
</style>
