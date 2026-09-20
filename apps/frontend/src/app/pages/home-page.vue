<script setup lang="ts">
import { useRouter } from 'vue-router'

import { localUserStateContext } from '#/modules/identity/application/local-user-state.ts'
import { HomeView } from '#/modules/identity/ui/home-view.vue'
import { roomSessionContext } from '#/modules/room/application/use-room-session.ts'

const router = useRouter()

const userState = localUserStateContext.inject()

const roomSession = roomSessionContext.inject()

function joinRoom(room: string): void {
  userState.rememberRoom(room)
  void router.push({
    name: 'room',
    params: { slug: room },
  })
}

function openSettings(): void {
  void router.push({ name: 'settings' })
}
</script>

<template>
  <HomeView
    :connected-room="roomSession.roomSlug.value"
    :display-name="userState.profile.value?.displayName ?? ''"
    :rooms="userState.rooms.value"
    @forget-room="userState.forgetRoom"
    @join="joinRoom"
    @settings="openSettings"
  />
</template>
