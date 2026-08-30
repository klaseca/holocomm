<script setup lang="ts">
import { DISPLAY_NAME_MAX_LENGTH } from '@holocomm/protocol'
import { ref } from 'vue'

import { Button, Input } from '#/ui/primitives'

import {
  normalizeDisplayName,
  validateDisplayName,
} from '../domain/guest-profile.ts'

const props = withDefaults(defineProps<{
  initialDisplayName?: string
}>(), { initialDisplayName: '' })

const emit = defineEmits<{ complete: [displayName: string] }>()

const displayName = ref(props.initialDisplayName)

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
        <h2>{{ initialDisplayName === '' ? 'Choose your name' : 'Update your name' }}</h2>
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
      <Button native-type="submit" size="lg">Continue</Button>
      <p class="privacy-note">No account, message history, or server-side profile.</p>
    </form>
  </main>
</template>

<style scoped>
.onboarding {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(20rem, 26rem);
  align-items: center;
  width: min(100% - var(--space-8), var(--layout-content-max));
  min-height: 100vh;
  gap: var(--space-12);
  margin-inline: auto;
  padding-block: var(--space-10);
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
  color: var(--color-content-accent);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

h1 {
  margin: var(--space-3) 0 var(--space-5);
  max-width: 44rem;
  font-size: clamp(3rem, 5.5vw, 4.75rem);
  line-height: 1;
  letter-spacing: -0.055em;
  text-wrap: balance;
}

.onboarding__intro > p:last-child {
  max-width: 34rem;
  color: var(--color-content-secondary);
  font-size: var(--font-size-lg);
  line-height: var(--line-height-relaxed);
}

.profile-card {
  display: grid;
  gap: var(--space-4);
  border: var(--stroke-default) solid var(--color-border-default);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  background: var(--color-surface-panel);
  box-shadow: 0 var(--space-4) var(--space-12) var(--color-shadow);
}

h2 {
  margin: var(--space-1) 0 0;
  font-size: var(--font-size-xl);
}

.privacy-note {
  color: var(--color-content-secondary);
  font-size: var(--font-size-sm);
  text-align: center;
}

@media (max-width: 64rem) {
  .onboarding {
    grid-template-columns: 1fr;
    align-content: center;
    width: min(100% - var(--space-8), 36rem);
    gap: var(--space-6);
    padding-block: var(--space-8);
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
    width: min(100% - var(--space-6), 36rem);
    padding-block: var(--space-6);
  }

  .profile-card {
    padding: var(--space-5);
  }
}
</style>
