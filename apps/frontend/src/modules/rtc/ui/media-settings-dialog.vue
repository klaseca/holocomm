<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import { Button, Dialog, Select, Switch } from '#/ui/primitives'

import { localMediaSettingsContext, SCREEN_AUDIO_QUALITY_OPTIONS, SCREEN_BITRATE_OPTIONS, SCREEN_FRAME_RATE_OPTIONS, SCREEN_QUALITY_OPTIONS, type ScreenAudioQuality, type ScreenBitrate, type ScreenFrameRate, type ScreenQuality, VOICE_QUALITY_OPTIONS, type VoiceQuality } from '../application/media-settings.ts'

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
            description="Requests audio when sharing starts. If sharing is already active, restart it to enable audio."
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
              v-model="screenAudioEchoCancellation"
              label="Echo cancellation"
              description="Reduces feedback when the shared source contains voice or speaker audio."
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
  gap: var(--space-4);
}

fieldset {
  display: grid;
  gap: var(--space-4);
  margin: 0;
  border: var(--stroke-default) solid var(--color-border-default);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  background: color-mix(in srgb, var(--color-surface-elevated) 45%, transparent);
}

legend {
  padding-inline: var(--space-2);
  color: var(--color-content-primary);
  font-weight: var(--font-weight-semibold);
}

label {
  display: grid;
  gap: var(--space-2);
  color: var(--color-content-secondary);
  font-size: var(--font-size-sm);
}

p {
  margin: 0;
  color: var(--color-content-secondary);
  font-size: var(--font-size-xs);
  line-height: var(--line-height-body);
}

.media-settings__processing {
  display: grid;
  gap: var(--space-4);
  border-top: var(--stroke-default) solid var(--color-border-default);
  padding-top: var(--space-4);
}
</style>
