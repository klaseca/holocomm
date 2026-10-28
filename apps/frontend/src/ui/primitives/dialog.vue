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
import { Icon } from './icon.vue'

withDefaults(
  defineProps<{
    contentClass?: string
    description: string
    size?: 'md' | 'lg' | 'sheet'
    title: string
  }>(),
  { contentClass: undefined, size: 'md' },
)

const emit = defineEmits<{
  closeAutoFocus: [event: Event]
}>()

const open = defineModel<boolean>({ default: false })

let opener: HTMLElement | undefined

function rememberOpener(): void {
  opener = document.activeElement instanceof HTMLElement ? document.activeElement : undefined
}

function restoreFocus(event: Event): void {
  emit('closeAutoFocus', event)

  if (!event.defaultPrevented && opener?.isConnected) {
    event.preventDefault()
    opener.focus({ preventScroll: true })
  }
}

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
        :class="[`dialog__content--${size}`, contentClass]"
        @open-auto-focus="rememberOpener"
        @close-auto-focus="restoreFocus"
      >
        <header class="dialog__header">
          <div class="dialog__heading">
            <DialogTitle class="dialog__title">{{ title }}</DialogTitle>
            <DialogDescription class="dialog__description">
              {{ description }}
            </DialogDescription>
          </div>
          <DialogClose as-child>
            <IconButton label="Close dialog" size="sm">
              <Icon name="x" />
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
  width: min(var(--dialog-content-width), calc(100vw - var(--base-size-16)));
  max-height: calc(100dvh - var(--base-size-16));
  border: var(--border-width-thin) solid var(--border-color-default);
  border-radius: var(--border-radius-large);
  padding: clamp(var(--base-size-16), 4vw, var(--base-size-24));
  color: var(--fg-color-default);
  background: var(--overlay-bg-color);
  transform: translate(-50%, -50%);
}

.dialog__content--lg {
  --dialog-content-width: var(--layout-dialog-wide-max);
}

@media (max-width: 40rem) {
  .dialog__header .icon-button {
    min-width: var(--base-size-44);
    min-height: var(--base-size-44);
  }

  .dialog__content--sheet {
    top: auto;
    bottom: 0;
    left: 0;
    width: 100%;
    max-height: min(85dvh, 42rem);
    border-radius: var(--border-radius-large) var(--border-radius-large) 0 0;
    padding-bottom: max(var(--base-size-16), env(safe-area-inset-bottom));
    transform: none;
  }
}

.dialog__header,
.dialog__footer {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: var(--base-size-16);
}

.dialog__header {
  align-items: flex-start;
  flex-wrap: nowrap;
}

.dialog__header .icon-button {
  flex: none;
}

.dialog__heading {
  display: grid;
  min-width: 0;
  flex: 1;
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
