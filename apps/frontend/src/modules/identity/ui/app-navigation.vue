<script setup lang="ts">
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuPortal,
  ContextMenuRoot,
  ContextMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuTrigger,
} from 'reka-ui'
import { nextTick, useTemplateRef, watch } from 'vue'

import { Avatar, IconButton, Tooltip } from '#/ui/primitives'

import type { SavedRoom } from '../application/local-user-state.ts'

const props = defineProps<{
  activePage?: 'home' | 'settings'
  callRoom?: string
  callStatus?: string
  currentRoom?: string
  displayName: string
  opened?: boolean
  portalTarget?: HTMLElement
  rooms: readonly SavedRoom[]
}>()

const emit = defineEmits<{
  forgetRoom: [slug: string]
  home: []
  join: [slug: string]
  settings: []
}>()

const roomsNavigation = useTemplateRef<HTMLElement>('roomsNavigation')

watch([() => props.currentRoom, () => props.portalTarget, () => props.opened], async () => {
  await nextTick()

  if ((roomsNavigation.value?.getClientRects().length ?? 0) === 0) {
    return
  }

  roomsNavigation.value
    ?.querySelector<HTMLElement>('[aria-current="page"]')
    ?.scrollIntoView({ block: 'nearest' })
}, { immediate: true })

function roomInitials(slug: string): string {
  const parts = slug.split('-').filter(Boolean)

  return parts.length > 1
    ? parts.slice(0, 2).map(part => part[0]).join('').toUpperCase()
    : slug.slice(0, 2).toUpperCase()
}
</script>

<template>
  <nav class="app-navigation" aria-label="Application navigation">
    <div class="navigation-item" :class="{ 'navigation-item--active': activePage === 'home' }">
      <Tooltip text="Home" side="right">
        <button
          type="button"
          class="navigation-button"
          :aria-current="activePage === 'home' ? 'page' : undefined"
          aria-label="Home"
          @click="emit('home')"
        >
          <span class="navigation-button__icon" aria-hidden="true">H</span>
          <span class="navigation-button__copy">Home</span>
        </button>
      </Tooltip>
    </div>
    <div class="app-navigation__separator" aria-hidden="true">
      <span>Saved rooms</span>
    </div>
    <div ref="roomsNavigation" class="app-navigation__rooms" role="group" aria-label="Saved rooms">
      <p v-if="rooms.length === 0" class="app-navigation__empty">
        Rooms you open will appear here.
      </p>
      <ContextMenuRoot v-for="room in rooms" :key="room.slug">
        <div
          class="navigation-item"
          :class="{
            'navigation-item--active': room.slug === currentRoom,
            'navigation-item--call': room.slug === callRoom,
            'navigation-item--call-connected': room.slug === callRoom && callStatus === 'In call',
            'navigation-item--call-error': room.slug === callRoom
              && (callStatus === 'Connection error' || callStatus === 'Disconnected'),
          }"
        >
          <ContextMenuTrigger as-child>
            <button
              type="button"
              class="navigation-button"
              :aria-current="room.slug === currentRoom ? 'page' : undefined"
              :aria-label="room.slug === callRoom ? `Open ${room.slug}, ${callStatus ?? 'current call'}` : `Open ${room.slug}`"
              aria-description="Right click or long press for room options"
              :title="room.slug === callRoom ? `${room.slug} · ${callStatus ?? 'Current call'}` : room.slug"
              @click="emit('join', room.slug)"
            >
              <span class="navigation-button__icon" aria-hidden="true">{{ roomInitials(room.slug) }}</span>
              <span class="navigation-button__copy">
                <span>{{ room.slug }}</span>
                <span v-if="room.slug === callRoom" class="navigation-button__status">
                  {{ callStatus ?? 'Current call' }}
                </span>
              </span>
            </button>
          </ContextMenuTrigger>
          <DropdownMenuRoot>
            <DropdownMenuTrigger as-child>
              <IconButton class="navigation-item__more" :label="`Options for ${room.slug}`">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke-width="0" />
                  <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke-width="0" />
                  <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke-width="0" />
                </svg>
              </IconButton>
            </DropdownMenuTrigger>
            <DropdownMenuPortal :to="portalTarget">
              <DropdownMenuContent class="room-context-menu" align="end" :collision-padding="8">
                <DropdownMenuLabel class="room-context-menu__label">{{ room.slug }}</DropdownMenuLabel>
                <DropdownMenuItem class="room-context-menu__item" @select="emit('forgetRoom', room.slug)">
                  Remove from saved rooms
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenuPortal>
          </DropdownMenuRoot>
        </div>
        <ContextMenuPortal :to="portalTarget">
          <ContextMenuContent class="room-context-menu" :collision-padding="8" prioritize-position>
            <ContextMenuLabel class="room-context-menu__label">{{ room.slug }}</ContextMenuLabel>
            <ContextMenuItem class="room-context-menu__item" @select="emit('forgetRoom', room.slug)">
              Remove from saved rooms
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenuPortal>
      </ContextMenuRoot>
    </div>
    <div class="navigation-item" :class="{ 'navigation-item--active': activePage === 'settings' }">
      <Tooltip text="User settings" side="right">
        <button
          type="button"
          class="navigation-button app-navigation__profile"
          :aria-current="activePage === 'settings' ? 'page' : undefined"
          aria-label="User settings"
          @click="emit('settings')"
        >
          <span class="navigation-button__icon"><Avatar :name="displayName" size="sm" /></span>
          <span class="navigation-button__copy">
            <span>{{ displayName }}</span>
            <span class="navigation-button__status">Settings</span>
          </span>
        </button>
      </Tooltip>
    </div>
  </nav>
