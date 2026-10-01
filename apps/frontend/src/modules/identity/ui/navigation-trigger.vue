<script setup lang="ts">
import { IconButton } from '#/ui/primitives'

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
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  </IconButton>
</template>

<style scoped>
.navigation-trigger {
  min-height: var(--base-size-44);
  min-width: var(--base-size-44);
  flex: none;
}

.navigation-trigger svg {
  width: var(--base-size-16);
  height: var(--base-size-16);
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-width: 2;
}

@container application (inline-size >= 48rem) {
  .navigation-trigger {
    display: none;
  }
}
</style>
