<script setup lang="ts">
import { computed, readonly, ref, useTemplateRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { localUserStateContext } from '#/modules/identity/application/local-user-state.ts'
import { AppNavigation } from '#/modules/identity/ui/app-navigation.vue'
import { navigationContext } from '#/modules/identity/ui/navigation-context.ts'
import { NavigationTrigger } from '#/modules/identity/ui/navigation-trigger.vue'
import { roomSessionContext } from '#/modules/room/application/use-room-session.ts'
import { callControlsContext } from '#/modules/room/ui/call-controls-context.ts'
import { MediaSettingsDialog } from '#/modules/rtc/ui/media-settings-dialog.vue'
import { VoiceControls } from '#/modules/rtc/ui/voice-controls.vue'
import { Button, IconButton } from '#/ui/primitives'
import { useMediaQuery } from '#/ui/use-media-query.ts'
import { useResponsiveDialog } from '#/ui/use-responsive-dialog.ts'

const route = useRoute()

const router = useRouter()

const userState = localUserStateContext.inject()

const session = roomSessionContext.inject()

const compact = useMediaQuery('(width < 48rem)')

const navigationOpen = ref(false)

const navigationDialog = useTemplateRef<HTMLDialogElement>('navigationDialog')

const mediaSettingsOpen = ref(false)

let navigationTrigger: HTMLElement | undefined

navigationContext.provide({
  opened: readonly(navigationOpen),
  show: (trigger) => {
    navigationTrigger = trigger
    navigationOpen.value = true
  },
})

function restoreNavigationFocus(): void {
  const trigger = navigationTrigger?.isConnected && navigationTrigger.getClientRects().length > 0
    ? navigationTrigger
    : document.querySelector<HTMLElement>(compact.value
        ? '.navigation-trigger'
        : '.app-navigation [aria-current="page"], .app-navigation button')

  if (trigger != null) {
    trigger.focus({ preventScroll: true })
  }
}

const navigationModal = useResponsiveDialog(
  navigationDialog,
  compact,
  navigationOpen,
  restoreNavigationFocus,
)

watch(compact, () => {
  navigationOpen.value = false
})

watch(() => route.fullPath, () => {
  navigationOpen.value = false
})

const currentRoom = computed(() =>
  route.name === 'room' ? String(route.params.slug) : undefined,
)

const callRoomOpen = computed(() =>
  session.roomSlug.value != null && currentRoom.value === session.roomSlug.value,
)

const dockedCall = computed(() => !compact.value && callRoomOpen.value)

callControlsContext.provide({
  compact: readonly(compact),
  docked: dockedCall,
  openMediaSettings: () => {
    mediaSettingsOpen.value = true
  },
})

const callStatus = computed(() => {
  switch (session.connectionState.value) {
    case 'connected': return 'In call'
    case 'connecting': return 'Connecting'
    case 'joining': return 'Joining room'
    case 'reconnecting': return 'Reconnecting'
    case 'error': return 'Connection error'
    case 'disconnected': return 'Disconnected'
    case 'idle': return undefined
  }
})

const activePage = computed<'home' | 'settings' | undefined>(() =>
  route.name === 'home' || route.name === 'settings' ? route.name : undefined,
)

const navigationProps = computed(() => ({
  activePage: activePage.value,
  callRoom: session.roomSlug.value,
  callStatus: callStatus.value,
  currentRoom: currentRoom.value,
  displayName: userState.profile.value?.displayName ?? '',
  rooms: userState.rooms.value,
}))

function openRoom(slug: string): void {
  navigationOpen.value = false
  void router.push({ name: 'room', params: { slug } })
}

function returnToCall(): void {
  const slug = session.roomSlug.value

  if (slug != null) {
    openRoom(slug)
  }
}

const navigationEvents = {
  forgetRoom: userState.forgetRoom,
  home: () => {
    navigationOpen.value = false
    void router.push({ name: 'home' })
  },
  join: openRoom,
  settings: () => {
    navigationOpen.value = false
    void router.push({ name: 'settings' })
  },
}

const callProps = computed(() => ({
  connected: session.connectionState.value === 'connected',
  connectionLabel: callStatus.value ?? '',
  displayName: session.self.value?.displayName ?? userState.profile.value?.displayName ?? '',
  microphoneState: session.microphoneState.value,
  screenShareState: session.screenShareState.value,
}))

const callEvents = {
  leave: session.leave,
  openMediaSettings: () => {
    mediaSettingsOpen.value = true
  },
  toggleMicrophone: session.toggleMicrophone,
  toggleScreenShare: session.toggleScreenShare,
}
</script>

<template>
  <div class="application-shell">
    <Teleport :disabled="!compact" :to="navigationDialog ?? 'body'">
      <AppNavigation
        :opened="navigationOpen"
        :portal-target="compact ? navigationDialog ?? undefined : undefined"
        v-bind="navigationProps"
        v-on="navigationEvents"
      />
    </Teleport>
    <div class="application-shell__content">
      <header v-if="compact && currentRoom == null" class="application-shell__header">
        <NavigationTrigger />
        <span>{{ route.name === 'settings' ? 'Settings' : 'Holocomm' }}</span>
        <Button
          v-if="session.roomSlug.value != null"
          class="application-shell__return-call"
          size="sm"
          variant="secondary"
          :aria-label="`${callStatus === 'In call' ? 'Return to call in' : 'Return to room'} ${session.roomSlug.value}`"
          @click="returnToCall"
        >
          {{ callStatus === 'In call' ? 'Return to call' : 'Return to room' }}
        </Button>
      </header>
      <div class="application-shell__page">
        <slot />
      </div>
    </div>
    <VoiceControls
      v-if="compact && callRoomOpen"
      class="application-shell__call"
      v-bind="callProps"
      v-on="callEvents"
    />
  </div>
  <dialog
    ref="navigationDialog"
    class="application-navigation-dialog"
    aria-labelledby="application-navigation-title"
    @cancel="navigationModal.cancel"
    @click="navigationModal.closeOnBackdrop"
  >
    <header class="application-navigation-dialog__header">
      <h2 id="application-navigation-title">Menu</h2>
      <IconButton label="Close menu" @click="navigationOpen = false">
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M3 3l10 10M13 3 3 13" />
        </svg>
      </IconButton>
    </header>
  </dialog>
  <MediaSettingsDialog v-model="mediaSettingsOpen" />
</template>

<style scoped>
.application-shell {
  display: grid;
  grid-template-columns: var(--layout-app-navigation) minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr) auto;
  height: 100dvh;
  min-width: 0;
  overflow: hidden;
  background: var(--bg-color-default);
}

