<script setup lang="ts">
import { ROOM_SLUG_MAX_LENGTH } from '@holocomm/protocol'
import { ref } from 'vue'

import { Button, Input } from '#/ui/primitives'

import type { SavedRoom } from '../application/local-user-state.ts'
import {
  generateRoomSlug,
  normalizeRoomSlug,
  validateRoomSlug,
} from '../domain/guest-profile.ts'
import { AppNavigation } from './app-navigation.vue'

defineProps<{
  connectedRoom?: string
  displayName: string
  rooms: readonly SavedRoom[]
}>()

const emit = defineEmits<{
  forgetRoom: [slug: string]
  join: [room: string]
  settings: []
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

function joinRoom(roomSlug: string): void {
  emit('join', roomSlug)
}

function formatLastJoined(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(timestamp)
}
</script>

<template>
  <main class="app-shell">
    <AppNavigation
      active-page="home"
      :connected-room="connectedRoom"
      :display-name="displayName"
      :rooms="rooms"
      @join="joinRoom"
      @settings="emit('settings')"
    />

    <section class="dashboard">
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

      <section class="saved-rooms" aria-labelledby="saved-rooms-title">
        <header class="saved-rooms__header">
          <div>
            <p class="eyebrow">Shortcuts</p>
            <h2 id="saved-rooms-title">Saved rooms</h2>
          </div>
          <span>{{ rooms.length }}</span>
        </header>

        <div v-if="rooms.length > 0" class="room-grid">
          <article v-for="savedRoom in rooms" :key="savedRoom.slug" class="room-card">
            <div class="room-card__details">
              <span class="room-card__icon">#</span>
              <div>
                <h3>{{ savedRoom.slug }}</h3>
                <p>Last opened {{ formatLastJoined(savedRoom.lastJoinedAt) }}</p>
              </div>
            </div>
            <div class="room-card__actions">
              <Button size="sm" @click="emit('join', savedRoom.slug)">Join</Button>
              <Button
                size="sm"
                variant="secondary"
                @click="emit('forgetRoom', savedRoom.slug)"
              >
                Remove
              </Button>
            </div>
          </article>
        </div>
        <div v-else class="saved-rooms__empty">
          <span>#</span>
          <h3>No saved rooms yet</h3>
          <p>Open a room above and it will be saved locally in this browser.</p>
        </div>
      </section>
    </section>
  </main>
</template>

<style scoped>
.app-shell {
  display: grid;
  grid-template-columns: var(--layout-app-navigation) minmax(0, 1fr);
  min-height: 100vh;
  background: var(--bg-color-default);
}

.saved-rooms__header,
.room-card,
.room-card__details,
.room-card__actions,
.join-room__controls {
  display: flex;
  align-items: center;
}

.room-card__icon {
  display: grid;
  place-items: center;
  border-radius: var(--border-radius-default);
  color: var(--fg-color-on-emphasis);
  background: var(--bg-color-accent-emphasis);
  font-weight: var(--base-text-weight-semibold);
}

.dashboard {
  width: min(100%, var(--layout-content-max));
  margin-inline: auto;
  padding: var(--base-size-40);
}

.dashboard__header {
  margin-bottom: var(--base-size-32);
}

.eyebrow,
.dashboard__header p,
.join-room p,
.room-card p,
.saved-rooms__empty p {
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
  font-size: var(--text-display-size);
}

h2,
h3 {
  margin: 0;
}

.dashboard__header > p:last-child,
.join-room p,
.room-card p,
.saved-rooms__empty p {
  color: var(--fg-color-muted);
}

.join-room {
  display: grid;
  grid-template-columns: minmax(14rem, 1fr) minmax(18rem, 1.4fr) auto;
  align-items: end;
  gap: var(--base-size-16);
  border: var(--border-width-thin) solid var(--border-color-default);
  border-radius: var(--border-radius-large);
  padding: var(--base-size-24);
  background: var(--bg-color-muted);
}

.join-room__copy {
  align-self: center;
}

.join-room__copy p {
  margin-top: var(--base-size-4);
  font-size: var(--text-body-size-medium);
}

.join-room__controls {
  align-items: end;
  gap: var(--base-size-8);
}

.join-room__controls > :first-child {
  min-width: 0;
  flex: 1;
}

.saved-rooms {
  margin-top: var(--base-size-32);
}

.saved-rooms__header {
  justify-content: space-between;
  margin-bottom: var(--base-size-16);
}

.saved-rooms__header > span {
  color: var(--fg-color-muted);
}

.room-grid {
  display: grid;
  gap: var(--base-size-12);
}

.room-card {
  justify-content: space-between;
  gap: var(--base-size-16);
  border: var(--border-width-thin) solid var(--border-color-default);
  border-radius: var(--border-radius-default);
  padding: var(--base-size-12) var(--base-size-16);
  background: var(--bg-color-muted);
}

.room-card__details {
  min-width: 0;
  gap: var(--base-size-12);
}

.room-card__details > div {
  min-width: 0;
}

.room-card__icon {
  width: var(--control-large-size);
  height: var(--control-large-size);
  flex: none;
}

.room-card h3 {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--text-body-size-large);
}

.room-card p {
  margin-top: var(--base-size-4);
  font-size: var(--text-body-size-medium);
}

.room-card__actions {
  flex: none;
  gap: var(--base-size-8);
}

.saved-rooms__empty {
  display: grid;
  place-items: center;
  gap: var(--base-size-8);
  border: var(--border-width-thin) dashed var(--border-color-default);
  border-radius: var(--border-radius-large);
  padding: var(--base-size-40);
  color: var(--fg-color-muted);
  text-align: center;
}

.saved-rooms__empty > span {
  font-size: var(--text-display-size);
}

@media (max-width: 64rem) {
  .join-room {
    grid-template-columns: 1fr;
    align-items: stretch;
  }
}

@media (max-width: 48rem) {
  .dashboard {
    padding: var(--base-size-24);
  }

  .join-room__controls,
  .room-card {
    align-items: stretch;
    flex-direction: column;
  }

  .join-room {
    padding: var(--base-size-20);
  }
}
</style>
