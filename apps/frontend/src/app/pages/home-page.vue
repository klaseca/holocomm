<script setup lang="ts">
import { useRouter } from 'vue-router'

import { localUserStateContext } from '#/modules/identity/application/local-user-state.ts'
import { HomeView } from '#/modules/identity/ui/home-view.vue'

const router = useRouter()

const userState = localUserStateContext.inject()

function joinRoom(room: string): void {
  userState.rememberRoom(room)
  void router.push({
    name: 'room',
    params: { slug: room },
  })
}
</script>

<template>
  <HomeView
    :display-name="userState.profile.value?.displayName ?? ''"
    @join="joinRoom"
  />
</template>
