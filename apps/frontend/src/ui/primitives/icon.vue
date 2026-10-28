<script setup lang="ts">
import type { IconName } from '../icons.ts'

defineProps<{
  label?: string
  name: IconName
}>()
</script>

<template>
  <svg
    class="icon"
    viewBox="0 0 24 24"
    :aria-hidden="label ? undefined : true"
    :aria-label="label"
    :role="label ? 'img' : undefined"
    focusable="false"
  >
    <use :href="`/__spritemap#icon-${name}`" />
  </svg>
</template>

<style scoped>
.icon {
  display: block;
  width: var(--base-size-16);
  height: var(--base-size-16);
  flex: none;
}
</style>
