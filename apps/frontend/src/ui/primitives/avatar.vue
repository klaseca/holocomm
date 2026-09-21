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
  border: var(--border-width-thin) solid var(--border-color-emphasis);
  border-radius: var(--border-radius-full);
  color: var(--fg-color-on-emphasis);
  background: var(--bg-color-accent-emphasis);
  font-weight: var(--base-text-weight-semibold);
}

.avatar--sm {
  width: var(--control-medium-size);
  height: var(--control-medium-size);
  font-size: var(--text-body-size-medium);
}

.avatar--md {
  width: var(--control-large-size);
  height: var(--control-large-size);
  font-size: var(--text-body-size-medium);
}

.avatar--lg {
  width: var(--control-xlarge-size);
  height: var(--control-xlarge-size);
  font-size: var(--text-body-size-large);
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
