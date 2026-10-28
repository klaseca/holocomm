<script setup lang="ts">
import { Avatar, Icon, Tooltip } from '#/ui/primitives'

import type { ScreenShareState } from '../domain/screen-share.ts'
import type { MicrophoneState } from '../domain/voice.ts'

const props = defineProps<{
  connected: boolean
  connectionLabel: string
  displayName: string
  layout?: 'bar' | 'panel'
  microphoneState: MicrophoneState
  screenShareState: ScreenShareState
}>()

const emit = defineEmits<{
  leave: []
  openMediaSettings: []
  toggleMicrophone: []
  toggleScreenShare: []
}>()

function microphoneTooltip(): string {
  switch (props.microphoneState) {
    case 'off': return 'Enable microphone'
    case 'requesting': return 'Waiting for microphone permission'
    case 'enabled': return 'Mute microphone'
    case 'muted': return 'Unmute microphone'
    case 'denied': return 'Microphone permission was denied; click to try again'
    case 'error': return 'Microphone is unavailable; click to try again'
  }
}

function screenShareTooltip(): string {
  switch (props.screenShareState) {
    case 'off': return 'Share your screen and available system audio'
    case 'requesting': return 'Choose a screen or window'
    case 'sharing': return 'Stop sharing your screen'
    case 'denied': return 'Screen sharing was cancelled; click to try again'
    case 'error': return 'Screen sharing is unavailable; click to try again'
  }
}
</script>

<template>
  <footer class="voice-controls" :class="{ 'voice-controls--panel': layout === 'panel' }" aria-label="Current call">
    <div class="voice-controls__identity">
      <Avatar :name="displayName" size="sm" />
      <span class="voice-controls__user">
        <strong :title="displayName">{{ displayName }}</strong>
        <span :class="{ 'voice-controls__status--muted': !connected || microphoneState !== 'enabled' }" role="status">
          {{ connected ? (microphoneState === 'enabled' ? 'Voice connected' : 'Microphone off') : connectionLabel }}
        </span>
      </span>
    </div>

    <div class="voice-controls__actions">
      <Tooltip text="Media quality settings">
        <button
          type="button"
          class="control-button"
          aria-label="Media quality settings"
          @click="emit('openMediaSettings')"
        >
          <Icon name="settings" />
        </button>
      </Tooltip>
      <Tooltip :text="microphoneTooltip()">
        <button
          type="button"
          class="control-button"
          :class="{
            'control-button--muted': microphoneState !== 'enabled'
              && microphoneState !== 'requesting',
            'control-button--loading': microphoneState === 'requesting',
          }"
          :aria-label="microphoneState === 'enabled' ? 'Mute microphone' : 'Enable microphone'"
          :aria-pressed="microphoneState !== 'enabled'"
          :aria-busy="microphoneState === 'requesting'"
          :disabled="microphoneState === 'requesting'"
          @click="emit('toggleMicrophone')"
        >
          <Icon
            v-if="microphoneState === 'requesting'"
            class="control-button__spinner"
            name="loader-circle"
          />
          <Icon v-else-if="microphoneState === 'enabled'" name="mic" />
          <Icon v-else name="mic-off" />
        </button>
      </Tooltip>
      <Tooltip :text="screenShareTooltip()">
        <button
          type="button"
          class="control-button"
          :class="{
            'control-button--active': screenShareState === 'sharing',
            'control-button--loading': screenShareState === 'requesting',
          }"
          :aria-label="screenShareState === 'sharing' ? 'Stop screen sharing' : 'Share screen'"
          :aria-pressed="screenShareState === 'sharing'"
          :aria-busy="screenShareState === 'requesting'"
          :disabled="!connected || screenShareState === 'requesting'"
          @click="emit('toggleScreenShare')"
        >
          <Icon
            v-if="screenShareState === 'requesting'"
            class="control-button__spinner"
            name="loader-circle"
          />
          <Icon v-else name="monitor-up" />
        </button>
      </Tooltip>
      <Tooltip text="Leave room">
        <button
          type="button"
          class="control-button control-button--disconnect"
          aria-label="Leave room"
          @click="emit('leave')"
        >
          <Icon name="phone-off" />
        </button>
      </Tooltip>
    </div>
  </footer>
</template>

