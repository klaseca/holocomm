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
import AppNavigation from './app-navigation.vue'

defineProps<{
  connectedRoom?: string
  displayName: string
  rooms: readonly SavedRoom[]
}>()

const emit = defineEmits<{
  editProfile: []
  forgetRoom: [slug: string]
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
      :connected-room="connectedRoom"
      :display-name="displayName"
      :rooms="rooms"
      @edit-profile="emit('editProfile')"
      @join="joinRoom"
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
  background: var(--color-surface-canvas);
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
  border-radius: var(--radius-md);
  color: var(--color-content-on-emphasis);
  background: var(--color-accent-emphasis);
  font-weight: var(--font-weight-semibold);
}

.dashboard {
  width: min(100%, var(--layout-content-max));
  margin-inline: auto;
  padding: var(--space-10);
}

.dashboard__header {
  margin-bottom: var(--space-8);
}

.eyebrow,
.dashboard__header p,
.join-room p,
.room-card p,
.saved-rooms__empty p {
  margin: 0;
}

.eyebrow {
  color: var(--color-content-accent);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

h1 {
  margin: var(--space-2) 0;
  font-size: var(--font-size-2xl);
}

h2,
h3 {
  margin: 0;
}

.dashboard__header > p:last-child,
.join-room p,
.room-card p,
.saved-rooms__empty p {
  color: var(--color-content-secondary);
}

.join-room {
  display: grid;
  grid-template-columns: minmax(14rem, 1fr) minmax(18rem, 1.4fr) auto;
  align-items: end;
  gap: var(--space-4);
  border: var(--stroke-default) solid var(--color-border-default);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  background: var(--color-surface-panel);
}

.join-room__copy {
  align-self: center;
}

.join-room__copy p {
  margin-top: var(--space-1);
  font-size: var(--font-size-sm);
}

.join-room__controls {
  align-items: end;
  gap: var(--space-2);
}

.join-room__controls > :first-child {
  min-width: 0;
  flex: 1;
}

.saved-rooms {
  margin-top: var(--space-8);
}

.saved-rooms__header {
  justify-content: space-between;
  margin-bottom: var(--space-4);
}

.saved-rooms__header > span {
  color: var(--color-content-secondary);
}

.room-grid {
  display: grid;
  gap: var(--space-3);
}

.room-card {
  justify-content: space-between;
  gap: var(--space-4);
  border: var(--stroke-default) solid var(--color-border-default);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface-panel);
}

.room-card__details {
  min-width: 0;
  gap: var(--space-3);
}

.room-card__details > div {
  min-width: 0;
}

.room-card__icon {
  width: var(--size-control-md);
  height: var(--size-control-md);
  flex: none;
}

.room-card h3 {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--font-size-md);
}

.room-card p {
  margin-top: var(--space-1);
  font-size: var(--font-size-sm);
}

.room-card__actions {
  flex: none;
  gap: var(--space-2);
}

.saved-rooms__empty {
  display: grid;
  place-items: center;
  gap: var(--space-2);
  border: var(--stroke-default) dashed var(--color-border-default);
  border-radius: var(--radius-lg);
  padding: var(--space-10);
  color: var(--color-content-secondary);
  text-align: center;
}

.saved-rooms__empty > span {
  font-size: var(--font-size-2xl);
}

@media (max-width: 64rem) {
  .join-room {
    grid-template-columns: 1fr;
    align-items: stretch;
  }
}

@media (max-width: 48rem) {
  .dashboard {
    padding: var(--space-6);
  }

  .join-room__controls,
  .room-card {
    align-items: stretch;
    flex-direction: column;
  }

  .join-room {
    padding: var(--space-5);
  }
}
</style>
