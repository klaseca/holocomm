<script setup lang="ts">
import {
  SelectContent,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectPortal,
  SelectRoot,
  SelectTrigger,
  SelectViewport,
} from 'reka-ui'
import { computed } from 'vue'

import { Icon } from './icon.vue'

export interface SelectOption {
  readonly value: string
  readonly label: string
  readonly description?: string
}

const props = defineProps<{
  accessibleLabel: string
  options: readonly SelectOption[]
}>()

const model = defineModel<string>({ required: true })

const selectedOption = computed(() => props.options.find(option => option.value === model.value))
</script>

<template>
  <SelectRoot v-model="model">
    <SelectTrigger class="app-select__trigger" :aria-label="accessibleLabel">
      <span>{{ selectedOption?.label }}</span>
      <Icon name="chevron-down" />
    </SelectTrigger>
    <SelectPortal>
      <SelectContent
        class="app-select__content"
        position="popper"
        :side-offset="4"
      >
        <SelectViewport class="app-select__viewport">
          <SelectItem
            v-for="option in options"
            :key="option.value"
            class="app-select__item"
            :value="option.value"
          >
            <SelectItemText>
              <span class="app-select__item-copy">
                <strong>{{ option.label }}</strong>
                <small v-if="option.description">{{ option.description }}</small>
              </span>
            </SelectItemText>
            <SelectItemIndicator class="app-select__indicator">
              <Icon name="check" />
            </SelectItemIndicator>
          </SelectItem>
        </SelectViewport>
      </SelectContent>
    </SelectPortal>
  </SelectRoot>
</template>

<style>
.app-select__trigger {
  display: flex;
  width: 100%;
  min-height: var(--control-large-size);
  align-items: center;
  justify-content: space-between;
  gap: var(--base-size-12);
  border: var(--border-width-thin) solid var(--border-color-default);
  border-radius: var(--border-radius-default);
  padding-inline: var(--base-size-12);
  color: var(--fg-color-default);
  background: var(--bg-color-default);
  font: inherit;
  cursor: pointer;
  transition:
    border-color var(--motion-duration-micro) var(--motion-easing-hover),
    background-color var(--motion-duration-micro) var(--motion-easing-hover);
}

.app-select__trigger[data-state='open'] {
  border-color: var(--border-color-emphasis);
}

.app-select__trigger svg {
  transition: transform var(--motion-duration-micro) var(--motion-easing-hover);
}

.app-select__trigger[data-state='open'] svg {
  transform: rotate(180deg);
}

.app-select__content {
  z-index: var(--z-index-popover);
  width: var(--reka-select-trigger-width);
  max-height: var(--reka-select-content-available-height);
  overflow: hidden;
  border: var(--border-width-thin) solid var(--border-color-emphasis);
  border-radius: var(--border-radius-default);
  padding: var(--base-size-4);
  color: var(--fg-color-default);
  background: var(--overlay-bg-color);
  box-shadow: var(--shadow-floating-medium);
}

.app-select__viewport {
  display: grid;
  gap: var(--base-size-4);
}

.app-select__item {
  position: relative;
  display: flex;
  min-height: var(--control-large-size);
  align-items: center;
  justify-content: space-between;
  gap: var(--base-size-12);
  border-radius: var(--border-radius-medium);
  padding: var(--base-size-8) var(--base-size-12);
  cursor: pointer;
  user-select: none;
}

.app-select__item[data-highlighted] {
  background: var(--control-transparent-bg-color-hover);
}

.app-select__item[data-state='checked'] {
  color: var(--fg-color-default);
  background: var(--bg-color-accent-muted);
}

.app-select__item[data-state='checked'][data-highlighted] {
  background: var(--control-bg-color-hover);
}

.app-select__item-copy {
  display: grid;
  gap: var(--base-size-4);
}

.app-select__item-copy strong {
  font-size: var(--text-body-size-medium);
  font-weight: var(--base-text-weight-semibold);
}

.app-select__item-copy small {
  color: var(--fg-color-muted);
  font-size: var(--text-body-size-small);
}

.app-select__indicator {
  flex: none;
  color: var(--fg-color-accent);
}
</style>
