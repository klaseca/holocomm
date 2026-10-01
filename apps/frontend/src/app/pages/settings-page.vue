<script setup lang="ts">
import { localUserStateContext } from '#/modules/identity/application/local-user-state.ts'
import { SettingsView } from '#/modules/preferences/ui/settings-view.vue'
import { roomSessionContext } from '#/modules/room/application/use-room-session.ts'

const userState = localUserStateContext.inject()

const roomSession = roomSessionContext.inject()

function updateDisplayName(displayName: string): void {
  userState.setDisplayName(displayName)

  if (roomSession.roomSlug.value != null) {
    roomSession.updateDisplayName(displayName)
  }
}
</script>

<template>
  <SettingsView
    :connected="roomSession.roomSlug.value != null"
    :display-name="userState.profile.value?.displayName ?? ''"
    @update-display-name="updateDisplayName"
  />
</template>
