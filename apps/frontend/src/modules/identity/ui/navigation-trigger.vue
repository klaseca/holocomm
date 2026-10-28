<script setup lang="ts">
import { Icon, IconButton } from '#/ui/primitives'

import { navigationContext } from './navigation-context.ts'

const navigation = navigationContext.inject()
</script>

<template>
  <IconButton
    class="navigation-trigger"
    label="Open menu"
    aria-haspopup="dialog"
    :aria-expanded="navigation.opened.value"
    @click="navigation.show($event.currentTarget as HTMLElement)"
  >
    <Icon name="menu" />
  </IconButton>
</template>

<style scoped>
.navigation-trigger {
  min-height: var(--base-size-44);
  min-width: var(--base-size-44);
  flex: none;
}

@container application (inline-size >= 48rem) {
  .navigation-trigger {
    display: none;
  }
}
</style>
