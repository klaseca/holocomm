<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'

import { localUserStateContext } from '#/modules/identity/application/local-user-state.ts'
import { RoomView } from '#/modules/room/ui/room-view.vue'

const props = defineProps<{ slug: string }>()

const router = useRouter()

const userState = localUserStateContext.inject()

const displayName = computed(() => userState.profile.value?.displayName ?? '')

userState.rememberRoom(props.slug)
</script>

<template>
  <RoomView
    :initial-display-name="displayName"
    :slug="slug"
    @leave="router.push({ name: 'home' })"
  />
</template>
