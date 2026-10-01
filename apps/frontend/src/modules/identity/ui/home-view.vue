<script setup lang="ts">
import { ROOM_SLUG_MAX_LENGTH } from '@holocomm/protocol'
import { ref } from 'vue'

import { Button, Input } from '#/ui/primitives'

import {
  generateRoomSlug,
  normalizeRoomSlug,
  validateRoomSlug,
} from '../domain/guest-profile.ts'

defineProps<{
  displayName: string
}>()

const emit = defineEmits<{
  join: [room: string]
}>()

const room = ref('')

const roomError = ref<string>()

function submit(): void {
  roomError.value = validateRoomSlug(room.value)

  if (roomError.value != null) {
    return
  }

  emit('join', normalizeRoomSlug(room.value))
}

function generateRoom(): void {
  room.value = generateRoomSlug()
  roomError.value = undefined
}
</script>

<template>
  <main class="dashboard">
    <header class="dashboard__header">
      <p class="eyebrow">Your space</p>
      <h1>Welcome back, {{ displayName }}</h1>
      <p>Join an existing room or create a new one.</p>
    </header>

    <form class="join-room" @submit.prevent="submit">
      <div class="join-room__copy">
        <h2>Join or create a room</h2>
        <p>The room becomes available while at least one participant is connected.</p>
      </div>
      <div class="join-room__controls">
        <Input
          v-model="room"
          autocomplete="off"
          :error="roomError"
          label="Room name"
          :maxlength="ROOM_SLUG_MAX_LENGTH"
          placeholder="gaming-tonight"
        />
        <Button native-type="submit">Open room</Button>
      </div>
      <Button native-type="button" variant="secondary" @click="generateRoom">
        Generate random room
      </Button>
    </form>
  </main>
</template>

<style scoped>
.dashboard {
  display: flex;
  min-height: 0;
  flex-direction: column;
  width: min(100%, var(--layout-content-max));
  margin-inline: auto;
  padding: clamp(var(--base-size-16), 4vw, var(--base-size-40));
}

.dashboard__header {
  margin-bottom: var(--base-size-32);
}

.eyebrow,
.dashboard__header p,
.join-room p {
  margin: 0;
}

.eyebrow {
  color: var(--fg-color-accent);
  font-size: var(--text-body-size-medium);
  font-weight: var(--base-text-weight-semibold);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

h1 {
  margin: var(--base-size-8) 0;
  overflow-wrap: anywhere;
  font-size: var(--text-display-size);
}

h2 {
  margin: 0;
}

.dashboard__header > p:last-child,
.join-room p {
  color: var(--fg-color-muted);
}

.join-room {
  display: flex;
  min-width: 0;
  align-items: end;
  flex-wrap: wrap;
  gap: var(--base-size-16);
  border: var(--border-width-thin) solid var(--border-color-default);
  border-radius: var(--border-radius-large);
  padding: var(--base-size-24);
  background: var(--bg-color-muted);
}

.join-room__copy {
  min-width: min(100%, 14rem);
  flex: 1 1 14rem;
  align-self: center;
}

.join-room__copy p {
  margin-top: var(--base-size-4);
  font-size: var(--text-body-size-medium);
}

.join-room__controls {
  display: flex;
  min-width: min(100%, 18rem);
  flex: 2 1 22rem;
  align-items: end;
  flex-wrap: wrap;
  gap: var(--base-size-8);
}

.join-room__controls > :first-child {
  min-width: 0;
  flex: 1 1 14rem;
}

.join-room__controls > :last-child {
  flex: 1 0 auto;
}

.join-room > :last-child {
  flex: 0 1 auto;
}

@container page (inline-size < 44rem) {
  .dashboard__header {
    margin-bottom: var(--base-size-20);
  }

  h1 {
    font-size: clamp(1.75rem, 8vw, 2.25rem);
    line-height: 1.1;
  }

  .join-room {
    display: grid;
    gap: var(--base-size-12);
    padding: var(--base-size-16);
  }

  .join-room__copy,
  .join-room__controls {
    min-width: 0;
  }

  .join-room__controls {
    display: grid;
  }

  .join-room > :last-child {
    width: 100%;
  }
}
</style>
