<script setup lang="ts">
import { DISPLAY_NAME_MAX_LENGTH } from '@holocomm/protocol'
import { ref } from 'vue'

import { Button, Input } from '#/ui/primitives'

import {
  normalizeDisplayName,
  validateDisplayName,
} from '../domain/guest-profile.ts'

const emit = defineEmits<{ complete: [displayName: string] }>()

const displayName = ref('')

const displayNameError = ref<string>()

function submit(): void {
  displayNameError.value = validateDisplayName(displayName.value)

  if (displayNameError.value != null) {
    return
  }

  emit('complete', normalizeDisplayName(displayName.value))
}
</script>

<template>
  <main class="onboarding">
    <section class="onboarding__intro">
      <p class="eyebrow">Welcome to Holocomm</p>
      <h1>Your rooms. No account required.</h1>
      <p>
        Choose how people see you. Your profile and room shortcuts stay only in this browser.
      </p>
    </section>

    <form class="profile-card" @submit.prevent="submit">
      <div>
        <p class="profile-card__label">Local profile</p>
        <h2>Choose your name</h2>
      </div>
      <Input
        v-model="displayName"
        autocomplete="nickname"
        autofocus
        :error="displayNameError"
        label="Display name"
        :maxlength="DISPLAY_NAME_MAX_LENGTH"
        placeholder="Alice"
      />
      <Button native-type="submit" size="lg">Enter Holocomm</Button>
      <p class="privacy-note">No account, message history, or server-side profile.</p>
    </form>
  </main>
</template>

<style scoped>
.onboarding {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(20rem, 26rem);
  align-items: center;
  width: min(100% - var(--base-size-32), var(--layout-content-max));
  min-height: 100vh;
  gap: var(--base-size-48);
  margin-inline: auto;
  padding-block: var(--base-size-40);
}

.onboarding__intro {
  max-width: 42rem;
}

.eyebrow,
.profile-card__label,
.privacy-note,
.onboarding__intro > p:last-child {
  margin: 0;
}

.eyebrow,
.profile-card__label {
  color: var(--fg-color-accent);
  font-size: var(--text-body-size-medium);
  font-weight: var(--base-text-weight-semibold);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

h1 {
  margin: var(--base-size-12) 0 var(--base-size-20);
  max-width: 44rem;
  font-size: clamp(3rem, 5.5vw, 4.75rem);
  line-height: 1;
  letter-spacing: -0.055em;
  text-wrap: balance;
}

.onboarding__intro > p:last-child {
  max-width: 34rem;
  color: var(--fg-color-muted);
  font-size: var(--text-title-size-medium);
  line-height: var(--base-text-line-height-relaxed);
}

.profile-card {
  display: grid;
  gap: var(--base-size-16);
  border: var(--border-width-thin) solid var(--border-color-default);
  border-radius: var(--border-radius-large);
  padding: var(--base-size-24);
  background: var(--bg-color-muted);
  box-shadow: var(--shadow-resting-medium);
}

h2 {
  margin: var(--base-size-4) 0 0;
  font-size: var(--text-title-size-large);
}

.privacy-note {
  color: var(--fg-color-muted);
  font-size: var(--text-body-size-medium);
  text-align: center;
}

@media (max-width: 64rem) {
  .onboarding {
    grid-template-columns: 1fr;
    align-content: center;
    width: min(100% - var(--base-size-32), 36rem);
    gap: var(--base-size-24);
    padding-block: var(--base-size-32);
  }

  .onboarding__intro {
    text-align: center;
  }

  .onboarding__intro > p:last-child {
    margin-inline: auto;
  }

  h1 {
    font-size: clamp(2.75rem, 8vw, 4rem);
  }
}

@media (max-width: 32rem) {
  .onboarding {
    width: min(100% - var(--base-size-24), 36rem);
    padding-block: var(--base-size-24);
  }

  .profile-card {
    padding: var(--base-size-20);
  }
}
</style>
