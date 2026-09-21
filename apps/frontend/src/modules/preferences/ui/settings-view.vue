<script setup lang="ts">
import { DISPLAY_NAME_MAX_LENGTH } from '@holocomm/protocol'
import { computed, ref, watch } from 'vue'

import { normalizeDisplayName, validateDisplayName } from '#/modules/identity/domain/guest-profile.ts'
import { MediaSettingsDialog } from '#/modules/rtc/ui/media-settings-dialog.vue'
import { Avatar, Button, Input } from '#/ui/primitives'

import { type ThemePreference, themeStateContext } from '../application/theme-state.ts'

const props = defineProps<{
  connected: boolean
  displayName: string
}>()

const emit = defineEmits<{
  updateDisplayName: [displayName: string]
}>()

const theme = themeStateContext.inject()

const displayName = ref(props.displayName)

const displayNameError = ref<string>()

const mediaSettingsOpen = ref(false)

const normalizedDisplayName = computed(() => normalizeDisplayName(displayName.value))

const canSaveDisplayName = computed(
  () => validateDisplayName(displayName.value) == null
    && normalizedDisplayName.value !== props.displayName,
)

const themeOptions: readonly {
  description: string
  label: string
  value: ThemePreference
}[] = [
  { value: 'system', label: 'System', description: 'Follow your device setting' },
  { value: 'dark', label: 'Dark', description: 'Use the dark appearance' },
  { value: 'light', label: 'Light', description: 'Use the light appearance' },
]

watch(
  () => props.displayName,
  value => (displayName.value = value),
)

watch(displayName, () => (displayNameError.value = undefined))

function saveDisplayName(): void {
  displayNameError.value = validateDisplayName(displayName.value)

  if (displayNameError.value != null || !canSaveDisplayName.value) {
    return
  }

  displayName.value = normalizedDisplayName.value
  emit('updateDisplayName', displayName.value)
}
</script>

<template>
  <main class="settings">
    <header class="settings__header">
      <p class="settings__eyebrow">Preferences</p>
      <h1>User settings</h1>
      <p>Manage the profile and appearance stored in this browser.</p>
    </header>

    <section class="settings-section" aria-labelledby="profile-settings-title">
      <header class="settings-section__header">
        <div>
          <h2 id="profile-settings-title">Profile</h2>
          <p>Choose the name shown to other people.</p>
        </div>
        <Avatar :name="normalizedDisplayName || displayName" size="lg" />
      </header>

      <form class="profile-form" @submit.prevent="saveDisplayName">
        <Input
          v-model="displayName"
          autocomplete="nickname"
          :error="displayNameError"
          label="Display name"
          :maxlength="DISPLAY_NAME_MAX_LENGTH"
          placeholder="Alice"
        />
        <div class="profile-form__footer">
          <p>
            {{ connected
              ? 'Your name changes immediately in the active room.'
              : 'This profile stays only in this browser.' }}
          </p>
          <Button :disabled="!canSaveDisplayName" native-type="submit">Save changes</Button>
        </div>
      </form>
    </section>

    <section class="settings-section" aria-labelledby="appearance-settings-title">
      <header class="settings-section__header">
        <div>
          <h2 id="appearance-settings-title">Appearance</h2>
          <p>Choose how Holocomm looks on this device.</p>
        </div>
      </header>

      <div class="theme-options" role="radiogroup" aria-label="Color theme">
        <label
          v-for="option in themeOptions"
          :key="option.value"
          class="theme-option"
          :class="{ 'theme-option--active': theme.preference.value === option.value }"
        >
          <input
            class="theme-option__input"
            type="radio"
            name="color-theme"
            :value="option.value"
            :checked="theme.preference.value === option.value"
            @change="theme.setPreference(option.value)"
          />
          <span class="theme-option__preview" :class="`theme-option__preview--${option.value}`">
            <span></span>
            <span></span>
          </span>
          <span class="theme-option__copy">
            <strong>{{ option.label }}</strong>
            <small>{{ option.description }}</small>
          </span>
          <span class="theme-option__indicator" aria-hidden="true"></span>
        </label>
      </div>
    </section>

    <section class="settings-section" aria-labelledby="media-settings-title">
      <header class="settings-section__header">
        <div>
          <h2 id="media-settings-title">Voice and screen sharing</h2>
          <p>Configure microphone processing, stream quality, and shared audio.</p>
        </div>
        <Button variant="secondary" @click="mediaSettingsOpen = true">Media settings</Button>
      </header>
    </section>

    <MediaSettingsDialog v-model="mediaSettingsOpen" />
  </main>
</template>

<style scoped>
.settings {
  width: min(100%, 52rem);
  margin-inline: auto;
  padding: var(--base-size-40);
}

