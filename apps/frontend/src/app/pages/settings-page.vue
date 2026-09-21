<script setup lang="ts">
import { useRouter } from 'vue-router'

import { localUserStateContext } from '#/modules/identity/application/local-user-state.ts'
import { AppNavigation } from '#/modules/identity/ui/app-navigation.vue'
import { SettingsView } from '#/modules/preferences/ui/settings-view.vue'
import { roomSessionContext } from '#/modules/room/application/use-room-session.ts'

const router = useRouter()

const userState = localUserStateContext.inject()

const roomSession = roomSessionContext.inject()

function openHome(): void {
  void router.push({ name: 'home' })
}

function openRoom(slug: string): void {
  void router.push({ name: 'room', params: { slug } })
}

function updateDisplayName(displayName: string): void {
  userState.setDisplayName(displayName)

  if (roomSession.roomSlug.value != null) {
    roomSession.updateDisplayName(displayName)
  }
}
</script>

<template>
  <div class="settings-page">
    <AppNavigation
      active-page="settings"
      :connected-room="roomSession.roomSlug.value"
      :display-name="userState.profile.value?.displayName ?? ''"
      :rooms="userState.rooms.value"
      @home="openHome"
      @join="openRoom"
    />
    <SettingsView
      :connected="roomSession.roomSlug.value != null"
      :display-name="userState.profile.value?.displayName ?? ''"
      @update-display-name="updateDisplayName"
    />
  </div>
</template>

<style scoped>
.settings-page {
  display: grid;
  grid-template-columns: var(--layout-app-navigation) minmax(0, 1fr);
  height: 100vh;
  overflow: hidden;
  background: var(--bg-color-default);
}

.settings-page > :last-child {
  min-width: 0;
  overflow-y: auto;
}
</style>