.application-shell > .app-navigation {
  grid-row: 1 / -1;
}

.application-shell__content {
  display: flex;
  grid-column: 2;
  grid-row: 1;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
}

.application-shell__page {
  container: page / inline-size;
  min-width: 0;
  min-height: 0;
  flex: 1;
  overflow-y: auto;
}

.application-shell__header {
  display: flex;
  min-height: calc(var(--base-size-44) + var(--base-size-16));
  align-items: center;
  flex: none;
  gap: var(--base-size-12);
  border-bottom: var(--border-width-thin) solid var(--border-color-default);
  padding: var(--base-size-8) var(--base-size-12);
  background: var(--bg-color-muted);
  font-weight: var(--base-text-weight-semibold);
}

.application-shell__header > span {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.application-shell__return-call {
  min-width: 0;
  max-width: 45%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.application-shell__call {
  grid-column: 2;
  grid-row: 2;
  min-width: 0;
}

@media (width < 48rem) {
  .application-shell {
    grid-template-columns: minmax(0, 1fr);
  }

  .application-shell__content,
  .application-shell__call {
    grid-column: 1;
  }
}
</style>

<style>
.application-navigation-dialog {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  width: min(22rem, 100vw);
  height: 100dvh;
  max-height: 100dvh;
  margin: 0;
  border: var(--border-width-thin) solid var(--border-color-default);
  border-radius: 0;
  padding: max(var(--base-size-12), env(safe-area-inset-top)) var(--base-size-12)
    max(var(--base-size-12), env(safe-area-inset-bottom));
  color: var(--fg-color-default);
  background: var(--overlay-bg-color);
}

.application-navigation-dialog:not([open]) {
  display: none;
}

.application-navigation-dialog::backdrop {
  background: var(--overlay-backdrop-bg-color);
}

.application-navigation-dialog__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: var(--base-size-12);
}

.application-navigation-dialog__header h2 {
  margin: 0;
  font-size: var(--text-title-size-medium);
}

.application-navigation-dialog__header .icon-button {
  min-width: var(--base-size-44);
  min-height: var(--base-size-44);
}

.application-navigation-dialog > .app-navigation {
  width: 100%;
  height: 100%;
  border: 0;
  padding: 0;
  background: var(--overlay-bg-color);
}
</style>
