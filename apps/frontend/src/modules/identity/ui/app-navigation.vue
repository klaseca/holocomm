<script setup lang="ts">
import { themeStateContext } from '#/modules/preferences/application/theme-state.ts'
import { Avatar, Tooltip } from '#/ui/primitives'

import type { SavedRoom } from '../application/local-user-state.ts'

defineProps<{
  connectedRoom?: string
  currentRoom?: string
  displayName: string
  rooms: readonly SavedRoom[]
}>()

const emit = defineEmits<{
  editProfile: []
  home: []
  join: [slug: string]
}>()

const theme = themeStateContext.inject()

const themeLabels = {
  system: 'System theme',
  dark: 'Dark theme',
  light: 'Light theme',
} as const

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
      :class="{ 'navigation-item--active': currentRoom === undefined }"
    >
      <Tooltip text="Home" side="right">
        <button
          type="button"
          class="navigation-button navigation-button--home"
          :class="{ 'navigation-button--active': currentRoom === undefined }"
          :aria-current="currentRoom === undefined ? 'page' : undefined"
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

    <div class="app-navigation__utilities">
      <Tooltip :text="themeLabels[theme.preference.value]" side="right">
        <button
          type="button"
          class="navigation-button navigation-button--theme"
          :aria-label="`${themeLabels[theme.preference.value]}. Change theme`"
          @click="theme.cyclePreference"
        >
          <svg v-if="theme.preference.value === 'system'" viewBox="0 0 16 16" aria-hidden="true">
            <rect x="1.5" y="2" width="13" height="9" rx="1.5" />
            <path d="M5 14h6M8 11v3" />
          </svg>
          <svg v-else-if="theme.preference.value === 'dark'" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M13.5 10.2A6 6 0 0 1 5.8 2.5 6 6 0 1 0 13.5 10.2Z" />
          </svg>
          <svg v-else viewBox="0 0 16 16" aria-hidden="true">
            <circle cx="8" cy="8" r="3" />
            <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.5 1.5M11.5 11.5 13 13M13 3l-1.5 1.5M4.5 11.5 3 13" />
          </svg>
        </button>
      </Tooltip>

      <Tooltip text="Edit local profile" side="right">
        <button
          type="button"
          class="app-navigation__profile"
          aria-label="Edit local profile"
          @click="emit('editProfile')"
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
  gap: var(--space-2);
  border-right: var(--stroke-default) solid var(--color-border-default);
  padding: var(--space-3) 0;
  background: var(--color-surface-inset);
}

.navigation-button,
.app-navigation__profile {
  position: relative;
  display: grid;
  flex: none;
  place-items: center;
  width: var(--size-control-lg);
  height: var(--size-control-lg);
  border: 0;
  border-radius: calc(var(--size-control-lg) / 2);
  color: var(--color-content-secondary);
  background: var(--color-surface-panel);
  font: inherit;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
  transition:
    border-radius var(--duration-normal) var(--ease-out),
    color var(--duration-fast) var(--ease-out),
    background-color var(--duration-fast) var(--ease-out);
}

.navigation-button svg {
  width: var(--size-icon-sm);
  height: var(--size-icon-sm);
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.5;
}

.navigation-button:hover,
.navigation-button--active {
  border-radius: var(--radius-md);
  color: var(--color-content-on-emphasis);
  background: var(--color-accent-emphasis);
}

.navigation-item--active::before {
  position: absolute;
  top: 50%;
  left: 0;
  width: var(--space-1);
  height: var(--space-6);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  background: var(--color-content-primary);
  content: '';
  transform: translateY(-50%);
}

.navigation-button:focus-visible,
.app-navigation__profile:focus-visible {
  outline: var(--stroke-focus) solid var(--color-focus);
  outline-offset: var(--stroke-focus-offset);
}

.app-navigation__separator {
  width: var(--size-control-sm);
  height: var(--stroke-default);
  background: var(--color-border-default);
}

.app-navigation__rooms {
  display: flex;
  width: 100%;
  min-height: 0;
  flex-direction: column;
  gap: var(--space-2);
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
  right: var(--space-2);
  bottom: 0;
  width: var(--space-2);
  height: var(--space-2);
  border: var(--stroke-default) solid var(--color-surface-inset);
  border-radius: var(--radius-full);
  background: var(--color-presence-online);
  content: '';
}

.app-navigation__rooms::-webkit-scrollbar {
  display: none;
}

.app-navigation__profile {
  padding: 0;
  background: transparent;
}

.app-navigation__utilities {
  display: grid;
  gap: var(--space-2);
}

.app-navigation__profile:hover {
  border-radius: var(--radius-md);
}
</style>
