<script setup lang="ts">
import Button from './button.vue'

withDefaults(
  defineProps<{
    disabled?: boolean
    label: string
    size?: 'sm' | 'md' | 'lg'
    variant?: 'primary' | 'secondary' | 'danger'
  }>(),
  {
    disabled: false,
    size: 'md',
    variant: 'secondary',
  },
)
</script>

<template>
  <Button
    class="icon-button"
    :aria-label="label"
    :disabled="disabled"
    :size="size"
    :variant="variant"
  >
    <slot />
  </Button>
</template>

<style scoped>
.icon-button {
  aspect-ratio: 1;
  padding: 0;
}

.icon-button :deep(svg) {
  display: block;
  width: var(--size-icon-sm);
  height: var(--size-icon-sm);
  flex: none;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-width: 2;
}
</style>