</template>

<style scoped>
.app-navigation {
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr) auto;
  justify-items: center;
  width: var(--layout-app-navigation);
  height: 100%;
  min-width: 0;
  min-height: 0;
  gap: var(--base-size-8);
  border-right: var(--border-width-thin) solid var(--border-color-default);
  padding: var(--base-size-12) 0;
  background: var(--bg-color-inset);
}

.navigation-item {
  position: relative;
  display: grid;
  width: 100%;
  flex: none;
  place-items: center;
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

.navigation-button {
  display: grid;
  width: var(--control-xlarge-size);
  height: var(--control-xlarge-size);
  flex: none;
  place-items: center;
  border: var(--border-width-thin) solid var(--border-color-default);
  border-radius: calc(var(--control-xlarge-size) / 2);
  padding: 0;
  color: var(--fg-color-muted);
  background: var(--bg-color-default);
  font: inherit;
  font-size: var(--text-body-size-medium);
  font-weight: var(--base-text-weight-semibold);
  cursor: pointer;
}

.navigation-button,
.navigation-button__icon {
  transition:
    border-radius var(--motion-duration-short) var(--motion-easing-hover),
    border-color var(--motion-duration-micro) var(--motion-easing-hover),
    color var(--motion-duration-micro) var(--motion-easing-hover),
    background-color var(--motion-duration-micro) var(--motion-easing-hover);
}

.navigation-button:not(.app-navigation__profile):is(:hover, [aria-current='page']) {
  border-color: var(--bg-color-accent-emphasis);
  border-radius: var(--border-radius-default);
  color: var(--fg-color-on-emphasis);
  background: var(--bg-color-accent-emphasis);
}

.navigation-button__icon {
  position: relative;
  display: grid;
  width: 100%;
  height: 100%;
  flex: none;
  place-items: center;
}

.navigation-item--call .navigation-button__icon::after {
  position: absolute;
  right: calc(-1 * var(--base-size-4));
  bottom: 0;
  width: var(--base-size-8);
  height: var(--base-size-8);
  border: var(--border-width-thin) solid var(--bg-color-inset);
  border-radius: var(--border-radius-full);
  background: var(--fg-color-attention);
  content: '';
}

.navigation-item--call-connected .navigation-button__icon::after {
  background: var(--fg-color-success);
}

.navigation-item--call-error .navigation-button__icon::after {
  background: var(--fg-color-danger);
}

.app-navigation__separator {
  width: var(--control-medium-size);
  height: var(--border-width-thin);
  background: var(--border-color-default);
}

.app-navigation__rooms {
  display: flex;
  width: 100%;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  gap: var(--base-size-8);
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: none;
}

.app-navigation__profile:hover {
  border-color: var(--border-color-emphasis);
  background: var(--button-default-bg-color-hover);
}

.app-navigation__profile[aria-current='page'] {
  border-color: var(--border-color-accent-emphasis);
  border-radius: var(--border-radius-default);
  background: var(--button-default-bg-color-active);
}

.navigation-button__copy,
.app-navigation__separator > span,
.app-navigation__empty,
.app-navigation .navigation-item__more {
  display: none;
}

.navigation-button__copy {
  min-width: 0;
  gap: var(--base-size-4);
  overflow-wrap: anywhere;
}

.navigation-button__status {
  color: var(--fg-color-muted);
  font-size: var(--text-body-size-small);
  font-weight: var(--base-text-weight-normal);
}

.navigation-item__more {
  width: var(--base-size-44);
  height: var(--base-size-44);
  flex: none;
  border: 0;
  background: transparent;
}

.app-navigation__empty {
  margin: 0;
  color: var(--fg-color-muted);
  font-size: var(--text-body-size-medium);
}

@media (width < 48rem) {
  .app-navigation {
    width: 100%;
    justify-items: stretch;
    border: 0;
    padding: 0;
    background: var(--overlay-bg-color);
  }

  .app-navigation .navigation-item {
    display: flex;
    min-width: 0;
    gap: var(--base-size-8);
    border-radius: var(--border-radius-medium);
  }

  .app-navigation .navigation-item--active::before {
    display: none;
  }

  .app-navigation .navigation-item:is(:hover, .navigation-item--active) {
    background: var(--control-bg-color-hover);
  }

  .app-navigation .navigation-item--active {
    background: var(--control-bg-color-active);
  }

  .app-navigation .navigation-button {
    display: flex;
    width: 100%;
    height: auto;
    min-width: 0;
    min-height: var(--control-xlarge-size);
    flex: 1;
    gap: var(--base-size-12);
    border: 0;
    border-radius: var(--border-radius-medium);
    padding: var(--base-size-4);
    color: var(--fg-color-default);
    background: transparent;
    font-weight: var(--base-text-weight-normal);
    text-align: left;
  }

  .app-navigation .navigation-button__icon {
    width: var(--control-xlarge-size);
    height: var(--control-xlarge-size);
    border: var(--border-width-thin) solid var(--border-color-default);
    border-radius: calc(var(--control-xlarge-size) / 2);
    color: var(--fg-color-muted);
    background: var(--bg-color-default);
    font-weight: var(--base-text-weight-semibold);
  }

  .app-navigation .navigation-button:not(.app-navigation__profile):is(:hover, [aria-current='page']) {
    color: var(--fg-color-default);
    background: transparent;
  }

  .app-navigation .navigation-button:not(.app-navigation__profile):is(:hover, [aria-current='page']) .navigation-button__icon {
    border-color: var(--bg-color-accent-emphasis);
    border-radius: var(--border-radius-default);
    color: var(--fg-color-on-emphasis);
    background: var(--bg-color-accent-emphasis);
  }

  .app-navigation .navigation-button[aria-current='page'] {
    font-weight: var(--base-text-weight-semibold);
  }

  .app-navigation .navigation-item--call .navigation-button__icon::after {
    right: 0;
  }

  .navigation-button__copy {
    display: grid;
  }

  .app-navigation__separator > span {
    display: inline;
  }

  .app-navigation__empty {
    display: block;
  }

  .app-navigation .navigation-item__more {
    display: inline-flex;
  }

  .app-navigation .app-navigation__separator {
    width: 100%;
    height: auto;
    border-top: var(--border-width-thin) solid var(--border-color-default);
    padding: var(--base-size-12) var(--base-size-4) var(--base-size-4);
    color: var(--fg-color-muted);
    background: transparent;
    font-size: var(--text-body-size-small);
    font-weight: var(--base-text-weight-semibold);
  }

  .app-navigation .app-navigation__rooms {
    padding: var(--base-size-4);
    scrollbar-width: thin;
  }
}
</style>

<style>
.room-context-menu {
  z-index: var(--z-index-popover);
  width: min(16rem, calc(100vw - var(--base-size-16)));
  max-height: calc(100dvh - var(--base-size-16));
  overflow-y: auto;
  border: var(--border-width-thin) solid var(--border-color-default);
  border-radius: var(--border-radius-large);
  padding: var(--base-size-4);
  color: var(--fg-color-default);
  background: var(--overlay-bg-color);
  box-shadow: var(--shadow-floating-medium);
}

.room-context-menu__label {
  overflow-wrap: anywhere;
  padding: var(--base-size-8);
  color: var(--fg-color-muted);
  font-size: var(--text-body-size-medium);
}

.room-context-menu__item {
  display: flex;
  min-height: var(--base-size-44);
  align-items: center;
  border-radius: var(--border-radius-medium);
  padding: var(--base-size-8);
  color: var(--fg-color-default);
  cursor: pointer;
  outline: none;
}

.room-context-menu__item:is(:hover, [data-highlighted]) {
  background: var(--control-bg-color-hover);
}

.room-context-menu__item:active {
  background: var(--control-bg-color-active);
}

.room-context-menu__item:focus-visible {
  outline: var(--focus-outline-width) solid var(--focus-outline-color);
  outline-offset: calc(-1 * var(--focus-outline-width));
}
</style>
