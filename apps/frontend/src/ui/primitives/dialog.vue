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
  z-index: var(--layer-overlay);
  inset: 0;
  background: var(--color-backdrop);
}

.dialog__content {
  --dialog-content-width: var(--layout-dialog-max);

  position: fixed;
  z-index: var(--layer-modal);
  top: 50%;
  left: 50%;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  box-sizing: border-box;
  width: min(var(--dialog-content-width), calc(100vw - var(--space-8)));
  max-height: calc(100dvh - var(--space-8));
  border: var(--stroke-default) solid var(--color-border-default);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  color: var(--color-content-primary);
  background: var(--color-surface-panel);
  transform: translate(-50%, -50%);
}

.dialog__content--lg {
  --dialog-content-width: var(--layout-dialog-wide-max);
}

.dialog__content:focus-visible {
  outline: none;
}

.dialog__header,
.dialog__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
}

.dialog__heading {
  display: grid;
  gap: var(--space-1);
}

.dialog__title {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
}

.dialog__description {
  margin: 0;
  color: var(--color-content-secondary);
  font-size: var(--font-size-sm);
}

.dialog__body {
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
  margin-block: var(--space-4);
  padding-inline-end: var(--space-1);
}

.dialog__footer {
  justify-content: flex-end;
}
</style>
