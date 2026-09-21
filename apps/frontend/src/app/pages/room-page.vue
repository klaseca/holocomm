<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'

import { localUserStateContext } from '#/modules/identity/application/local-user-state.ts'
import { AppNavigation } from '#/modules/identity/ui/app-navigation.vue'
import { roomSessionContext } from '#/modules/room/application/use-room-session.ts'
import { RoomView } from '#/modules/room/ui/room-view.vue'

const props = defineProps<{ slug: string }>()

const router = useRouter()

const userState = localUserStateContext.inject()

const roomSession = roomSessionContext.inject()

const displayName = computed(() => userState.profile.value?.displayName ?? '')

userState.rememberRoom(props.slug)

function leaveRoom(): void {
  void router.push({ name: 'home' })
}

function joinRoom(slug: string): void {
  if (slug === props.slug) {
    return
  }

  void router.push({ name: 'room', params: { slug } })
}

function openSettings(): void {
  void router.push({ name: 'settings' })
}
</script>

<template>
  <div class="room-page">
    <AppNavigation
      :connected-room="roomSession.roomSlug.value"
      :current-room="slug"
      :display-name="displayName"
      :rooms="userState.rooms.value"
      @home="leaveRoom"
      @join="joinRoom"
      @settings="openSettings"
    />
    <RoomView :initial-display-name="displayName" :slug="slug" @leave="leaveRoom" />
  </div>
</template>

<style scoped>
.room-page {
  display: grid;
  grid-template-columns: var(--layout-app-navigation) minmax(0, 1fr);
  height: 100vh;
  overflow: hidden;
  background: var(--bg-color-default);
}

.room-page > :last-child {
  min-width: 0;
}
</style>