.settings__header {
  margin-bottom: var(--base-size-32);
}

.settings__eyebrow,
.settings__header > p:last-child,
.settings-section__header p,
.profile-form__footer p {
  margin: 0;
}

.settings__eyebrow {
  color: var(--fg-color-accent);
  font-size: var(--text-body-size-medium);
  font-weight: var(--base-text-weight-semibold);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.settings h1 {
  margin: var(--base-size-8) 0;
  font-size: var(--text-display-size);
}

.settings__header > p:last-child,
.settings-section__header p,
.profile-form__footer p {
  color: var(--fg-color-muted);
}

.settings-section {
  display: grid;
  gap: var(--base-size-20);
  border: var(--border-width-thin) solid var(--border-color-default);
  border-radius: var(--border-radius-large);
  padding: var(--base-size-24);
  background: var(--bg-color-muted);
}

.settings-section + .settings-section {
  margin-top: var(--base-size-16);
}

.settings-section__header,
.profile-form__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--base-size-16);
}

.settings-section__header h2 {
  margin: 0 0 var(--base-size-4);
  font-size: var(--text-title-size-medium);
}

.settings-section__header p,
.profile-form__footer p {
  font-size: var(--text-body-size-medium);
}

.profile-form {
  display: grid;
  gap: var(--base-size-16);
}

.theme-options {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--base-size-12);
}

.theme-option {
  position: relative;
  display: grid;
  gap: var(--base-size-12);
  border: var(--border-width-thin) solid var(--border-color-default);
  border-radius: var(--border-radius-default);
  padding: var(--base-size-12);
  color: var(--fg-color-default);
  background: var(--bg-color-default);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.theme-option__input {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.theme-option:hover {
  background: var(--button-default-bg-color-hover);
}

.theme-option--active {
  border-color: var(--bg-color-accent-emphasis);
}

.theme-option:has(.theme-option__input:focus-visible) {
  outline: var(--focus-outline-width) solid var(--focus-outline-color);
  outline-offset: var(--focus-outline-offset);
}

.theme-option__preview {
  position: relative;
  display: grid;
  grid-template-columns: var(--base-size-24) 1fr;
  height: var(--base-size-48);
  overflow: hidden;
  border: var(--border-width-thin) solid var(--border-color-default);
  border-radius: var(--border-radius-medium);
  background: var(--theme-preview-dark-canvas-bg-color);
}

.theme-option__preview > :first-child {
  background: var(--theme-preview-dark-navigation-bg-color);
}

.theme-option__preview > :last-child {
  margin: var(--base-size-8);
  border-radius: var(--border-radius-medium);
  background: var(--theme-preview-dark-panel-bg-color);
}

.theme-option__preview--light {
  background: var(--theme-preview-light-canvas-bg-color);
}

.theme-option__preview--light > :first-child {
  background: var(--theme-preview-light-navigation-bg-color);
}

.theme-option__preview--light > :last-child {
  background: var(--theme-preview-light-panel-bg-color);
}

.theme-option__preview--system {
  background: linear-gradient(
    to right,
    var(--theme-preview-light-canvas-bg-color) 0 50%,
    var(--theme-preview-dark-canvas-bg-color) 50% 100%
  );
}

.theme-option__preview--system > :first-child {
  background: linear-gradient(
    to right,
    var(--theme-preview-light-navigation-bg-color) 0 50%,
    var(--theme-preview-dark-navigation-bg-color) 50% 100%
  );
}

.theme-option__preview--system > :last-child {
  background: linear-gradient(
    to right,
    var(--theme-preview-light-panel-bg-color) 0 50%,
    var(--theme-preview-dark-panel-bg-color) 50% 100%
  );
}

.theme-option__copy {
  display: grid;
  gap: var(--base-size-4);
}

.theme-option__copy strong {
  font-size: var(--text-body-size-medium);
}

.theme-option__copy small {
  color: var(--fg-color-muted);
  font-size: var(--text-body-size-small);
}

.theme-option__indicator {
  position: absolute;
  top: var(--base-size-12);
  right: var(--base-size-12);
  width: var(--base-size-12);
  height: var(--base-size-12);
  border: var(--border-width-thin) solid var(--border-color-emphasis);
  border-radius: var(--border-radius-full);
  background: var(--bg-color-muted);
}

.theme-option--active .theme-option__indicator {
  border: var(--base-size-4) solid var(--bg-color-accent-emphasis);
}

@media (max-width: 48rem) {
  .settings {
    padding: var(--base-size-24);
  }

  .theme-options {
    grid-template-columns: 1fr;
  }

  .settings-section__header,
  .profile-form__footer {
    align-items: stretch;
    flex-direction: column;
  }

  .settings-section__header :deep(.avatar) {
    align-self: flex-start;
  }
}
</style>
