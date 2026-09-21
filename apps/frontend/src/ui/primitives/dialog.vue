<script setup lang="ts">
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from 'reka-ui'
import { useSlots } from 'vue'

import { IconButton } from './icon-button.vue'

withDefaults(
  defineProps<{
    description?: string
    size?: 'md' | 'lg'
    title: string
  }>(),
  { description: undefined, size: 'md' },
)

const open = defineModel<boolean>({ default: false })

const slots = useSlots()
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogTrigger v-if="slots.trigger" as-child>
      <slot name="trigger" />
    </DialogTrigger>
    <DialogPortal>
      <DialogOverlay class="dialog__overlay" />
      <DialogContent
        class="dialog__content"
        :class="`dialog__content--${size}`"
      >
        <header class="dialog__header">
          <div class="dialog__heading">
            <DialogTitle class="dialog__title">{{ title }}</DialogTitle>
            <DialogDescription v-if="description" class="dialog__description">
              {{ description }}
            </DialogDescription>
          </div>
          <DialogClose as-child>
            <IconButton label="Close dialog" size="sm">
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M3 3l10 10M13 3 3 13" />
              </svg>
            </IconButton>
          </DialogClose>
        </header>
        <div class="dialog__body">
          <slot />
        </div>
        <footer v-if="slots.footer" class="dialog__footer">
          <slot name="footer" />
        </footer>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style>
.dialog__overlay {
  position: fixed;
  z-index: var(--z-index-overlay);
  inset: 0;
  background: var(--overlay-backdrop-bg-color);
}

.dialog__content {
  --dialog-content-width: var(--overlay-width-medium);

  position: fixed;
  z-index: var(--z-index-modal);
  top: 50%;
  left: 50%;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  box-sizing: border-box;
  width: min(var(--dialog-content-width), calc(100vw - var(--base-size-32)));
  max-height: calc(100dvh - var(--base-size-32));
  border: var(--border-width-thin) solid var(--border-color-default);
  border-radius: var(--border-radius-large);
  padding: var(--base-size-24);
  color: var(--fg-color-default);
  background: var(--overlay-bg-color);
  transform: translate(-50%, -50%);
}

.dialog__content--lg {
  --dialog-content-width: var(--layout-dialog-wide-max);
}

.dialog__header,
.dialog__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--base-size-16);
}

.dialog__heading {
  display: grid;
  gap: var(--base-size-4);
}

.dialog__title {
  margin: 0;
  font-size: var(--text-title-size-medium);
  font-weight: var(--base-text-weight-semibold);
}

.dialog__description {
  margin: 0;
  color: var(--fg-color-muted);
  font-size: var(--text-body-size-medium);
}

.dialog__body {
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
  margin-block: var(--base-size-16);
  padding-inline-end: var(--base-size-4);
}

.dialog__footer {
  justify-content: flex-end;
}
</style>
