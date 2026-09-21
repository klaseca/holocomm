<script setup lang="ts">
import { Avatar, Tooltip } from '#/ui/primitives'

import type { SavedRoom } from '../application/local-user-state.ts'

defineProps<{
  activePage?: 'home' | 'settings'
  connectedRoom?: string
  currentRoom?: string
  displayName: string
  rooms: readonly SavedRoom[]
}>()

const emit = defineEmits<{
  home: []
  join: [slug: string]
  settings: []
}>()

function roomInitials(slug: string): string {
  const parts = slug.split('-').filter(Boolean)

  if (parts.length > 1) {
    return parts.slice(0, 2).map(part => part[0]).join('').toUpperCase()
  }

  return slug.slice(0, 2).toUpperCase()
}
</script>

<template>
  <aside class="app-navigation" aria-label="Application navigation">
    <div
      class="navigation-item"
      :class="{ 'navigation-item--active': activePage === 'home' }"
    >
      <Tooltip text="Home" side="right">
        <button
          type="button"
          class="navigation-button navigation-button--home"
          :class="{ 'navigation-button--active': activePage === 'home' }"
          :aria-current="activePage === 'home' ? 'page' : undefined"
          aria-label="Home"
          @click="emit('home')"
        >
          H
        </button>
      </Tooltip>
    </div>

    <div class="app-navigation__separator" aria-hidden="true"></div>

    <nav class="app-navigation__rooms" aria-label="Saved rooms">
      <div
        v-for="room in rooms"
        :key="room.slug"
        class="navigation-item"
        :class="{
          'navigation-item--active': room.slug === currentRoom,
          'navigation-item--connected': room.slug === connectedRoom,
        }"
      >
        <Tooltip :text="room.slug" side="right">
          <button
            type="button"
            class="navigation-button"
            :class="{ 'navigation-button--active': room.slug === currentRoom }"
            :aria-current="room.slug === currentRoom ? 'page' : undefined"
            :aria-label="`Open ${room.slug}`"
            @click="emit('join', room.slug)"
          >
            {{ roomInitials(room.slug) }}
          </button>
        </Tooltip>
      </div>
    </nav>

    <div
      class="navigation-item app-navigation__settings"
      :class="{ 'navigation-item--active': activePage === 'settings' }"
    >
      <Tooltip text="User settings" side="right">
        <button
          type="button"
          class="app-navigation__profile"
          :class="{ 'app-navigation__profile--active': activePage === 'settings' }"
          :aria-current="activePage === 'settings' ? 'page' : undefined"
          aria-label="User settings"
          @click="emit('settings')"
        >
          <Avatar :name="displayName" size="sm" />
        </button>
      </Tooltip>
    </div>
  </aside>
</template>

<style scoped>
.app-navigation {
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr) auto;
  justify-items: center;
  width: var(--layout-app-navigation);
  height: 100vh;
  gap: var(--base-size-8);
  border-right: var(--border-width-thin) solid var(--border-color-default);
  padding: var(--base-size-12) 0;
  background: var(--bg-color-inset);
}

.navigation-button,
.app-navigation__profile {
  position: relative;
  display: grid;
  flex: none;
  place-items: center;
  width: var(--control-xlarge-size);
  height: var(--control-xlarge-size);
  border: var(--border-width-thin) solid var(--border-color-default);
  border-radius: calc(var(--control-xlarge-size) / 2);
  color: var(--fg-color-muted);
  background: var(--bg-color-default);
  font: inherit;
  font-size: var(--text-body-size-medium);
  font-weight: var(--base-text-weight-semibold);
  cursor: pointer;
  transition:
    border-radius var(--motion-duration-short) var(--motion-easing-hover),
    color var(--motion-duration-micro) var(--motion-easing-hover),
    background-color var(--motion-duration-micro) var(--motion-easing-hover);
}

.navigation-button svg {
  width: var(--base-size-16);
  height: var(--base-size-16);
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.5;
}

.navigation-button:hover,
.navigation-button--active {
  border-color: var(--bg-color-accent-emphasis);
  border-radius: var(--border-radius-default);
  color: var(--fg-color-on-emphasis);
  background: var(--bg-color-accent-emphasis);
}

.navigation-item--active::before {
  position: absolute;
  top: 50%;
  left: 0;
  width: var(--base-size-4);
  height: var(--base-size-24);
  border-radius: 0 var(--border-radius-medium) var(--border-radius-medium) 0;
  background: var(--fg-color-default);
  content: '';
  transform: translateY(-50%);
}

.app-navigation__separator {
  width: var(--control-medium-size);
  height: var(--border-width-thin);
  background: var(--border-color-default);
}

.app-navigation__rooms {
  display: flex;
  width: 100%;
  min-height: 0;
  flex-direction: column;
  gap: var(--base-size-8);
  overflow-x: hidden;
  overflow-y: auto;
  scrollbar-width: none;
}

.navigation-item {
  position: relative;
  display: grid;
  width: 100%;
  flex: none;
  place-items: center;
}

.navigation-item--connected::after {
  position: absolute;
  right: var(--base-size-8);
  bottom: 0;
  width: var(--base-size-8);
  height: var(--base-size-8);
  border: var(--border-width-thin) solid var(--bg-color-inset);
  border-radius: var(--border-radius-full);
  background: var(--fg-color-success);
  content: '';
}

.app-navigation__rooms::-webkit-scrollbar {
  display: none;
}

.app-navigation__profile {
  padding: 0;
}

.app-navigation__profile:hover {
  border-color: var(--border-color-emphasis);
  background: var(--button-default-bg-color-hover);
}

.app-navigation__profile--active {
  border-color: var(--border-color-accent-emphasis);
  border-radius: var(--border-radius-default);
  background: var(--button-default-bg-color-active);
}
</style>
