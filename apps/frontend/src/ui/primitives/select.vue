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
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="m4 6 4 4 4-4" />
      </svg>
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
            <SelectItemIndicator class="app-select__indicator">✓</SelectItemIndicator>
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
  min-height: var(--size-control-md);
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  border: var(--stroke-default) solid var(--color-border-default);
  border-radius: var(--radius-md);
  padding-inline: var(--space-3);
  color: var(--color-content-primary);
  background: var(--color-surface-inset);
  font: inherit;
  cursor: pointer;
  transition:
    border-color var(--duration-fast) var(--ease-out),
    background-color var(--duration-fast) var(--ease-out);
}

.app-select__trigger[data-state='open'] {
  border-color: var(--color-border-strong);
}

.app-select__trigger:focus-visible {
  outline: var(--stroke-focus) solid var(--color-focus);
  outline-offset: var(--stroke-focus-offset);
}

.app-select__trigger svg {
  width: var(--size-icon-sm);
  height: var(--size-icon-sm);
  flex: none;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.5;
  transition: transform var(--duration-fast) var(--ease-out);
}

.app-select__trigger[data-state='open'] svg {
  transform: rotate(180deg);
}

.app-select__content {
  z-index: var(--layer-tooltip);
  width: var(--reka-select-trigger-width);
  max-height: var(--reka-select-content-available-height);
  overflow: hidden;
  border: var(--stroke-default) solid var(--color-border-strong);
  border-radius: var(--radius-md);
  padding: var(--space-1);
  color: var(--color-content-primary);
  background: var(--color-surface-elevated);
  box-shadow: 0 var(--space-2) var(--space-6) var(--color-shadow);
}

.app-select__viewport {
  display: grid;
  gap: var(--space-1);
}

.app-select__item {
  position: relative;
  display: flex;
  min-height: var(--size-control-md);
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-3);
  outline: none;
  cursor: pointer;
  user-select: none;
}

.app-select__item[data-highlighted] {
  background: color-mix(
    in srgb,
    var(--color-content-primary) 12%,
    var(--color-surface-elevated)
  );
}

.app-select__item[data-state='checked'] {
  color: var(--color-content-primary);
  background: color-mix(
    in srgb,
    var(--color-accent-emphasis) 16%,
    var(--color-surface-elevated)
  );
}

.app-select__item[data-state='checked'][data-highlighted] {
  background: color-mix(
    in srgb,
    var(--color-accent-emphasis) 28%,
    var(--color-surface-elevated)
  );
}

.app-select__item-copy {
  display: grid;
  gap: var(--space-1);
}

.app-select__item-copy strong {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

.app-select__item-copy small {
  color: var(--color-content-secondary);
  font-size: var(--font-size-xs);
}

.app-select__indicator {
  flex: none;
  color: var(--color-content-accent);
}
</style>
