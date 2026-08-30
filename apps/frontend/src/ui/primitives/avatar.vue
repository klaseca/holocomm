<script setup lang="ts">
import { AvatarFallback, AvatarImage, AvatarRoot } from 'reka-ui'
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    name: string
    size?: 'sm' | 'md' | 'lg'
    src?: string
  }>(),
  { size: 'md', src: undefined },
)

const initials = computed(() =>
  props.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join(''),
)
</script>

<template>
  <AvatarRoot class="avatar" :class="`avatar--${size}`">
    <AvatarImage v-if="src" class="avatar__image" :src="src" :alt="name" />
    <AvatarFallback class="avatar__fallback">{{ initials }}</AvatarFallback>
  </AvatarRoot>
</template>

<style scoped>
.avatar {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: var(--stroke-default) solid var(--color-border-strong);
  border-radius: var(--radius-full);
  color: var(--color-content-on-emphasis);
  background: var(--color-accent-emphasis);
  font-weight: var(--font-weight-semibold);
}

.avatar--sm {
  width: var(--size-control-sm);
  height: var(--size-control-sm);
  font-size: var(--font-size-sm);
}

.avatar--md {
  width: var(--size-control-md);
  height: var(--size-control-md);
  font-size: var(--font-size-sm);
}

.avatar--lg {
  width: var(--size-control-lg);
  height: var(--size-control-lg);
  font-size: var(--font-size-md);
}

.avatar__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar__fallback {
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
}
</style>
