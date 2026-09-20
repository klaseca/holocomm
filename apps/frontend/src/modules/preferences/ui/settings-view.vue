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
        <button
          v-for="option in themeOptions"
          :key="option.value"
          type="button"
          class="theme-option"
          :class="{ 'theme-option--active': theme.preference.value === option.value }"
          role="radio"
          :aria-checked="theme.preference.value === option.value"
          @click="theme.setPreference(option.value)"
        >
          <span class="theme-option__preview" :class="`theme-option__preview--${option.value}`">
            <span></span>
            <span></span>
          </span>
          <span class="theme-option__copy">
            <strong>{{ option.label }}</strong>
            <small>{{ option.description }}</small>
          </span>
          <span class="theme-option__indicator" aria-hidden="true"></span>
        </button>
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
  padding: var(--space-10);
}

.settings__header {
  margin-bottom: var(--space-8);
}

.settings__eyebrow,
.settings__header > p:last-child,
.settings-section__header p,
.profile-form__footer p {
  margin: 0;
}

.settings__eyebrow {
  color: var(--color-content-accent);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.settings h1 {
  margin: var(--space-2) 0;
  font-size: var(--font-size-2xl);
}

.settings__header > p:last-child,
.settings-section__header p,
.profile-form__footer p {
  color: var(--color-content-secondary);
}

.settings-section {
  display: grid;
  gap: var(--space-5);
  border: var(--stroke-default) solid var(--color-border-default);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  background: var(--color-surface-panel);
}

.settings-section + .settings-section {
  margin-top: var(--space-4);
}

.settings-section__header,
.profile-form__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
}

.settings-section__header h2 {
  margin: 0 0 var(--space-1);
  font-size: var(--font-size-lg);
}

.settings-section__header p,
.profile-form__footer p {
  font-size: var(--font-size-sm);
}

.profile-form {
  display: grid;
  gap: var(--space-4);
}

.theme-options {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-3);
}

.theme-option {
  position: relative;
  display: grid;
  gap: var(--space-3);
  border: var(--stroke-default) solid var(--color-border-default);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  color: var(--color-content-primary);
  background: var(--color-surface-inset);
  text-align: left;
  cursor: pointer;
}

.theme-option:hover {
  background: var(--color-action-neutral-background-hover);
}

.theme-option--active {
  border-color: var(--color-accent-emphasis);
}

.theme-option:focus-visible {
  outline: var(--stroke-focus) solid var(--color-focus);
  outline-offset: var(--stroke-focus-offset);
}

.theme-option__preview {
  display: grid;
  grid-template-columns: var(--space-6) 1fr;
  height: var(--space-12);
  overflow: hidden;
  border: var(--stroke-default) solid var(--color-border-default);
  border-radius: var(--radius-sm);
  background: #212830;
}

.theme-option__preview > :first-child {
  background: #1b2128;
}

.theme-option__preview > :last-child {
  margin: var(--space-2);
  border-radius: var(--radius-sm);
  background: #2d353f;
}

.theme-option__preview--light {
  background: #f6f8fa;
}

.theme-option__preview--light > :first-child {
  background: #eaeef2;
}

.theme-option__preview--light > :last-child {
  background: #ffffff;
}

.theme-option__preview--system {
  background: linear-gradient(135deg, #f6f8fa 0 50%, #212830 50% 100%);
}

.theme-option__preview--system > :first-child {
  background: linear-gradient(135deg, #eaeef2 0 50%, #1b2128 50% 100%);
}

.theme-option__copy {
  display: grid;
  gap: var(--space-1);
}

.theme-option__copy strong {
  font-size: var(--font-size-sm);
}

.theme-option__copy small {
  color: var(--color-content-secondary);
  font-size: var(--font-size-xs);
}

.theme-option__indicator {
  position: absolute;
  top: var(--space-3);
  right: var(--space-3);
  width: var(--space-3);
  height: var(--space-3);
  border: var(--stroke-default) solid var(--color-border-strong);
  border-radius: var(--radius-full);
  background: var(--color-surface-panel);
}

.theme-option--active .theme-option__indicator {
  border: var(--space-1) solid var(--color-accent-emphasis);
}

@media (max-width: 48rem) {
  .settings {
    padding: var(--space-6);
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