<style scoped>
.voice-controls,
.voice-controls__identity,
.voice-controls__actions,
.control-button {
  display: flex;
  align-items: center;
}

.voice-controls {
  container: voice-controls / inline-size;
  justify-content: space-between;
  gap: var(--base-size-8);
  min-height: calc(var(--control-xlarge-size) + var(--base-size-8));
  border-top: var(--border-width-thin) solid var(--border-color-default);
  padding: var(--base-size-8);
  background: var(--bg-color-muted);
}

.voice-controls__identity {
  min-width: 0;
  flex: 1;
  gap: var(--base-size-8);
  border-radius: var(--border-radius-medium);
  padding: var(--base-size-4);
  color: var(--fg-color-default);
  text-align: left;
}

.voice-controls__user {
  display: grid;
  min-width: 0;
}

.voice-controls__user strong,
.voice-controls__user span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.voice-controls__user strong {
  color: var(--fg-color-default);
  font-size: var(--text-body-size-medium);
}

.voice-controls__user span {
  color: var(--fg-color-success);
  font-size: var(--text-body-size-small);
}

.voice-controls__user .voice-controls__status--muted {
  color: var(--fg-color-muted);
}

.voice-controls__actions {
  flex: 0 0 auto;
  justify-content: flex-end;
  gap: var(--base-size-4);
}

.voice-controls--panel {
  min-height: 0;
  flex-direction: column;
  align-items: stretch;
  gap: var(--base-size-4);
  padding: var(--base-size-8);
}

.voice-controls--panel .voice-controls__actions {
  justify-content: space-between;
}

.voice-controls--panel .voice-controls__identity {
  padding: 0;
}

.voice-controls--panel .control-button {
  width: var(--base-size-44);
  height: var(--base-size-44);
}

.control-button {
  justify-content: center;
  width: var(--control-medium-size);
  height: var(--control-medium-size);
  border: var(--border-width-thin) solid transparent;
  border-radius: var(--border-radius-medium);
  color: var(--button-invisible-fg-color-rest);
  background: var(--button-invisible-bg-color-rest);
  cursor: pointer;
  transition:
    color var(--motion-duration-micro) var(--motion-easing-hover),
    background-color var(--motion-duration-micro) var(--motion-easing-hover),
    border-color var(--motion-duration-micro) var(--motion-easing-hover);
}

.control-button:hover:not(:disabled) {
  color: var(--button-invisible-fg-color-hover);
  background: var(--button-invisible-bg-color-hover);
}

.control-button--muted {
  color: var(--fg-color-danger);
  background: var(--bg-color-danger-muted);
}

.control-button--muted:hover:not(:disabled) {
  color: var(--fg-color-danger);
  background: var(--bg-color-danger-muted);
}

.control-button--active {
  color: var(--fg-color-accent);
  background: var(--bg-color-accent-muted);
}

.control-button--active:hover:not(:disabled) {
  color: var(--fg-color-accent);
  background: var(--control-bg-color-hover);
}

.control-button:disabled {
  color: var(--control-fg-color-disabled);
  background: var(--control-bg-color-disabled);
  cursor: wait;
}

.control-button__spinner {
  animation: control-spin 800ms linear infinite;
}

.control-button--disconnect {
  color: var(--fg-color-danger);
}

.control-button--disconnect:hover:not(:disabled) {
  color: var(--fg-color-danger);
  background: var(--bg-color-danger-muted);
}

@keyframes control-spin {
  to {
    transform: rotate(1turn);
  }
}

@media (prefers-reduced-motion: reduce) {
  .control-button {
    transition: none;
  }

  .control-button__spinner {
    animation-duration: 1.6s;
  }
}

@container application (inline-size < 40rem) {
  .voice-controls {
    padding-bottom: max(var(--base-size-8), env(safe-area-inset-bottom));
  }

  .control-button {
    width: var(--base-size-44);
    height: var(--base-size-44);
  }

  .control-button svg {
    width: var(--base-size-20);
    height: var(--base-size-20);
  }
}

@container voice-controls (inline-size < 34rem) {
  .voice-controls:not(.voice-controls--panel) .voice-controls__actions {
    flex: none;
  }

  .voice-controls:not(.voice-controls--panel) .control-button {
    width: var(--base-size-44);
    height: var(--base-size-44);
  }
}
</style>
