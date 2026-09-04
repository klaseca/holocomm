<script setup lang="ts">
import { onBeforeUnmount } from 'vue'

import { themeStateContext } from '../modules/preferences/application/theme-state.ts'
import { roomSessionContext } from '../modules/room/application/use-room-session.ts'
import { RemoteAudio } from '../modules/rtc/ui/remote-audio.vue'

const session = roomSessionContext.inject()

const theme = themeStateContext.inject()

onBeforeUnmount(() => {
  session.destroy()
  theme.destroy()
})
</script>

<template>
  <RemoteAudio
    v-for="(stream, peerId) in session.remoteAudioStreams.value"
    :key="peerId"
    :muted="session.participantAudioSettings.value[peerId]?.muted ?? false"
    :stream="stream"
    :volume="session.participantAudioSettings.value[peerId]?.volume ?? 1"
  />
  <RouterView v-slot="{ Component, route }">
    <component :is="Component" :key="route.fullPath" />
  </RouterView>
</template>
