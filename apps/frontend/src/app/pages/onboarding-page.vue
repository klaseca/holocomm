<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'

import { localUserStateContext } from '#/modules/identity/application/local-user-state.ts'
import { OnboardingView } from '#/modules/identity/ui/onboarding-view.vue'

const route = useRoute()

const router = useRouter()

const userState = localUserStateContext.inject()

async function complete(displayName: string): Promise<void> {
  userState.setDisplayName(displayName)

  const requestedNext = typeof route.query.next === 'string' ? route.query.next : '/'

  const next = requestedNext.startsWith('/') && !requestedNext.startsWith('//')
    ? requestedNext
    : '/'

  await router.replace(next)
}
</script>

<template>
  <OnboardingView
    :initial-display-name="userState.profile.value?.displayName"
    @complete="complete"
  />
</template>
